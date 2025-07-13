import express from "express";
import GdSession from "../models/GdSession.js";
import verifyToken from "../middleware/verifyToken.js";

const router = express.Router();

// Create GD session
router.post("/create", verifyToken, async (req, res) => {
  try {
    const { topic, scheduledTime, aiCount, humanCount } = req.body;

    if (!topic || !scheduledTime || aiCount == null || humanCount == null) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const session = new GdSession({
      topic,
      scheduledTime: new Date(scheduledTime),
      aiCount,
      createdBy: req.user,
      participants: [req.user], // Add creator as initial real participant
    });

    await session.save();
    res.status(201).json({ message: "GD session created", session });
  } catch (err) {
    console.error("GD creation error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
