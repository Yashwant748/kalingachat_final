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

// Auth middleware
const requireAuth = (req: any, res: any, next: any) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Authentication required" });
  }
  next();
};

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

  // Auth routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const validatedData = insertUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(validatedData.email);
      if (existingUser) {
        return res.status(400).json({ error: "User already exists with this email" });
      }

      const user = await storage.createUser(validatedData);
      (req as any).session.userId = user.id;
      
      res.json({ 
        user: { id: user.id, email: user.email, name: user.name }, 
        message: "Registration successful" 
      });
    } catch (error) {
      console.error("Error registering user:", error);
      res.status(400).json({ error: "Failed to register user" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const validatedData = loginUserSchema.parse(req.body);
      
      const user = await storage.getUserByEmail(validatedData.email);
      if (!user) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      const isValidPassword = await storage.verifyPassword(validatedData.password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      (req as any).session.userId = user.id;
      
      res.json({ 
        user: { id: user.id, email: user.email, name: user.name }, 
        message: "Login successful" 
      });
    } catch (error) {
      console.error("Error logging in user:", error);
      res.status(400).json({ error: "Failed to login" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    (req as any).session.destroy((err: any) => {
      if (err) {
        return res.status(500).json({ error: "Failed to logout" });
      }
      res.json({ message: "Logout successful" });
    });
  });

  app.get("/api/auth/me", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).session.userId;
      const user = await storage.getUserByEmail(""); // We'll need to update this
      res.json({ user: { id: userId } });
    } catch (error) {
      res.status(401).json({ error: "Not authenticated" });
    }
  });

  // Get all conversations for authenticated user
  app.get("/api/conversations", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).session.userId;
      const conversations = await storage.getConversations(userId);
      res.json(conversations);
    } catch (error) {
      console.error("Error getting conversations:", error);
      res.status(500).json({ error: "Failed to get conversations" });
    }
  });

  // Create new conversation for authenticated user
  app.post("/api/conversations", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).session.userId;
      const validatedData = insertConversationSchema.parse(req.body);
      const conversation = await storage.createConversation({ ...validatedData, userId });
      res.json(conversation);
    } catch (error) {
      console.error("Error creating conversation:", error);
      res.status(400).json({ error: "Failed to create conversation" });
    }
  });

  // Delete conversation for authenticated user
  app.delete("/api/conversations/:id", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).session.userId;
      const id = parseInt(req.params.id);
      await storage.deleteConversation(id, userId);
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

// Kalinga University-specific response system
function getKalingaUniversityResponse(userMessage: string): string {
  const message = userMessage.toLowerCase();
  
  // University information
  if (message.includes('kalinga university') || message.includes('kalinga') || message.includes('university')) {
    return `Hello! I'm KalingaAI, your dedicated AI assistant for Kalinga University, Raipur. 

Kalinga University is a prestigious private university established in 2006, known for:
- Excellence in Engineering, Management, and Technology education
- State-of-the-art campus facilities in Raipur, Chhattisgarh
- Industry-aligned curriculum and research programs
- Strong placement records with top companies

How can I help you with your academic or university-related queries today?`;
  }

  // Academic queries
  if (message.includes('course') || message.includes('program') || message.includes('admission')) {
    return `Kalinga University offers diverse programs including:

🎓 **Engineering**: CSE, ECE, Mechanical, Civil, Electrical
🎓 **Management**: MBA, BBA with various specializations  
🎓 **Technology**: B.Tech, M.Tech, PhD programs
🎓 **Other Programs**: Arts, Science, Commerce, Law, Pharmacy

For admissions and detailed course information, I recommend contacting the admissions office. Would you like specific information about any particular program?`;
  }

  // Campus and facilities
  if (message.includes('campus') || message.includes('facilities') || message.includes('hostel')) {
    return `Kalinga University campus features:

🏢 **Modern Infrastructure**: Well-equipped classrooms, laboratories, and libraries
🏠 **Accommodation**: Separate hostels for boys and girls with modern amenities
🍽️ **Dining**: Multiple cafeterias and mess facilities
⚽ **Sports**: Sports complex with various indoor and outdoor facilities
🌐 **Technology**: Wi-Fi enabled campus with digital learning resources

The campus is designed to provide a holistic educational experience. Is there any specific facility you'd like to know more about?`;
  }

  // Creative and coding help
  if (message.includes('creative') || message.includes('ideas') || message.includes('brainstorm')) {
    return `Great! I'd love to help you brainstorm creative ideas. As a Kalinga University AI assistant, I can help with:

💡 **Academic Projects**: Research topics, presentation ideas, innovation projects
💡 **Technical Solutions**: Software development, engineering designs, problem-solving
💡 **Entrepreneurship**: Business ideas, startup concepts, innovation challenges
💡 **Creative Writing**: Essays, reports, technical documentation

What specific area would you like to explore? Share your project or challenge, and I'll help generate innovative ideas!`;
  }

  if (message.includes('code') || message.includes('programming') || message.includes('software')) {
    return `I'm here to help with your programming and software development needs! As your Kalinga University AI assistant, I can assist with:

💻 **Programming Languages**: Python, Java, C++, JavaScript, and more
💻 **Web Development**: HTML, CSS, React, Node.js, databases
💻 **Data Structures & Algorithms**: Problem-solving techniques
💻 **Software Engineering**: Best practices, design patterns, project architecture
💻 **Academic Projects**: Lab assignments, final year projects

What programming concept or problem would you like help with? Feel free to share your code or describe the challenge you're facing!`;
  }

  // Learning and education
  if (message.includes('learn') || message.includes('study') || message.includes('teach') || message.includes('explain')) {
    return `Excellent! Learning is at the heart of what we do at Kalinga University. I can help you with:

📚 **Academic Subjects**: Engineering, Management, Science, Technology
📚 **Study Techniques**: Effective learning strategies, exam preparation
📚 **Research Methods**: How to conduct academic research, citation styles
📚 **Skill Development**: Technical skills, soft skills, career preparation
📚 **Industry Trends**: Latest developments in technology and business

What subject or topic would you like to explore? I'm here to make learning engaging and effective for you!`;
  }

  // Analysis and data
  if (message.includes('analysis') || message.includes('data') || message.includes('research')) {
    return `I'd be happy to help with analysis and research! As a Kalinga University AI assistant, I can support:

📊 **Data Analysis**: Statistical methods, data interpretation, visualization
📊 **Research Projects**: Literature review, methodology, hypothesis testing
📊 **Academic Research**: Thesis writing, research proposal development
📊 **Business Analysis**: Market research, financial analysis, case studies
📊 **Technical Analysis**: System analysis, performance evaluation

What specific analysis or research project are you working on? Share your data or research question, and I'll guide you through the process!`;
  }

  // Default response
  return `Hello! I'm KalingaAI, your intelligent assistant created specifically for Kalinga University, Raipur. 

I'm here to help you with:
🎓 Academic support and course information
💻 Programming and technical assistance  
📚 Research and study guidance
💡 Creative problem-solving and brainstorming
📊 Data analysis and academic projects
🏫 University facilities and campus life

As a student or member of the Kalinga University community, feel free to ask me anything! What can I help you with today?

*Note: For the most comprehensive AI experience, please ensure TinyLLaMA is connected via Ollama for advanced responses.*`;
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
