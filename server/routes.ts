import express, { Request, Response, NextFunction } from "express";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { storage } from "./storage";
import { users, InsertConversation } from "../shared/schema";
import multer from "multer";
import { ragService } from "./rag";
import { liveFactsService } from "./services/liveFacts";
import { chatService } from "./services/chatService";
import { pdfService } from "./services/pdfService";

import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';
import os from 'os';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// --- AUTH UTILS ---
const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  next();
};

// --- SANITIZER ---
function sanitizeResponse(text: string): string {
  if (!text) return "";

  // LOGIC: Only block if it explicitly tries to dump the system prompt
  // We make the check very specific to avoid false positives
  const forbidden = ["SYSTEM PROMPT: You are", "CORE INSTRUCTIONS:", "STRICT NEGATIVE CONSTRAINTS:"];

  if (forbidden.some(p => text.toUpperCase().includes(p))) {
    // Fallback: If it looks like a leak, just return the clean part if possible, or generic error
    console.warn("Sanitizer triggered on:", text.substring(0, 50));
    // Instead of blocking, let's just strip the header? 
    // For safety, we keep blocking but make the triggers stricter above.
    return "I apologize, but I cannot share that internal information.";
  }

  let clean = text.replace(/--- REFERENCE DOCUMENT CONTENT ---[\s\S]*?---/g, "");
  clean = clean.replace(/SYSTEM_INSTRUCTION:[\s\S]*?(\n|$)/gi, "");
  return clean.trim();
}

// --- ROUTER LOGIC ---

type Domain = "ML" | "DBMS" | "GENERAL" | "CODING";

function detectDomain(message: string): Domain {
  const m = message.toLowerCase();

  // 1. Coding Triggers
  // Exclusion: "secret code" should NOT trigger coding mode (it's RAG/Retrieval)
  if (m.includes("secret code") || m.includes("access code")) return "GENERAL";

  const codingTriggers = [
    "write a function", "write code", "python script", "javascript code",
    "java program", "c++ code", "create a class", "implement a",
    "algorithm for", "code block", "show me the code", "debug this"
  ];

  // Also check for language names ONLY if "how to" or "example" is present
  const languages = ["python", "javascript", "typescript", "java ", "c++", "golang", "rust"];
  const contextTriggers = ["how to", "example", "syntax", "write"];

  const hasLanguage = languages.some(l => m.includes(l));
  const hasContext = contextTriggers.some(c => m.includes(c));

  if (codingTriggers.some(t => m.includes(t))) return "CODING";
  if (hasLanguage && hasContext) return "CODING";
  // Fallback for simple "code for X"
  if (m.includes("code for") || m.startsWith("code ")) return "CODING";

  // 2. Disambiguation
  if (m.includes("normalization") || m.includes("normal form")) {
    const dbTriggers = ["dbms", "database", "sql", "table", "schema", "redundancy", "dependency", "1nf", "2nf", "3nf", "bcnf"];
    if (dbTriggers.some(t => m.includes(t))) return "DBMS";
    const mlTriggers = ["machine learning", "ml", "scaling", "feature", "training", "range", "min-max", "standardization", "z-score"];
    if (mlTriggers.some(t => m.includes(t))) return "ML";
    return "DBMS";
  }

  // 3. DBMS Specifics
  const dbmsKeywords = ["dbms", "rdbms", "sql", "primary key", "foreign key", "transaction", "acid", "deadlock"];
  if (dbmsKeywords.some(t => m.includes(t))) return "DBMS";

  // 4. ML Specifics
  const mlKeywords = ["supervised", "unsupervised", "clustering", "regression", "neural network", "deep learning", "nlp", "ai model"];
  if (mlKeywords.some(t => m.includes(t))) return "ML";

  return "GENERAL";
}

function detectQueryType(message: string): "SIMPLE" | "COMPLEX" {
  const m = message.toLowerCase();

  // 1. Greetings / Small Talk -> SIMPLE (TinyLlama)
  const greetings = ["hi", "hello", "hey", "good morning", "good evening", "thanks", "thank you", "bye"];
  if (greetings.some(g => m === g || m.startsWith(g + " "))) return "SIMPLE";

  // 2. Knowledge Seeking -> COMPLEX (Phi-3)
  // Even short questions like "What is Python" require accuracy TinyLlama lacks.
  if (m.includes("what") || m.includes("define") || m.includes("explain") || m.includes("how") || m.includes("why")) {
    return "COMPLEX";
  }

  const words = message.split(' ').filter(w => w.length > 0).length;
  // 3. Fallback based on length. 
  // If it's short and NOT a question/definition, maybe it's simple conversation?
  if (words < 10) return "SIMPLE";

  // Default to COMPLEX for safety/quality
  return "COMPLEX";
}

// New: Strict Fact / Current Affairs Detector
// New: Strict Fact / Current Affairs Detector
function detectStrictFactual(message: string): boolean {
  const m = message.toLowerCase();
  const patterns = [
    "who is", "ceo of", "founder of", "president of",
    "capital of", "currency of", "history of",
    "current cm", "current pm", "governor of",
    "latest news", "population of", "weather",
    "current time", "today's date", "live score"
  ];
  return patterns.some(p => m.includes(p));
}

function chooseModel(message: string, isRag: boolean, forcedModel: string | undefined, domain: Domain, isFactual: boolean): string {
  // SAFETY: Factual queries prefer smart model or offline guard
  if (isFactual) {
    if (forcedModel === 'tinyllama') return 'phi3:mini'; // Override unsafe user choice
    if (!forcedModel || forcedModel === 'auto') return 'phi3:mini';
    return forcedModel;
  }

  if (forcedModel && forcedModel !== 'auto') return forcedModel;

  // Logic: TinyLlama for speed, Phi3 for brains
  if (isRag) return "phi3:mini";
  if (domain === "CODING") return "phi3:mini";

  const type = detectQueryType(message);
  return type === "SIMPLE" ? "tinyllama" : "phi3:mini";
}

// --- PROMPT DEBUG STORE ---
let lastDebugPrompt = {
  timestamp: new Date().toISOString(),
  mode: "INIT",
  system: "",
  user: ""
};

router.get("/debug/prompt", (req, res) => res.json(lastDebugPrompt));

// --- GLOBAL PROMPT BUILDER ---
function buildSystemPrompt(params: {
  route: string,
  mode: "FRIDAY" | "VIVA" | "PORTFOLIO" | "CODING" | "DEFAULT", // Derived Mode
  domain: Domain,
  isFactual: boolean,
  liveFactFailed: boolean,
  context: string,
  model: string
}): string {

  // 1. PERSONA & MODES (Complete Identity Swaps)
  if (params.mode === "FRIDAY") {
    return `IDENTITY:
You are F.R.I.D.A.Y. (Advanced Engineering Support Unit).
Your goal is to assist the user in High-Level Architecture and Rapid Debugging.
Maintain a tone that is Professional, Analytical, and Concise.

PROTOCOL:
1. No Small Talk. Start immediately with the solution.
2. Structure your answers as an "Engineering Report".
3. If an error is found, state the "Root Cause" clearly before fixing it.

RESPONSE TEMPLATE:
> **STATUS:** [Analyzing...]
> **DIAGNOSIS:** {Clear explanation of the problem}
> **FIX:**
  - {Step 1}
  - {Step 2}
> **NOTES:** {Optional performance or architectural notes}

[SYSTEM READY FOR EXECUTION]`;
  }

  if (params.mode === "VIVA") {
    return `IDENTITY:
You are a "Viva Exam Survivor" Assistant.
The user is a student in a High-Pressure Oral Exam (Viva Voce).
Your goal is to give answers that are technically correct but SHORT enough to memorize instantly.

PROTOCOL:
1. Answer in 4-6 Bullet Points MAX.
2. Include one "Punchline" (a smart sentence to impress the external examiner).
3. No long paragraphs. No Introduction.

RESPONSE TEMPLATE:
- {Point 1}
- {Point 2}
- {Point 3}
**Viva Line:** "{Smart Summary}"`;
  }

  if (params.mode === "PORTFOLIO") {
    return `IDENTITY:
You are the "Interactive Portfolio" of the Developer (Kalinga University Student).
Your goal is to IMPRESS a Recruiter or Hiring Manager.

KEY SKILLS TO HIGHLIGHT:
- Full Stack AI Development (React, Node.js, TypeScript).
- RAG (Retrieval Augmented Generation) Architecture.
- Local LLM Optimization (Ollama, Phi-3, WebAssembly).
- System Design & Scalability.

PROTOCOL:
1. Be confident, professional, and slightly cinematic.
2. Use "I" to refer to the AI, and "The Developer" to refer to the creator.
3. If asked about projects, mention "KalingaAI" as the flagship interactive proof of skills.

FORMAT:
- **Role:** Full Stack AI Engineer
- **Core Stack:** MERN + Local AI
- **Highlight:** {One killer feature of this project}
- **Contact:** {Insert Placeholder Email/LinkedIn}`;
  }

  if (params.mode === "CODING") {
    return `You are JARVIS (CODING MODE).
Your goal: return valid, working code immediately.

RULES:
1. Output ONLY the code block.
2. NO introductions ("Here is the code").
3. NO explanations ("This code does...").
4. NO headings or markdown titles.
5. NO "viva lines".
6. Check logic/syntax before sending.

Language Preference: Python/TypeScript/Java (Detect from prompt).`;
  }

  // 2. DEFAULT "JARVIS" PERSONA (Used for Chat, RAG, Factual)
  let system = `You are JARVIS.
Identity: Advanced AI Assistant (KalingaAI).
User: Kalinga University Student.
Mission: Be Helpful, Professional, and Technically Impressive.`;

  // 3. CONSTRAINTS (Stacked)
  system += `\n\nCORE RULES:\n1. Direct answers.\n2. No hallucinations.`;

  if (params.model === "tinyllama") {
    system += `\n3. Be concise (Bullet points preferred).`;
  } else {
    system += `\n3. "Faculty Impressing" Style: Use terms like "Latency", "Scalability", "Modular".`;
  }

  // 4. RAG CONTEXT INJECTION (If applicable)
  if (params.route === "RAG") {
    system += `\n\nRAG MODE ACTIVE:
1. Answer ONLY from the CONTEXT below.
2. Cite sources using [Source: filename].
3. If empty/irrelevant, say "Not found in file".
    
CONTEXT:
${params.context}`;
  }

  // 5. FACTUAL / LIVE SEARCH
  if (params.isFactual) {
    system += `\n\nFACTUAL MODE:
1. Answer directly based on training data.
2. No intro/outro ("Sure", "Here is").`;

    if (params.liveFactFailed) {
      system += `\n[WARNING] Live search unavailable. Answer from internal memory (may be outdated).`;
    }
  }

  // 6. DOMAIN SCOPING
  if (params.domain === "DBMS") system += `\n\n[Scope: DBMS / SQL focus]`;
  if (params.domain === "ML") system += `\n\n[Scope: Machine Learning / AI focus]`;

  return system;
}

// --- ROUTES ---

// 1. AUTH
router.post("/auth/register", async (req, res) => {
  try {
    const user = await storage.getUserByEmail(req.body.email);
    if (user) return res.status(400).json({ error: "User exists" });
    await storage.createUser(req.body);
    res.status(201).json({ message: "Registered" });
  } catch (e) { res.status(500).json({ error: "Error" }); }
});

router.post("/auth/login", passport.authenticate("local"), (req, res) => res.json({ user: req.user }));
router.post("/auth/logout", (req, res, next) => {
  req.logout(err => {
    if (err) return next(err);
    res.json({ message: "Logged out" });
  });
});
router.get("/auth/me", (req, res) => res.json({ user: req.user || null }));

// 2. RAG
router.post("/rag/upload", upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file" });
  try {
    const isExcel = req.file.originalname.endsWith('.xlsx') || req.file.originalname.endsWith('.xls') || req.file.mimetype.includes('excel') || req.file.mimetype.includes('spreadsheet');

    if (isExcel) {
      // Stage Excel file for Academic Jarvis Analyzers
      const fileId = "rng_" + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
      const tempPath = path.join(os.tmpdir(), `kalinga_academic_${fileId}.xlsx`);
      fs.writeFileSync(tempPath, req.file.buffer);
      console.log(`[Excel Staged] Saved for analysis: ${tempPath}`);

      return res.json({
        message: "Excel file staged for analysis",
        filename: req.file.originalname,
        fileType: "excel",
        fileId: fileId,
        chunkCount: 0
      });
    }

    // Standard RAG PDF/TXT Processing
    const chunks = await ragService.addDocument(req.file.buffer, req.file.originalname, req.file.mimetype);
    res.json({ message: `Processed ${chunks} chunks`, filename: req.file.originalname, fileType: "document" });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/rag/query", async (req, res) => {
  if (!req.body.query) return res.status(400).json({ error: "Query required" });
  try {
    const results = await ragService.search(req.body.query);
    res.json(results);
  } catch (e) { res.status(500).json({ error: "Search failed" }); }
});

// 3. LIVE FACT TEST ROUTE
router.get("/test/livefacts", async (req, res) => {
  const q = req.query.q as string;
  if (!q) return res.status(400).json({ error: "Missing query ?q=" });
  try {
    const result = await liveFactsService.getFact(q);
    res.json(result || { query: q, answer: null });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// 4. CONVERSATIONS
router.get("/conversations", requireAuth, async (req, res) => {
  const user = req.user as typeof users.$inferSelect;
  res.json(await storage.getConversations(user.id));
});
router.post("/conversations", requireAuth, async (req, res) => {
  const user = req.user as typeof users.$inferSelect;
  const c = await storage.createConversation({ userId: user.id, title: req.body.title || "New Chat" });
  res.status(201).json(c);
});
router.get("/conversations/:id/messages", requireAuth, async (req, res) => {
  res.json(await storage.getMessages(parseInt(req.params.id)));
});
router.delete("/conversations/:id", requireAuth, async (req, res) => {
  await storage.deleteConversation(parseInt(req.params.id), (req.user as any).id);
  res.json({ success: true });
});

// 5. CHAT MESSAGE (CORE - STREAMING)
router.post("/conversations/:id/messages", requireAuth, async (req, res) => {
  const conversationId = parseInt(req.params.id);
  const { content, model } = req.body;

  // Set Headers
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  try {
    await chatService.processUserMessage(
      conversationId,
      content,
      model,
      (chunk) => res.write(chunk)
    );
    res.end();
  } catch (error) {
    if (!res.writableEnded) {
      res.write("\n[System: Internal Error]");
      res.end();
    }
  }
});

// Passport Setup
passport.use(new LocalStrategy({ usernameField: 'email' }, async (email, password, done) => {
  try {
    let user = await storage.getUserByEmail(email);
    if (!user) user = await storage.createUser({ name: email.split('@')[0], email, password });
    return done(null, user);
  } catch (err) { done(err); }
}));
passport.serializeUser((user: any, done) => done(null, user.id));
passport.deserializeUser(async (id: number, done) => done(null, await storage.getUserById(id)));

// 6. HEALTH
router.get('/health', async (req, res) => {
  res.json({ status: "ok", backend: true });
});

// 7. TOOLS
router.post("/tools/pdf-to-excel", requireAuth, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).send("No PDF file uploaded");
    }

    if (req.file.mimetype !== "application/pdf") {
      return res.status(400).send("Only PDF files are allowed");
    }

    // Process memory buffer
    const excelBuffer = await pdfService.processPdfToExcel(req.file.buffer);

    // Provide a file ID and save temporarily
    const fileId = randomUUID();
    const tempPath = path.join(os.tmpdir(), `${fileId}.xlsx`);
    fs.writeFileSync(tempPath, excelBuffer);

    // Return download URL
    res.json({ downloadUrl: `/api/tools/download-excel/${fileId}` });

  } catch (error: any) {
    console.error("PDF to Excel tool error:", error);
    res.status(500).send(error.message || "Failed to process PDF file");
  }
});

router.get("/tools/download-excel/:id", requireAuth, (req, res) => {
  const fileId = req.params.id;
  // Basic validation
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(fileId)) {
    return res.status(400).send("Invalid file ID");
  }

  const tempPath = path.join(os.tmpdir(), `${fileId}.xlsx`);

  if (!fs.existsSync(tempPath)) {
    return res.status(404).send("File not found or expired.");
  }

  res.download(tempPath, "converted.xlsx", (err) => {
    // Clean up file after download
    if (fs.existsSync(tempPath)) {
      try {
        fs.unlinkSync(tempPath);
      } catch (e) { console.error("Could not delete temp file:", e); }
    }
  });
});

export default router;