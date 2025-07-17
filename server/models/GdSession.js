import mongoose from "mongoose";

const Schema = mongoose.Schema;

const gdSessionSchema = new Schema({
  topic: {
    type: String,
    required: true,
  },
  scheduledTime: {
    type: Date,
    required: true,
  },
  aiCount: {
    type: Number,
    required: true,
  },
  humanCount: {
    type: Number,
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  participants: [
    {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  ],
  isStarted: {
    type: Boolean,
    default: false,
  },
  isEnded: {
    type: Boolean,
    default: false,
  },
  realUserTranscripts: [
    {
      user: {
        type: Schema.Types.ObjectId,
        ref: "User", // ✅ THIS FIXES YOUR ERROR
        required: true,
      },
      text: {
        type: String,
        required: true,
      },
    },
  ],
});

const GdSession = mongoose.model("GdSession", gdSessionSchema);

export default GdSession;
