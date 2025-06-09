import { z } from "zod";

// Conversation schema
export const conversationSchema = z.object({
  id: z.number(),
  title: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const insertConversationSchema = z.object({
  title: z.string(),
});

// Message schema
export const messageSchema = z.object({
  id: z.number(),
  conversationId: z.number(),
  content: z.string(),
  sender: z.enum(['user', 'ai']),
  timestamp: z.date(),
});

export const insertMessageSchema = z.object({
  conversationId: z.number(),
  content: z.string(),
  sender: z.enum(['user', 'ai']),
});

export type Conversation = z.infer<typeof conversationSchema>;
export type Message = z.infer<typeof messageSchema>;
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
