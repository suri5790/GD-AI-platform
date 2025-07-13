import mongoose from "mongoose";

const gdSessionSchema = new mongoose.Schema({
  topic: {
    type: String,
    required: true,
  },
  scheduledTime: {
    type: Date,
    required: true,
  },
  participants: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],
  aiCount: {
    type: Number,
    default: 1,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  isEnded: {
  type: Boolean,
  default: false,
},

  isStarted: {
  type: Boolean,
  default: false,
}

}, { timestamps: true });

const GdSession = mongoose.model("GdSession", gdSessionSchema);
export default GdSession;
