// server/socket/aiBotManager.js

import OpenAI from "openai";
import dotenv from "dotenv";
import { getAudioFromText } from "../utils/tts.js"; // ✅ Using your working TTS method

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ⏳ Store bot state
const aiBots = {}; // roomId => [socketId1, socketId2, ...]

function setupAIBots(io, socket) {
  socket.on("join-room", async (roomId, isBot = false) => {
    if (isBot) {
      if (!aiBots[roomId]) aiBots[roomId] = [];
      aiBots[roomId].push(socket.id);
      console.log(`🤖 AI bot joined room ${roomId}`);
    }
  });

  socket.on("user-message", async ({ roomId, message, sender }) => {
    if (!aiBots[roomId]) return;

    for (const botSocketId of aiBots[roomId]) {
      const reply = await generateBotResponse(message, sender);
      const audioData = await getAudioFromText(reply);

      if (audioData) {
        io.to(roomId).emit("bot-audio", {
          text: reply,
          audio: audioData,
          sender: "AI Bot",
        });
      } else {
        console.warn("🛑 No audio generated for bot reply");
      }
    }
  });

  socket.on("disconnect", () => {
    for (const roomId in aiBots) {
      aiBots[roomId] = aiBots[roomId].filter((id) => id !== socket.id);
    }
  });
}

async function generateBotResponse(userMsg, sender) {
  try {
    const res = await openai.chat.completions.create({
      messages: [
        {
          role: "system",
          content:
            "You are an AI participant in a group discussion. Respond concisely and clearly in spoken English.",
        },
        {
          role: "user",
          content: `${sender}: ${userMsg}`,
        },
      ],
      model: "gpt-3.5-turbo",
    });

    return res.choices[0].message.content.trim();
  } catch (err) {
    console.error("🤖 Bot response error:", err.message);
    return "I'm having trouble responding right now.";
  }
}

export default setupAIBots;
