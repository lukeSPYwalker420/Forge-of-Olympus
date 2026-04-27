import mongoose from "mongoose";

const LiftStateSchema = new mongoose.Schema({
  userId: String,
  liftName: String,
  estimated1RM: { type: Number, default: 0 },
  currentWeight: { type: Number, default: 0 },
  lastROM: { type: Number, default: 0 },
  lastRepsAchieved: { type: Number, default: 0 },
  consecutiveSuccesses: { type: Number, default: 0 },
  stallCounter: { type: Number, default: 0 },
  updatedAt: { type: Date, default: Date.now }
});

export default mongoose.model("LiftState", LiftStateSchema);