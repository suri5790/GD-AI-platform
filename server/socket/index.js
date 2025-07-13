console.log("✅ socket/index.js loaded");

import { Server } from "socket.io";

export function setupSocket(server) {
  const io = new Server(server, {
    cors: {
      origin: "http://localhost:5173",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    console.log("🟢 Socket connected:", socket.id);

    // 🔍 Log all incoming events for debug
    socket.onAny((event, ...args) => {
      console.log(`📥 [${socket.id}] Event: '${event}' Payload:`, args[0]);
    });

    // ✅ Join Room
    socket.on("join-room", (roomId, isBot = false) => {
      socket.join(roomId);
      socket.roomId = roomId;
      socket.isBot = isBot;

      if (isBot) {
        console.log(`🤖 Bot ${socket.id} joined room ${roomId}`);
      } else {
        socket.to(roomId).emit("user-joined", socket.id);
        console.log(`👤 ${socket.id} joined room ${roomId}`);
      }
    });

    // ✅ Handle user-message (Forward to AI bot + broadcast)
    socket.on("user-message", ({ roomId, message, sender }) => {
      if (!roomId || !message || !sender) {
        console.warn("⚠️ Incomplete user-message received:", { roomId, message, sender });
        return;
      }

      console.log(`💬 Message from ${sender} in room ${roomId}: ${message}`);

      // 1️⃣ Broadcast to all clients in the room (for chat UI, etc.)
      io.to(roomId).emit("user-message", { roomId, message, sender });

      // 2️⃣ Forward to the bot in the same room
      const botSocket = [...io.sockets.sockets.values()].find(
        (s) => s.isBot && s.roomId === roomId
      );

      if (botSocket) {
        console.log(`🤖 Forwarding message to bot ${botSocket.id}`);
        botSocket.emit("msg", { text: message, sender });
      } else {
        console.warn("❌ No bot found in room", roomId);
      }
    });

    // ✅ WebRTC Signaling
    socket.on("offer", ({ to, offer }) => {
      console.log(`📡 Offer from ${socket.id} to ${to}`);
      io.to(to).emit("offer", { from: socket.id, offer });
    });

    socket.on("answer", ({ to, answer }) => {
      console.log(`📡 Answer from ${socket.id} to ${to}`);
      io.to(to).emit("answer", { from: socket.id, answer });
    });

    socket.on("ice-candidate", ({ to, candidate }) => {
      console.log(`📡 ICE candidate from ${socket.id} to ${to}`);
      io.to(to).emit("ice-candidate", { from: socket.id, candidate });
    });

    // ✅ Bot sends audio
    socket.on("bot-audio", ({ roomId, text, audio, sender }) => {
      if (!roomId || !text || !audio) {
        console.warn("⚠️ Incomplete bot-audio received:", { roomId, text, audio });
        return;
      }

      console.log(`📢 Forwarding bot audio to ${roomId}: ${text}`);
      io.to(roomId).emit("bot-audio", { text, audio, sender });
    });

    // ✅ On Disconnect
    socket.on("disconnect", () => {
      console.log("🔴 Socket disconnected:", socket.id);

      if (socket.roomId && !socket.isBot) {
        socket.to(socket.roomId).emit("user-left", socket.id);
      }
    });
  });
}
