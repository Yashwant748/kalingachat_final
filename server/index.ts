import dotenv from "dotenv";
dotenv.config();

import express from "express";
import session from "express-session";
import passport from "passport";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";
import memorystore from "memorystore";

import routes from "./routes";

// --- Fix __dirname for ES modules ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);

// --- Middleware ---
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

const MemoryStore = memorystore(session);

app.use(
  session({
    store: new MemoryStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    }),
    secret: process.env.SESSION_SECRET || "your-secret",
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 30 * 24 * 60 * 60 * 1000 },
  })
);

app.use(passport.initialize());
app.use(passport.session());

// --- API Routes ---
app.use("/api", routes);

// --- FRONTEND SERVE DISABLED IN DEVELOPMENT ---
/*
   During development, frontend runs on Vite (http://localhost:5173)
   So we disable dist serving to avoid ENOENT errors.
*/

// --- Start Server ---
const port = 5000;
server.listen(port, () => {
  console.log(`Backend running fine on port ${port}`);
});