import mongoose from "mongoose";

const AiCoachCacheSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  prompts: [{
    lift: String,
    type: String,
    message: String
  }],
  createdAt: { type: Date, default: Date.now, expires: '24h' }   // auto-delete after 24h
});

export default mongoose.model("AiCoachCache", AiCoachCacheSchema);