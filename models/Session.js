import mongoose from "mongoose";

const SessionSchema = new mongoose.Schema({
  userId: String,
  week: Number,
  day: Number,
  liftName: String,
  targetReps: String,
  targetSets: Number,
  repsPerSet: [Number],
  repsCompleted: Number,
  targetRPE: Number,
  actualRPE: Number,
  actualWeight: Number,
  targetRIR: Number,
  actualRIR: Number,
  completed: Boolean,
  progressionType: String,
  actualQuality: Number,
  targetQuality: Number,
  targetStability: Number,
  actualStability: Number,
  actualROM: Number,
  targetROM: Number,
  actualPain: Number,
  targetPain: Number,
  programName: String,
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("Session", SessionSchema);