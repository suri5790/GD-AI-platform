import express from "express";
import verifyToken from "../middleware/verifyToken.js";
import { getMySessions, getSessionById, joinSession } from "../controllers/sessionController.js";
import { startSession, endSession } from "../controllers/sessionController.js";


const router = express.Router();

router.get("/mine", verifyToken, getMySessions);
router.get("/:id", verifyToken, getSessionById);
router.post("/:id/join", verifyToken, joinSession);
router.post("/:id/start", verifyToken, startSession);
router.post("/:id/end", verifyToken, endSession);

export default router;
