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

// --- Static Image Serving ---
app.use("/generated-images", express.static(path.join(__dirname, "..", "generated-images")));
app.use("/generated-excel", express.static(path.join(process.cwd(), "server", "generated-excel")));
app.use("/generated-files", express.static(path.join(process.cwd(), "public", "generated-files")));
app.use("/uploads", express.static(path.join(process.cwd(), "public", "uploads")));

// --- API Routes ---
app.use("/api", routes);

// --- FRONTEND SERVE DISABLED IN DEVELOPMENT ---
/*
   During development, frontend runs on Vite (http://localhost:5173)
   So we disable dist serving to avoid ENOENT errors.
*/

import os from "os";

// --- Start Server ---
const port = 5000;
server.listen(port, "0.0.0.0", () => {
  console.log(`\n🚀 Backend running fine on port ${port}`);

  // Find LAN IP for Mobile Access Display
  const nets = os.networkInterfaces();
  let lanIp = "localhost";
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        lanIp = net.address;
        break;
      }
    }
  }

  console.log(`\n📱 MOBILE ACCESS ENABLED`);
  console.log(`To open KalingaAI on your phone, connect to the exact same Wi-Fi network and open:`);
  console.log(`http://${lanIp}:5173\n`);
});