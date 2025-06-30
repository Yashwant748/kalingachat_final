import { users, conversations, messages, type User, type Conversation, type Message, type InsertUser, type InsertConversation, type InsertMessage } from "@shared/schema";
import { db } from "./db";
import { eq, desc, and } from "drizzle-orm";
import bcrypt from "bcryptjs";

export interface IStorage {
  // Users
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserById(id: number): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  verifyPassword(password: string, hashedPassword: string): Promise<boolean>;
  
  // Conversations
  getConversations(userId: number): Promise<Conversation[]>;
  getConversation(id: number, userId: number): Promise<Conversation | undefined>;
  createConversation(conversation: InsertConversation & { userId: number }): Promise<Conversation>;
  updateConversationTitle(id: number, title: string): Promise<void>;
  deleteConversation(id: number, userId: number): Promise<void>;
  
  // Messages
  getMessages(conversationId: number): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  deleteMessages(conversationId: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserById(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async createUser(userData: InsertUser): Promise<User> {
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    const [user] = await db
      .insert(users)
      .values({
        ...userData,
        password: hashedPassword,
      })
      .returning();
    return user;
  }

  async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    return await bcrypt.compare(password, hashedPassword);
  }

  // Conversation operations
  async getConversations(userId: number): Promise<Conversation[]> {
    return await db
      .select()
      .from(conversations)
      .where(eq(conversations.userId, userId))
      .orderBy(desc(conversations.updatedAt));
  }

  async getConversation(id: number, userId: number): Promise<Conversation | undefined> {
    const [conversation] = await db
      .select()
      .from(conversations)
      .where(and(eq(conversations.id, id), eq(conversations.userId, userId)));
    return conversation;
  }

  async createConversation(conversationData: InsertConversation & { userId: number }): Promise<Conversation> {
    const [conversation] = await db
      .insert(conversations)
      .values(conversationData)
      .returning();
    return conversation;
  }

  async updateConversationTitle(id: number, title: string): Promise<void> {
    await db
      .update(conversations)
      .set({ title, updatedAt: new Date() })
      .where(eq(conversations.id, id));
  }

  async deleteConversation(id: number, userId: number): Promise<void> {
    // Delete messages first
    await this.deleteMessages(id);
    // Delete conversation
    await db
      .delete(conversations)
      .where(and(eq(conversations.id, id), eq(conversations.userId, userId)));
  }

  // Message operations
  async getMessages(conversationId: number): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.timestamp);
  }

  async createMessage(messageData: InsertMessage): Promise<Message> {
    const [message] = await db
      .insert(messages)
      .values(messageData)
      .returning();
    
    // Update conversation's updatedAt timestamp
    await db
      .update(conversations)
      .set({ updatedAt: new Date() })
      .where(eq(conversations.id, messageData.conversationId));
    
    return message;
  }

  async deleteMessages(conversationId: number): Promise<void> {
    await db
      .delete(messages)
      .where(eq(messages.conversationId, conversationId));
  }
}

// Simple in-memory storage for conversations and messages (no database required)
class MemStorage implements IStorage {
  private conversations: Map<number, Conversation> = new Map();
  private messages: Map<number, Message[]> = new Map();
  private nextConversationId = 1;
  private nextMessageId = 1;

  // User operations (simplified - no database)
  async getUserByEmail(email: string): Promise<User | undefined> {
    return undefined; // No user auth
  }

  async getUserById(id: number): Promise<User | undefined> {
    return undefined; // No user auth
  }

  async createUser(userData: InsertUser): Promise<User> {
    throw new Error("User creation not supported in simplified mode");
  }

  async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    return false; // No auth
  }

  // Conversation operations
  async getConversations(userId: number): Promise<Conversation[]> {
    return Array.from(this.conversations.values())
      .filter(conv => conv.userId === userId)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  async getConversation(id: number, userId: number): Promise<Conversation | undefined> {
    const conversation = this.conversations.get(id);
    return conversation?.userId === userId ? conversation : undefined;
  }

  async createConversation(conversationData: InsertConversation & { userId: number }): Promise<Conversation> {
    const now = new Date();
    const conversation: Conversation = {
      id: this.nextConversationId++,
      userId: conversationData.userId,
      title: conversationData.title,
      createdAt: now,
      updatedAt: now
    };
    
    this.conversations.set(conversation.id, conversation);
    this.messages.set(conversation.id, []);
    return conversation;
  }

  async updateConversationTitle(id: number, title: string): Promise<void> {
    const conversation = this.conversations.get(id);
    if (conversation) {
      conversation.title = title;
      conversation.updatedAt = new Date();
      this.conversations.set(id, conversation);
    }
  }

  async deleteConversation(id: number, userId: number): Promise<void> {
    const conversation = this.conversations.get(id);
    if (conversation?.userId === userId) {
      this.conversations.delete(id);
      this.messages.delete(id);
    }
  }

  // Message operations
  async getMessages(conversationId: number): Promise<Message[]> {
    return this.messages.get(conversationId) || [];
  }

  async createMessage(messageData: InsertMessage): Promise<Message> {
    const now = new Date();
    const message: Message = {
      id: this.nextMessageId++,
      conversationId: messageData.conversationId,
      content: messageData.content,
      sender: messageData.sender,
      timestamp: now
    };

    const conversationMessages = this.messages.get(messageData.conversationId) || [];
    conversationMessages.push(message);
    this.messages.set(messageData.conversationId, conversationMessages);

    // Update conversation timestamp
    const conversation = this.conversations.get(messageData.conversationId);
    if (conversation) {
      conversation.updatedAt = now;
      this.conversations.set(messageData.conversationId, conversation);
    }

    return message;
  }

  async deleteMessages(conversationId: number): Promise<void> {
    this.messages.set(conversationId, []);
  }
}

export const storage = new MemStorage();
