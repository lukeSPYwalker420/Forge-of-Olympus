import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import stripe from "stripe"

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.post("/api/stripe-webhook", express.raw({ type: "application/json" }), async (req, res) => {
  const sig = req.headers["stripe-signature"];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error(`Webhook signature failed: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const customerEmail = session.customer_details?.email;
    if (!customerEmail) return res.status(400).send("No email");

    // Fetch line items to get program name
    const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
    const programName = lineItems.data[0]?.description || "Unknown Program";

    await Purchase.findOneAndUpdate(
      { stripePaymentIntentId: session.payment_intent },
      { email: customerEmail, programName, stripePaymentIntentId: session.payment_intent },
      { upsert: true }
    );
    console.log(`✅ Purchase recorded: ${customerEmail} → ${programName}`);
  }

  res.json({ received: true });
});
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ==================== MongoDB Schemas ====================
const LiftStateSchema = new mongoose.Schema({
  userId: String,
  liftName: String,
  estimated1RM: { type: Number, default: 0 },
  updatedAt: { type: Date, default: Date.now }
});
const LiftState = mongoose.model("LiftState", LiftStateSchema);

const SessionSchema = new mongoose.Schema({
  userId: String,
  week: Number,
  day: Number,
  liftName: String,
  targetReps: String,
  repsCompleted: Number,
  targetRPE: Number,
  actualRPE: Number,
  actualWeight: Number,
  completed: Boolean,
  createdAt: { type: Date, default: Date.now }
});
const Session = mongoose.model("Session", SessionSchema);

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.error("MongoDB error:", err));

const PurchaseSchema = new mongoose.Schema({
  email: { type: String, required: true },
  programName: { type: String, required: true },
  stripePaymentIntentId: { type: String, unique: true },
  purchasedAt: { type: Date, default: Date.now }
});
const Purchase = mongoose.model("Purchase", PurchaseSchema);

const UserSchema = new mongoose.Schema({
  email: { type: String, unique: true },
  createdAt: { type: Date, default: Date.now }
});
const User = mongoose.model("User", UserSchema);

// ==================== Program Loader ====================
const loadProgram = (programName) => {
  const safeName = programName.replace(/\s+/g, '-');
  const filePath = path.join(__dirname, "data", `${safeName}.json`);
  if (!fs.existsSync(filePath)) throw new Error(`Program file not found: ${filePath}`);
  const raw = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  if (raw.sessions && Array.isArray(raw.sessions)) return { name: raw.name, logic: raw.logic, sessions: raw.sessions };
  if (Array.isArray(raw)) return { sessions: raw, logic: "STRENGTH_RPE" };
  throw new Error(`Invalid program format`);
};

// ==================== Corrected 1RM estimation ====================
function estimate1RM(weight, reps, actualRPE) {
  if (!weight || !reps || !actualRPE) return weight;
  // RPE to % of 1RM (for typical 1-5 reps)
  const rpeToPercent = {
    10: 1.00, 9.5: 0.97, 9: 0.94, 8.5: 0.91, 8: 0.88,
    7.5: 0.85, 7: 0.82, 6.5: 0.79, 6: 0.76, 5.5: 0.73, 5: 0.70
  };
  let percent = rpeToPercent[actualRPE] || 0.8;
  let estimated = weight / percent;
  // Adjust for higher reps (Epley)
  if (reps > 5) estimated = weight * (1 + reps / 30);
  return Math.round(estimated);
}

// Calculate weight for a given target RPE and reps, based on 1RM
function weightForRPE(oneRM, targetRPE, targetReps) {
  if (!oneRM || !targetRPE) return 0;
  const rpeToPercent = {
    10: 1.00, 9.5: 0.97, 9: 0.94, 8.5: 0.91, 8: 0.88,
    7.5: 0.85, 7: 0.82, 6.5: 0.79, 6: 0.76, 5.5: 0.73, 5: 0.70
  };
  let percent = rpeToPercent[targetRPE] || 0.8;
  // Slight adjustment for low reps (<5)
  if (targetReps <= 3) percent += 0.02;
  if (targetReps >= 8) percent -= 0.03;
  percent = Math.min(0.95, Math.max(0.65, percent));
  return Math.round(oneRM * percent / 2.5) * 2.5;
}

// ==================== Progression: update 1RM from performance ====================
function strengthRPEProgression(state, sessionData) {
  let new1RM = state.estimated1RM || 0;
  const completed = sessionData.completed === true;
  const targetReps = parseInt(sessionData.targetReps, 10);
  const actualReps = sessionData.repsCompleted || 0;
  const repsMet = !isNaN(targetReps) && actualReps >= targetReps;
  const rpeOk = sessionData.actualRPE <= sessionData.targetRPE + 0.5;
  const isGoodSession = completed && repsMet && rpeOk;

  // Always calculate a fresh 1RM from this session (if valid)
  let fresh1RM = null;
  if (completed && sessionData.actualWeight && actualReps && sessionData.actualRPE) {
    fresh1RM = estimate1RM(sessionData.actualWeight, actualReps, sessionData.actualRPE);
  }

  if (fresh1RM !== null) {
    if (isGoodSession) {
      // Good session: take the higher of previous and fresh (allows progress)
      new1RM = Math.max(new1RM, fresh1RM);
      // Optional: small bonus for consecutive good sessions (streak logic)
      // but not necessary – the fresh1RM will naturally increase if weight goes up.
    } else {
      // Bad session: use the fresh estimate (which will be lower if RPE was high)
      new1RM = fresh1RM;
      // Optional extra penalty for repeated failures (e.g., if stallCounter >= 2, subtract 2.5kg)
      // You can add that later if needed.
    }
  }

  return { estimated1RM: Math.round(new1RM) };
}

// Dispatcher (only strength for now)
function calculateProgression(state, sessionData, logic) {
  return strengthRPEProgression(state, sessionData);
}

// ==================== API Routes ====================
app.get("/api/session-view/:week/:day/:userId", async (req, res) => {
  try {
    const week = Number(req.params.week);
    const day = Number(req.params.day);
    const userId = req.params.userId;
    const programName = req.query.program;
    if (!programName) return res.status(400).json({ error: "Missing program name" });

    const programData = loadProgram(programName);
    const session = programData.sessions.find(p => p.week === week && p.day === day);
    if (!session) return res.status(404).json({ error: "Session not found" });

    const logic = programData.logic || "STRENGTH_RPE";
    const liftStates = await LiftState.find({ userId });

    const projected = (session.exercises || []).map(ex => {
      const state = liftStates.find(s => s.liftName === ex.liftName);
      let currentWeight = 0;
      let projectedNextWeight = 0;
      if (state && state.estimated1RM > 0) {
        const targetRPE = ex.rpeTarget || 7;
        currentWeight = weightForRPE(state.estimated1RM, targetRPE, ex.reps);
        // Next week's weight if RPE increases by 0.5 (optional preview)
        projectedNextWeight = weightForRPE(state.estimated1RM, targetRPE + 0.5, ex.reps);
      }
      return {
        liftName: ex.liftName,
        sets: ex.sets,
        reps: ex.reps,
        rpeTarget: ex.rpeTarget,
        currentWeight,
        projectedNextWeight
      };
    });

    res.json({ program: session, logic, projected });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/session-log", async (req, res) => {
  try {
    const log = await Session.create(req.body);
    res.json(log);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/progression/apply", async (req, res) => {
  try {
    const { userId, liftName, logic } = req.body;
    const lastSession = await Session.findOne({ userId, liftName }).sort({ createdAt: -1 });
    if (!lastSession) {
      return res.status(400).json({ error: "No session data" });
    }

    let state = await LiftState.findOne({ userId, liftName });
    if (!state) {
      // First time: estimate 1RM from this session
      const initial1RM = estimate1RM(lastSession.actualWeight, lastSession.repsCompleted, lastSession.actualRPE);
      state = new LiftState({ userId, liftName, estimated1RM: initial1RM });
      await state.save();
      return res.json({ message: "Initial 1RM set", state });
    }

    const result = calculateProgression(state, {
      completed: lastSession.completed,
      targetReps: lastSession.targetReps,
      repsCompleted: lastSession.repsCompleted,
      targetRPE: lastSession.targetRPE,
      actualRPE: lastSession.actualRPE,
      actualWeight: lastSession.actualWeight,
      liftName
    }, logic || "STRENGTH_RPE");

    state.estimated1RM = result.estimated1RM;
    state.updatedAt = new Date();
    await state.save();

    console.log(`💾 ${liftName}: 1RM=${state.estimated1RM}kg`);
    res.json({ message: "1RM updated", state });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/history/:userId/:liftName", async (req, res) => {
  try {
    const { userId, liftName } = req.params;
    const history = await Session.find({ userId, liftName }).sort({ createdAt: -1 }).limit(10);
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Dashboard endpoint: get current 1RM for a lift
app.get("/api/estimate-1rm/:userId/:liftName", async (req, res) => {
  try {
    const { userId, liftName } = req.params;
    const state = await LiftState.findOne({ userId, liftName });
    res.json({ estimated1RM: state ? state.estimated1RM : null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/recent-sessions/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const sessions = await Session.find({ userId }).sort({ createdAt: -1 }).limit(20);
    res.json(sessions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== LOGIN ENDPOINT ====================
app.post("/api/login", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email required" });

  // Find or create user (if you have a User model)
  let user = await User.findOne({ email });
  if (!user) {
    user = await User.create({ email });
  }

  const purchases = await Purchase.find({ email });
  const purchasedPrograms = purchases.map(p => p.programName);

  res.json({
    userId: user._id.toString(),
    email,
    purchasedPrograms
  });
});

// Serve React build
const distPath = path.join(__dirname, "frontend", "dist");
app.use(express.static(distPath));
app.get("*", (req, res) => res.sendFile(path.join(distPath, "index.html")));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));