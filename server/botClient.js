// server/botClient.js
import { io } from "socket.io-client";
import dotenv from "dotenv";
import { getAudioFromText } from "./utils/tts.js";
import fetch from "node-fetch";

dotenv.config();

const roomId = process.argv[2]; // Get Room ID from CLI arg
if (!roomId) {
  console.error("❌ Please provide a room ID: node botClient.js <roomId>");
  process.exit(1);
}

// 🔗 Connect to socket server
const socket = io("http://localhost:5000", {
  transports: ["websocket"],
  forceNew: true,
});

socket.on("connect", () => {
  console.log(`🤖 AI Bot connected as ${socket.id}`);
  socket.emit("join-room", roomId, true); // Join as bot
});

socket.on("user-message", async ({ roomId, message, sender }) => {
  try {
    console.log(`🧠 ${sender} said: ${message}`);

    const reply = await getAIReply(message, sender);
    const audio = await getAudioFromText(reply);

    if (audio) {
      socket.emit("bot-audio", {
        roomId,
        text: reply,
        audio,
        sender: "🤖 AI",
      });
      console.log("📢 AI replied with audio.");
    } else {
      console.warn("⚠️ Audio generation failed.");
    }
  } catch (err) {
    console.error("❌ Bot error:", err.message);
  }
});

socket.on("disconnect", () => {
  console.log("🔴 Bot disconnected");
});

// 🧠 Get AI reply using OpenRouter API
async function getAIReply(userMsg, sender) {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "mistralai/mixtral-8x7b-instruct",
      messages: [
        {
          role: "system",
          content:
            "You are a helpful AI participant in a group discussion. Respond with relevant, concise spoken English.",
        },
        { role: "user", content: `${sender}: ${userMsg}` },
      ],
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    console.error("❌ OpenRouter Error:", data);
    throw new Error(data?.error?.message || "Failed to get response from model");
  }

  return data.choices[0].message.content.trim();
}
