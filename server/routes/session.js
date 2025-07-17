import express from "express";
import verifyToken from "../middleware/verifyToken.js";
import { getMySessions, getSessionById, joinSession } from "../controllers/sessionController.js";
import { startSession, endSession } from "../controllers/sessionController.js";
import { generateFeedback } from "../controllers/sessionController.js";

import GdSession from "../models/GdSession.js";
import mongoose from "mongoose"; // ✅ Required for ObjectId check


const router = express.Router();

router.get("/mine", verifyToken, getMySessions);
router.get("/:id", verifyToken, getSessionById);
router.post("/:id/join", verifyToken, joinSession);
router.post("/:id/start", verifyToken, startSession);
router.post("/:id/end", verifyToken, endSession);
router.post("/:id/feedback", verifyToken, generateFeedback);



router.post("/:id/transcripts", verifyToken, async (req, res) => {
  try {
    const session = await GdSession.findById(req.params.id);
    if (!session) return res.status(404).json({ message: "Session not found" });

    const { transcripts } = req.body;

    // ✅ Filter only valid ObjectId transcripts
    const validTranscripts = transcripts.filter(t => {
      return t.user && mongoose.Types.ObjectId.isValid(t.user) && t.text?.trim();
    });

    if (validTranscripts.length === 0) {
      return res.status(400).json({ message: "No valid transcripts to save." });
    }

    session.realUserTranscripts.push(...validTranscripts);
    await session.save();

    res.status(200).json({ message: "Transcripts saved." });
  } catch (err) {
    console.error("Transcript save error:", err);
    res.status(500).json({ message: "Failed to save transcripts" });
  }
});




export default router;
