import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertConversationSchema, insertMessageSchema, insertUserSchema, loginUserSchema } from "@shared/schema";
import session from "express-session";
import connectPg from "connect-pg-simple";

// Session middleware
const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
const pgStore = connectPg(session);
const sessionStore = new pgStore({
  conString: process.env.DATABASE_URL,
  createTableIfMissing: true,
  ttl: sessionTtl,
  tableName: "user_sessions",
});

// Default user ID for conversations (no auth required)
const defaultUserId = 1;

export async function registerRoutes(app: Express): Promise<Server> {
  // Session setup
  app.use(session({
    store: sessionStore,
    secret: process.env.SESSION_SECRET || 'kalinga-ai-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false, // Set to true in production with HTTPS
      maxAge: sessionTtl,
    },
  }));

  // Simple auth (no database required)
  app.get("/api/auth/me", (req, res) => {
    // Return a default user for the chat interface
    res.json({ 
      user: { 
        id: 1, 
        email: "student@kalingauniversity.ac.in", 
        name: "Kalinga Student" 
      } 
    });
  });

  // Get all conversations
  app.get("/api/conversations", async (req, res) => {
    try {
      const conversations = await storage.getConversations(defaultUserId);
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
      const conversation = await storage.createConversation({ ...validatedData, userId: defaultUserId });
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
      await storage.deleteConversation(id, defaultUserId);
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

      // Check if this is the first message and update conversation title
      const messages = await storage.getMessages(conversationId);
      if (messages.length === 1) { // First message
        const title = generateChatTitle(content);
        await storage.updateConversationTitle(conversationId, title);
      }

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
        
        // Create Kalinga University-specific fallback AI message
        const kalingaResponse = getKalingaUniversityResponse(content);
        const fallbackMessage = await storage.createMessage({
          conversationId,
          content: kalingaResponse,
          sender: 'ai'
        });

        res.json({ 
          userMessage, 
          aiMessage: fallbackMessage,
          error: "Using Kalinga University knowledge base"
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

// Generate meaningful chat title from first message
function generateChatTitle(message: string): string {
  const cleanMessage = message.trim().toLowerCase();
  
  // Kalinga University specific patterns
  if (cleanMessage.includes('kalinga') || cleanMessage.includes('university')) {
    return 'Kalinga University Discussion';
  }
  
  if (cleanMessage.includes('course') || cleanMessage.includes('program') || cleanMessage.includes('admission')) {
    return 'Academic Programs Inquiry';
  }
  
  if (cleanMessage.includes('campus') || cleanMessage.includes('hostel') || cleanMessage.includes('facilities')) {
    return 'Campus & Facilities Information';
  }
  
  if (cleanMessage.includes('code') || cleanMessage.includes('programming') || cleanMessage.includes('software')) {
    return 'Programming Help & Support';
  }
  
  if (cleanMessage.includes('creative') || cleanMessage.includes('idea') || cleanMessage.includes('brainstorm')) {
    return 'Creative Ideas & Brainstorming';
  }
  
  if (cleanMessage.includes('research') || cleanMessage.includes('analysis') || cleanMessage.includes('data')) {
    return 'Research & Analysis Support';
  }
  
  if (cleanMessage.includes('learn') || cleanMessage.includes('study') || cleanMessage.includes('teach')) {
    return 'Learning & Study Guidance';
  }
  
  if (cleanMessage.includes('project') || cleanMessage.includes('assignment')) {
    return 'Project Assistance';
  }
  
  if (cleanMessage.includes('career') || cleanMessage.includes('job') || cleanMessage.includes('placement')) {
    return 'Career & Placement Guidance';
  }
  
  // Extract key words for general titles
  const words = cleanMessage.split(' ').filter(word => 
    word.length > 3 && 
    !['what', 'how', 'why', 'when', 'where', 'help', 'please', 'need', 'want', 'like'].includes(word)
  );
  
  if (words.length > 0) {
    const titleWords = words.slice(0, 3).map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    );
    return titleWords.join(' ') + ' Discussion';
  }
  
  // Fallback based on message length
  if (message.length > 50) {
    return 'Detailed Discussion';
  } else if (message.includes('?')) {
    return 'Quick Question';
  }
  
  return 'New Conversation';
}

// ChatGPT-style response system with Kalinga context
function getKalingaUniversityResponse(userMessage: string): string {
  const message = userMessage.toLowerCase();
  
  // University information - Natural, conversational style
  if (message.includes('kalinga') || message.includes('university')) {
    return `Kalinga University is a well-regarded private university established in 2006, located in Raipur, Chhattisgarh. The university has built a strong reputation for its comprehensive academic programs and modern infrastructure.

The university offers a wide range of undergraduate and postgraduate programs across various disciplines including Engineering, Management, Computer Science, and more. The campus features modern facilities, well-equipped laboratories, and a supportive learning environment designed to foster both academic and personal growth.

What specific aspect of Kalinga University would you like to know more about? I'm here to help with any questions you might have.`;
  }

  // Programming/Technical Help - ChatGPT style
  if (message.includes('code') || message.includes('programming') || message.includes('software') || message.includes('technical')) {
    return `I'd be happy to help you with programming and technical questions! Programming can seem challenging at first, but with the right approach and practice, it becomes much more manageable.

Whether you're working on algorithms, debugging code, learning a new language, or working on a project, I can provide guidance and explanations tailored to your specific needs.

Could you share more details about what you're working on? For example:
- What programming language are you using?
- What specific problem are you trying to solve?
- Are you getting any error messages?
- What have you tried so far?

The more context you provide, the better I can help you learn and solve the problem effectively.`;
  }

  // Creative/Ideas - Encouraging and supportive
  if (message.includes('creative') || message.includes('idea') || message.includes('brainstorm')) {
    return `I love helping with creative thinking and brainstorming! Creativity often flourishes when we approach problems from different angles and explore various possibilities.

Some effective brainstorming approaches include:
- Starting with "what if" questions
- Building on existing ideas rather than trying to create something entirely new
- Combining concepts from different fields
- Looking at problems from different perspectives
- Not judging ideas initially - just generating them

What kind of creative project or challenge are you working on? Are you looking for ideas in a specific area like writing, problem-solving, design concepts, or technical solutions?

I can help guide the brainstorming process once I understand what you're aiming for.`;
  }

  // Study/Academic Help - Natural and supportive
  if (message.includes('study') || message.includes('exam') || message.includes('learn') || message.includes('academic')) {
    return `I understand that academic success requires effective study strategies and good planning. There are several approaches that can help you study more efficiently and retain information better.

Some proven techniques include:
- Active recall: Testing yourself on material rather than just re-reading
- Spaced repetition: Reviewing material at increasing intervals
- Breaking down complex topics into smaller, manageable chunks
- Creating visual aids like mind maps or diagrams
- Teaching concepts to others or explaining them out loud

Your specific study needs might vary depending on your subject, learning style, and current challenges. What particular area are you focusing on, or what specific study challenges are you facing? I can provide more targeted advice based on your situation.`;
  }

  // General conversational responses
  if (message.includes('hello') || message.includes('hi') || message.includes('hey')) {
    return `Hello! I'm here to help you with questions, learning, problem-solving, or just having a conversation. 

Whether you need assistance with academic topics, want to discuss ideas, need help with technical problems, or are curious about something, I'm ready to help. What's on your mind today?`;
  }

  if (message.includes('how are you') || message.includes('what are you')) {
    return `I'm an AI assistant designed to be helpful, accurate, and conversational. I'm functioning well and ready to assist you with a wide range of topics and questions.

I can help with academic subjects, provide explanations, assist with problem-solving, engage in creative tasks, and have conversations on many topics. I aim to provide thoughtful responses tailored to what you're looking for.

What would you like to explore or discuss today?`;
  }

  // Default response - Helpful and engaging
  return `I'm here to help with whatever you'd like to discuss or work on. I can assist with a wide range of topics including academic subjects, creative projects, problem-solving, explanations of concepts, or just having an interesting conversation.

Some things I'm particularly good at helping with:
- Explaining complex topics in understandable ways
- Helping with writing and research
- Programming and technical questions
- Creative brainstorming and ideation
- Study strategies and learning techniques
- General questions and curiosity-driven conversations

What would you like to explore or get help with today? Feel free to ask about anything that interests you or any challenge you're facing.`;
}

async function getOllamaResponse(prompt: string): Promise<string> {
  try {
    // Add Kalinga University context to the prompt
    const contextualPrompt = `You are KalingaAI, an AI assistant for Kalinga University, Raipur. Respond helpfully and knowledgeably about university life, academics, and general topics. Keep responses concise and student-friendly.

User query: ${prompt}

Response:`;

    const response = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "tinyllama",
        prompt: contextualPrompt,
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
