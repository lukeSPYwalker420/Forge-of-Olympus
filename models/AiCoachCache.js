import mongoose from "mongoose";

const AiCoachCacheSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  prompts: [{ type: mongoose.Schema.Types.Mixed }],   // ← array of objects
  createdAt: { type: Date, default: Date.now, expires: '24h' }
});

export default mongoose.model("AiCoachCache", AiCoachCacheSchema);