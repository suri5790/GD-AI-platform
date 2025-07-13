import Session from "../models/GdSession.js";

// ✅ Get sessions created by logged-in user
export const getMySessions = async (req, res) => {
  try {
    const userId = req.user;

    const sessions = await Session.find({ createdBy: userId });
    res.status(200).json(sessions);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch sessions" });
  }
};

// Get session details by ID
export const getSessionById = async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);
    if (!session) return res.status(404).json({ message: "Session not found" });
    res.status(200).json(session);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch session" });
  }
};


export const joinSession = async (req, res) => {
  try {
    const session = await Session.findById(req.params.id).populate("participants", "username");

    if (!session) return res.status(404).json({ message: "Session not found" });

    const userId = req.user;

    const alreadyJoined = session.participants.some(
      (participant) => participant._id.toString() === userId
    );

    if (!alreadyJoined) {
      session.participants.push(userId);
      await session.save();
    }

    // Re-populate to reflect latest
    const updatedSession = await Session.findById(req.params.id).populate("participants", "username");

    res.status(200).json({ message: "Joined session", session: updatedSession });
  } catch (err) {
    console.error("Join error:", err);
    res.status(500).json({ message: "Failed to join session" });
  }
};



export const startSession = async (req, res) => {
  try {
    const session = await Session.findById(req.params.id)
  .populate("participants", "username"); // populate only username field

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

export const endSession = async (req, res) => {
  try {
    const session = await Session.findById(req.params.id)
  .populate("participants", "username"); // populate only username field

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


// ✅ Create new GD Session
export const createSession = async (req, res) => {
  try {
    const { topic, scheduledTime, aiCount } = req.body;

    const newSession = new Session({
      topic,
      scheduledTime,
      aiCount,
      createdBy: req.user, // you’re already using req.user everywhere
      participants: [req.user], // add creator as first participant
    });

    await newSession.save();
    res.status(201).json({ message: "Session created", session: newSession });
  } catch (err) {
    console.error("Create Session Error:", err);
    res.status(500).json({ message: "Failed to create session" });
  }
};
