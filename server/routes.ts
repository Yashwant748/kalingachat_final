import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertConversationSchema, insertMessageSchema } from "@shared/schema";
import { spawn } from "child_process";
import path from "path";

export async function registerRoutes(app: Express): Promise<Server> {
  // Get all conversations
  app.get("/api/conversations", async (req, res) => {
    try {
      const conversations = await storage.getConversations();
      res.json(conversations);
    } catch (error) {
      console.error("Error getting conversations:", error);
      res.status(500).json({ error: "Failed to get conversations" });
    }
  });

  // Create new conversation
  app.post("/api/conversations", async (req, res) => {
    try {
      const validatedData = insertConversationSchema.parse(req.body);
      const conversation = await storage.createConversation(validatedData);
      res.json(conversation);
    } catch (error) {
      console.error("Error creating conversation:", error);
      res.status(400).json({ error: "Failed to create conversation" });
    }
  });

  // Delete conversation
  app.delete("/api/conversations/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteConversation(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting conversation:", error);
      res.status(500).json({ error: "Failed to delete conversation" });
    }
  });

  // Get messages for a conversation
  app.get("/api/conversations/:id/messages", async (req, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      const messages = await storage.getMessages(conversationId);
      res.json(messages);
    } catch (error) {
      console.error("Error getting messages:", error);
      res.status(500).json({ error: "Failed to get messages" });
    }
  });

  // Send message and get AI response
  app.post("/api/conversations/:id/messages", async (req, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      const { content } = req.body;

      if (!content || typeof content !== 'string') {
        return res.status(400).json({ error: "Message content is required" });
      }

      // Create user message
      const userMessage = await storage.createMessage({
        conversationId,
        content,
        sender: 'user'
      });

      // Get AI response from Ollama
      try {
        const aiResponse = await getOllamaResponse(content);
        
        // Create AI message
        const aiMessage = await storage.createMessage({
          conversationId,
          content: aiResponse,
          sender: 'ai'
        });

        res.json({ userMessage, aiMessage });
      } catch (ollamaError) {
        console.error("Ollama API error:", ollamaError);
        
        // Create informative fallback AI message
        const fallbackMessage = await storage.createMessage({
          conversationId,
          content: `I'm unable to connect to the TinyLLaMA model right now. To use this chatbot with TinyLLaMA, please ensure:\n\n1. Ollama is installed and running on your system\n2. TinyLLaMA model is downloaded: \`ollama pull tinyllama\`\n3. Ollama service is running: \`ollama serve\`\n\nOnce connected, I'll be able to provide intelligent AI responses powered by TinyLLaMA!`,
          sender: 'ai'
        });

        res.json({ 
          userMessage, 
          aiMessage: fallbackMessage,
          error: "TinyLLaMA service not available - see instructions above"
        });
      }
    } catch (error) {
      console.error("Error sending message:", error);
      res.status(500).json({ error: "Failed to send message" });
    }
  });

  // Health check for Ollama connection
  app.get("/api/health", async (req, res) => {
    try {
      const response = await fetch("http://localhost:11434/api/tags");
      if (response.ok) {
        res.json({ status: "connected", ollama: true });
      } else {
        res.json({ status: "disconnected", ollama: false });
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.json({ status: "disconnected", ollama: false, error: errorMessage });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

async function getOllamaResponse(prompt: string): Promise<string> {
  try {
    const response = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "tinyllama",
        prompt: prompt,
        stream: false,
        options: {
          temperature: 0.7,
          max_tokens: 2000,
        }
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.response || "I'm sorry, I couldn't generate a response.";
  } catch (error) {
    console.error("Error calling Ollama API:", error);
    throw error;
  }
}
