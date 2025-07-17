import dotenv from "dotenv";
dotenv.config();

import OpenAI from "openai";
import GdSession from "../models/GdSession.js";
import User from "../models/User.js";

// 🔐 Debug check
console.log("🔐 OPENROUTER_API_KEY =", process.env.OPENROUTER_API_KEY);

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});


// ✅ Get sessions created by logged-in user
export const getMySessions = async (req, res) => {
  try {
    const userId = req.user;
    const sessions = await GdSession.find({ createdBy: userId });
    res.status(200).json(sessions);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch sessions" });
  }
};

// ✅ Get session by ID
export const getSessionById = async (req, res) => {
  try {
    const session = await GdSession.findById(req.params.id);
    if (!session) return res.status(404).json({ message: "Session not found" });
    res.status(200).json(session);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch session" });
  }
};

// ✅ Join session
export const joinSession = async (req, res) => {
  try {
    const session = await GdSession.findById(req.params.id).populate("participants", "username");
    if (!session) return res.status(404).json({ message: "Session not found" });

    const userId = req.user;
    const alreadyJoined = session.participants.some(
      (p) => p._id.toString() === userId
    );

    if (!alreadyJoined) {
      session.participants.push(userId);
      await session.save();
    }

    const updatedSession = await GdSession.findById(req.params.id).populate("participants", "username");
    res.status(200).json({ message: "Joined session", session: updatedSession });
  } catch (err) {
    console.error("Join error:", err);
    res.status(500).json({ message: "Failed to join session" });
  }
};

// ✅ Start GD
export const startSession = async (req, res) => {
  try {
    const session = await GdSession.findById(req.params.id).populate("participants", "username");
    if (!session) return res.status(404).json({ message: "Session not found" });

    if (session.createdBy.toString() !== req.user)
      return res.status(403).json({ message: "Only creator can start the session" });

    session.isStarted = true;
    await session.save();
    res.status(200).json({ message: "GD started" });
  } catch (err) {
    res.status(500).json({ message: "Failed to start GD" });
  }
};

// ✅ End GD
export const endSession = async (req, res) => {
  try {
    const session = await GdSession.findById(req.params.id).populate("participants", "username");
    if (!session) return res.status(404).json({ message: "Session not found" });

    if (session.createdBy.toString() !== req.user)
      return res.status(403).json({ message: "Only creator can end the session" });

    session.isEnded = true;
    await session.save();
    res.status(200).json({ message: "GD ended" });
  } catch (err) {
    res.status(500).json({ message: "Failed to end GD" });
  }
};

// ✅ Create GD session
export const createSession = async (req, res) => {
  try {
    const { topic, scheduledTime, aiCount } = req.body;

    const newSession = new GdSession({
      topic,
      scheduledTime,
      aiCount,
      createdBy: req.user,
      participants: [req.user],
    });

    await newSession.save();
    res.status(201).json({ message: "Session created", session: newSession });
  } catch (err) {
    console.error("Create Session Error:", err);
    res.status(500).json({ message: "Failed to create session" });
  }
};

// ✅ Generate feedback after GD ends
export const generateFeedback = async (req, res) => {
  const sessionId = req.params.id;

  try {
    const session = await GdSession.findById(sessionId).populate("realUserTranscripts.user", "username");

    if (!session) return res.status(404).json({ message: "Session not found" });
    if (!session.realUserTranscripts || session.realUserTranscripts.length === 0) {
      return res.status(400).json({ message: "No transcripts found to generate feedback." });
    }

    const userSpeechMap = {};
    session.realUserTranscripts.forEach(({ user, text }) => {
      const uid = user._id.toString();
      if (!userSpeechMap[uid]) {
        userSpeechMap[uid] = { username: user.username, speeches: [] };
      }
      userSpeechMap[uid].speeches.push(text);
    });

    const feedbackResults = [];

    for (const [userId, { username, speeches }] of Object.entries(userSpeechMap)) {
      const combinedText = speeches.join(" ");
      const prompt = `
Analyze this user's participation in a group discussion. The full transcript of what they said is below:

---
"${combinedText}"
---

Give structured feedback on:

1. Participation (active/inactive)
2. Content Quality (were points logical, unique, well-phrased?)
3. Communication Style (clarity, fluency, confidence)
4. Suggestions for Improvement

Be concise and clear.
      `;

      const completion = await openai.chat.completions.create({
        model: "meta-llama/llama-3-70b-instruct",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
      });

      const responseText = completion.choices[0].message.content;

      feedbackResults.push({
        userId,
        username,
        feedback: responseText,
      });
    }

    res.json({ feedback: feedbackResults });
  } catch (err) {
    console.error("❌ Feedback generation failed:", err);
    res.status(500).json({ message: "Failed to generate feedback" });
  }
};
