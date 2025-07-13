// server/index.js
import express from "express";
import http from "http";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";

import { setupSocket } from "./socket/index.js";

// Routes
import authRoutes from "./routes/auth.js";
import gdRoutes from "./routes/gd.js";
import sessionRoutes from "./routes/session.js";

dotenv.config();

const app = express();
const server = http.createServer(app);

// ✅ Attach socket logic
console.log("🛠️ setupSocket called");
setupSocket(server);

// ✅ Middleware
app.use(cors());
app.use(express.json());

// ✅ API Routes
app.use("/api/auth", authRoutes);
app.use("/api/gd", gdRoutes);
app.use("/api/session", sessionRoutes);

// ✅ DB + Start
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB connected");
    server.listen(5000, () => console.log("🚀 Server running on port 5000"));
  })
  .catch((err) => console.error("❌ MongoDB error:", err));
