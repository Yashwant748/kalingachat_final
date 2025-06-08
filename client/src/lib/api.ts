import { apiRequest } from "./queryClient";
import type { Conversation, Message, InsertConversation, InsertMessage } from "@shared/schema";

export const api = {
  // Health check
  health: async (): Promise<{ status: string; ollama: boolean }> => {
    const res = await apiRequest("GET", "/api/health");
    return res.json();
  },

  // Conversations
  getConversations: async (): Promise<Conversation[]> => {
    const res = await apiRequest("GET", "/api/conversations");
    return res.json();
  },

  createConversation: async (data: InsertConversation): Promise<Conversation> => {
    const res = await apiRequest("POST", "/api/conversations", data);
    return res.json();
  },

  deleteConversation: async (id: number): Promise<void> => {
    await apiRequest("DELETE", `/api/conversations/${id}`);
  },

  // Messages
  getMessages: async (conversationId: number): Promise<Message[]> => {
    const res = await apiRequest("GET", `/api/conversations/${conversationId}/messages`);
    return res.json();
  },

  sendMessage: async (conversationId: number, content: string): Promise<{
    userMessage: Message;
    aiMessage: Message;
    error?: string;
  }> => {
    const res = await apiRequest("POST", `/api/conversations/${conversationId}/messages`, {
      content
    });
    return res.json();
  }
};
