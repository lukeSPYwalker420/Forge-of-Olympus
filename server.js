import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import Stripe from "stripe";

dotenv.config();

const app = express();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

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
  currentWeight: { type: Number, default: 0 },
  lastROM: { type: Number, default: 0 },
  lastRepsAchieved: { type: Number, default: 0 },
  consecutiveSuccesses: { type: Number, default: 0 },
  stallCounter: { type: Number, default: 0 },
  updatedAt: { type: Date, default: Date.now }
});
const LiftState = mongoose.model("LiftState", LiftStateSchema);

const SessionSchema = new mongoose.Schema({
  userId: String,
  week: Number,
  day: Number,
  liftName: String,
  targetReps: String,
  targetSets: Number,           // new: number of sets for this exercise
  repsPerSet: [Number],         // new: array of reps per set, e.g., [5,5,4,0]
  repsCompleted: Number,        // keep for backward compatibility
  targetRPE: Number,
  actualRPE: Number,
  actualWeight: Number,
  targetRIR: Number,
  actualRIR: Number,
  completed: Boolean,
  progressionType: String,
  actualQuality: Number,
  targetQuality: Number,
  actualROM: Number,
  targetROM: Number,
  actualPain: Number,
  targetPain: Number,
  programName: String,
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
  streak: { type: Number, default: 0 },
  lastWorkoutDate: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now }
});
const User = mongoose.model("User", UserSchema);

const LeadSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  source: { type: String, default: "register_modal" },
  createdAt: { type: Date, default: Date.now }
});
const Lead = mongoose.model("Lead", LeadSchema);

// ==================== Program Loader ====================
const loadProgram = (programName) => {
  const safeName = programName.replace(/\s+/g, '-');
  const filePath = path.join(__dirname, "data", `${safeName}.json`);
  console.log(`[DEBUG] Looking for program file: ${filePath}`);
  console.log(`[DEBUG] __dirname = ${__dirname}`);
  console.log(`[DEBUG] Does file exist? ${fs.existsSync(filePath)}`);
  if (!fs.existsSync(filePath)) throw new Error(`Program file not found: ${filePath}`);
  const raw = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  if (raw.sessions && Array.isArray(raw.sessions)) return { name: raw.name, logic: raw.logic, sessions: raw.sessions };
  if (Array.isArray(raw)) return { sessions: raw, logic: "STRENGTH_RPE" };
  throw new Error(`Invalid program format`);
};

// ==================== Helper Functions ====================
function estimate1RM(weight, reps, actualRPE) {
  if (!weight || !reps || !actualRPE || actualRPE <= 0) return weight || 0;
  const rpeToPercent = {
    10: 1.00, 9.5: 0.97, 9: 0.94, 8.5: 0.91, 8: 0.88,
    7.5: 0.85, 7: 0.82, 6.5: 0.79, 6: 0.76, 5.5: 0.73, 5: 0.70
  };
  let percent = rpeToPercent[actualRPE] || 0.8;
  let estimated = weight / percent;
  if (reps > 5) estimated = weight * (1 + reps / 30);
  return Math.round(estimated);
}

function weightForRPE(oneRM, targetRPE, targetReps) {
  if (!oneRM || !targetRPE) return 0;
  const rpeToPercent = {
    10: 1.00, 9.5: 0.97, 9: 0.94, 8.5: 0.91, 8: 0.88,
    7.5: 0.85, 7: 0.82, 6.5: 0.79, 6: 0.76, 5.5: 0.73, 5: 0.70
  };
  let percent = rpeToPercent[targetRPE] || 0.8;
  if (targetReps <= 3) percent += 0.02;
  if (targetReps >= 8) percent -= 0.03;
  percent = Math.min(0.95, Math.max(0.65, percent));
  return Math.round(oneRM * percent / 2.5) * 2.5;
}

// ==================== Progression Functions ====================
function strengthRPEProgression(state, sessionData) {
  let new1RM = state.estimated1RM || 0;
  const completed = sessionData.completed === true;
  
  // New logic using repsPerSet
  const repsPerSet = sessionData.repsPerSet || [];
  const targetReps = parseInt(sessionData.targetReps, 10);
  const targetSets = sessionData.targetSets || 1;
  const allSetsCompleted = repsPerSet.length === targetSets && repsPerSet.every(r => r >= targetReps);
  const anyMissed = repsPerSet.some(r => r < targetReps);
  
  const rpeOk = sessionData.actualRPE <= sessionData.targetRPE + 0.5;
  const isGoodSession = completed && allSetsCompleted && rpeOk;

  let fresh1RM = null;
  if (completed && sessionData.actualWeight && repsPerSet.length && sessionData.actualRPE) {
    // Use the best set (highest reps) or average? For simplicity, use the highest reps
    const bestReps = Math.max(...repsPerSet);
    fresh1RM = estimate1RM(sessionData.actualWeight, bestReps, sessionData.actualRPE);
  }

  if (fresh1RM !== null) {
    if (isGoodSession) {
      new1RM = Math.max(new1RM, fresh1RM);
    } else {
      new1RM = fresh1RM;
    }
  }
  return { estimated1RM: Math.round(new1RM) };
}

function hypertrophyVolumeProgression(state, sessionData) {
  let newWeight = state.currentWeight || sessionData.actualWeight || 0;
  let lastReps = state.lastRepsAchieved || 0;
  let successStreak = state.consecutiveSuccesses || 0;
  let stallCounter = state.stallCounter || 0;

  const completed = sessionData.completed === true;
  const repsPerSet = sessionData.repsPerSet || [];
  const targetRepsStr = sessionData.targetReps || "8-12";
  let minReps = 8, maxReps = 12;
  if (targetRepsStr.includes('-')) {
    const parts = targetRepsStr.split('-').map(Number);
    minReps = parts[0];
    maxReps = parts[1];
  } else {
    minReps = maxReps = parseInt(targetRepsStr, 10);
  }
  
  const targetSets = sessionData.targetSets || 3;
  const allSetsCompleted = repsPerSet.length === targetSets && repsPerSet.every(r => r >= minReps);
  const actualReps = Math.max(...repsPerSet); // best set for progression
  
  const targetRIR = sessionData.targetRIR || 2;
  const actualRIR = sessionData.actualRIR;
  const hasRIR = typeof actualRIR === 'number';
  const rirGood = hasRIR && actualRIR <= targetRIR - 1;

  const isGoodSession = completed && allSetsCompleted && rirGood;

  if (isGoodSession) {
    if (actualReps > lastReps && actualReps <= maxReps) {
      lastReps = actualReps;
    }
    successStreak += 1;
    stallCounter = 0;

    if (lastReps >= maxReps) {
      const increment = (sessionData.liftName?.toLowerCase().includes("squat") ||
                         sessionData.liftName?.toLowerCase().includes("deadlift")) ? 5 : 2.5;
      newWeight += increment;
      lastReps = minReps;
      successStreak = 0;
    }
  } else {
    successStreak = 0;
    stallCounter += 1;
    if (stallCounter >= 3 && newWeight > 0) {
      const decrement = (sessionData.liftName?.toLowerCase().includes("squat") ||
                         sessionData.liftName?.toLowerCase().includes("deadlift")) ? 5 : 2.5;
      newWeight = Math.max(0, newWeight - decrement);
      stallCounter = 0;
      lastReps = minReps;
    }
  }

  return {
    currentWeight: Math.round(newWeight),
    lastRepsAchieved: lastReps,
    consecutiveSuccesses: successStreak,
    stallCounter
  };
}

function explosivePowerProgression(state, sessionData) {
  return { currentWeight: state.currentWeight, consecutiveSuccesses: 0, stallCounter: 0 };
}

function enduranceDensityProgression(state, sessionData) {
  return { currentWeight: state.currentWeight, consecutiveSuccesses: 0, stallCounter: 0 };
}

function mobilityRangeProgression(state, sessionData) {
  return { lastROM: state.lastROM, consecutiveSuccesses: 0, stallCounter: 0 };
}

function generalFitnessProgression(state, sessionData) {
  let newWeight = state.currentWeight || sessionData.actualWeight || 0;
  let newROM = state.lastROM || sessionData.actualROM || 0;
  let successStreak = state.consecutiveSuccesses || 0;
  let stallCounter = state.stallCounter || 0;

  const completed = sessionData.completed === true;
  const progressionType = sessionData.progressionType || "strength";

  if (progressionType === "strength") {
    const targetReps = parseInt(sessionData.targetReps, 10);
    const actualReps = sessionData.repsCompleted || 0;
    const repsMet = !isNaN(targetReps) && actualReps >= targetReps;
    const rpeOk = sessionData.actualRPE <= sessionData.targetRPE + 1;
    const isGoodSession = completed && repsMet && rpeOk;

    if (isGoodSession) {
      successStreak += 1;
      stallCounter = 0;
      if (successStreak >= 3) {
        newWeight += (sessionData.liftName?.toLowerCase().includes("squat") || sessionData.liftName?.toLowerCase().includes("deadlift")) ? 5 : 2.5;
        successStreak = 0;
      }
    } else {
      successStreak = 0;
      stallCounter += 1;
    }
  } else if (progressionType === "power") {
    const qualityOk = (sessionData.actualQuality || 0) >= (sessionData.targetQuality || 7);
    const isGoodPowerSession = completed && qualityOk;

    if (isGoodPowerSession) {
      successStreak += 1;
      if (successStreak >= 2) {
        newWeight += 2.5;
        successStreak = 0;
      }
    } else {
      successStreak = 0;
    }
  } else if (progressionType === "mobility") {
    const romMet = (sessionData.actualROM || 0) >= (sessionData.targetROM || 0);
    const painOk = (sessionData.actualPain || 0) <= (sessionData.targetPain || 2);
    const isGoodMobilitySession = completed && romMet && painOk;

    if (isGoodMobilitySession) {
      successStreak += 1;
      if (successStreak >= 2) {
        newROM += 5;
        successStreak = 0;
      }
    } else {
      successStreak = 0;
    }
  } else if (progressionType === "volume" || progressionType === "stability") {
    const targetReps = parseInt(sessionData.targetReps, 10);
    const actualReps = sessionData.repsCompleted || 0;
    const repsMet = !isNaN(targetReps) && actualReps >= targetReps;
    const isGoodVolumeSession = completed && repsMet;

    if (isGoodVolumeSession) {
      successStreak += 1;
      if (successStreak >= 3) {
        successStreak = 0;
      }
    } else {
      successStreak = 0;
    }
  } else if (progressionType === "deload") {
    // Do nothing
  }

  return {
    currentWeight: Math.round(newWeight),
    lastROM: Math.round(newROM),
    consecutiveSuccesses: successStreak,
    stallCounter
  };
}

function calculateProgression(state, sessionData, logic) {
  switch (logic) {
    case "STRENGTH_RPE":
      return strengthRPEProgression(state, sessionData);
    case "HYPERTROPHY_VOLUME":
      return hypertrophyVolumeProgression(state, sessionData);
    case "EXPLOSIVE_POWER":
      return explosivePowerProgression(state, sessionData);
    case "ENDURANCE_DENSITY":
      return enduranceDensityProgression(state, sessionData);
    case "MOBILITY":
      return mobilityRangeProgression(state, sessionData);
    case "GENERAL_FITNESS_HYBRID":
      return generalFitnessProgression(state, sessionData);
    default:
      return strengthRPEProgression(state, sessionData);
  }
}

// ==================== API Routes ====================

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: Date.now() });
});

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

    const availableWeeks = [...new Set(programData.sessions.map(s => s.week))].sort((a,b)=>a-b);
    const availableDaysPerWeek = {};
    availableWeeks.forEach(w => {
      availableDaysPerWeek[w] = [...new Set(programData.sessions.filter(s => s.week === w).map(s => s.day))].sort((a,b)=>a-b);
    });

    const logic = programData.logic || "STRENGTH_RPE";
    const liftStates = await LiftState.find({ userId });

    const projected = (session.exercises || []).map(ex => {
      const state = liftStates.find(s => s.liftName === ex.liftName);
      let currentWeight = 0;
      let projectedNextWeight = 0;

      if (state) {
        if (logic === "STRENGTH_RPE" && state.estimated1RM > 0) {
          const targetRPE = ex.rpeTarget || 7;
          currentWeight = weightForRPE(state.estimated1RM, targetRPE, ex.reps);
          projectedNextWeight = weightForRPE(state.estimated1RM, targetRPE + 0.5, ex.reps);
        } 
        else if (logic === "GENERAL_FITNESS_HYBRID" && state.currentWeight > 0) {
          currentWeight = state.currentWeight;
          const inc = (ex.liftName?.toLowerCase().includes("squat") || ex.liftName?.toLowerCase().includes("deadlift")) ? 5 : 2.5;
          projectedNextWeight = currentWeight + inc;
        }
        else if (logic === "HYPERTROPHY_VOLUME" && state.currentWeight > 0) {
          currentWeight = state.currentWeight;
          const inc = (ex.liftName?.toLowerCase().includes("squat") || ex.liftName?.toLowerCase().includes("deadlift")) ? 5 : 2.5;
          projectedNextWeight = currentWeight + inc;
        }
      }

      return {
        liftName: ex.liftName,
        sets: ex.sets,
        reps: ex.reps,
        rpeTarget: ex.rpeTarget,
        rirTarget: ex.rirTarget,
        romTarget: ex.romTarget,
        painTarget: ex.painTarget,
        progressionType: ex.progressionType,
        currentWeight,
        projectedNextWeight
      };
    });

    res.json({ program: session, logic, projected, availableWeeks, availableDaysPerWeek });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/session-log", async (req, res) => {
  try {
    const log = await Session.create(req.body);
    
    // Update user streak using userId from request body
    const userId = req.body.userId;
    if (userId) {
      const user = await User.findById(userId);
      if (user) {
        const today = new Date().toDateString();
        const lastDate = user.lastWorkoutDate ? new Date(user.lastWorkoutDate).toDateString() : null;
        
        if (lastDate !== today) {
          if (lastDate === new Date(Date.now() - 86400000).toDateString()) {
            user.streak += 1;
          } else {
            user.streak = 1;
          }
          user.lastWorkoutDate = new Date();
          await user.save();
          console.log(`🔥 Streak: ${user.email} → ${user.streak} days`);
        }
      }
    }
    
    res.json(log);
  } catch (err) {
    console.error("Session log error:", err);
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
      let initialState = { userId, liftName };
      if (logic === "STRENGTH_RPE") {
  const initial1RM = estimate1RM(lastSession.actualWeight, lastSession.repsCompleted, lastSession.actualRPE);
  initialState.estimated1RM = initial1RM;
  initialState.currentWeight = 0;   // ← add this line
} else {
        initialState.currentWeight = lastSession.actualWeight || 0;
        initialState.lastROM = 0;
        initialState.lastRepsAchieved = 0;
      }
      state = new LiftState(initialState);
      await state.save();
      return res.json({ message: "Initial state set", state });
    }

    const sessionData = {
      completed: lastSession.completed,
      targetReps: lastSession.targetReps,
      repsCompleted: lastSession.repsCompleted,
      targetSets: lastSession.targetSets,
      repsPerSet: lastSession.repsPerSet,
      targetRPE: lastSession.targetRPE,
      actualRPE: lastSession.actualRPE,
      actualWeight: lastSession.actualWeight,
      liftName,
      progressionType: lastSession.progressionType,
      actualQuality: lastSession.actualQuality,
      targetQuality: lastSession.targetQuality,
      actualROM: lastSession.actualROM,
      targetROM: lastSession.targetROM,
      actualPain: lastSession.actualPain,
      targetPain: lastSession.targetPain,
      targetRIR: lastSession.targetRIR,    
      actualRIR: lastSession.actualRIR
    };

    const result = calculateProgression(state, sessionData, logic || "STRENGTH_RPE");

    if (result.estimated1RM !== undefined) state.estimated1RM = result.estimated1RM;
    if (result.currentWeight !== undefined) state.currentWeight = result.currentWeight;
    if (result.lastRepsAchieved !== undefined) state.lastRepsAchieved = result.lastRepsAchieved;
    if (result.lastROM !== undefined) state.lastROM = result.lastROM;
    state.consecutiveSuccesses = result.consecutiveSuccesses || 0;
    state.stallCounter = result.stallCounter || 0;
    state.updatedAt = new Date();
    await state.save();

    console.log(`💾 ${liftName}: ${logic === "STRENGTH_RPE" ? `1RM=${state.estimated1RM}kg` : `weight=${state.currentWeight}kg`}`);
    res.json({ message: "Progression applied", state });
  } catch (err) {
    console.error("Progression error:", err);
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

app.get("/api/1rm-history/:userId/:liftName", async (req, res) => {
  try {
    const { userId, liftName } = req.params;
    const sessions = await Session.find({ userId, liftName })
      .sort({ createdAt: 1 })
      .select("actualWeight repsCompleted actualRPE createdAt");
    const history = sessions.map(s => ({
      date: s.createdAt,
      estimated1RM: estimate1RM(s.actualWeight, s.repsCompleted, s.actualRPE)
    }));
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

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

app.get("/api/next-session/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const programName = req.query.program;
    if (!programName) return res.status(400).json({ error: "Missing program name" });

    const programData = loadProgram(programName);
    const sessions = programData.sessions;
    if (!sessions.length) return res.status(404).json({ error: "No sessions in program" });

    const lastSession = await Session.findOne({ userId, programName })
      .sort({ createdAt: -1 })
      .select("week day");

    let nextWeek, nextDay;

    if (!lastSession) {
      nextWeek = sessions[0].week;
      nextDay = sessions[0].day;
    } else {
      const lastIndex = sessions.findIndex(s => s.week === lastSession.week && s.day === lastSession.day);
      if (lastIndex !== -1 && lastIndex + 1 < sessions.length) {
        const next = sessions[lastIndex + 1];
        nextWeek = next.week;
        nextDay = next.day;
      } else {
        nextWeek = sessions[0].week;
        nextDay = sessions[0].day;
      }
    }

    res.json({ week: nextWeek, day: nextDay });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email) return res.status(400).json({ error: "Email required" });

  const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "kieren2203@googlemail.com";
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

  let isAdmin = false;
  if (email === ADMIN_EMAIL) {
    if (ADMIN_PASSWORD && password !== ADMIN_PASSWORD) {
      return res.status(401).json({ error: "Invalid admin password" });
    }
    isAdmin = true;
  }

  let user = await User.findOne({ email });
  if (!user) {
    user = await User.create({ email });
  }

  let purchasedPrograms = [];
  if (isAdmin) {
    purchasedPrograms = [
      "Ares Protocol", "Zeus Method", "Apollo Physique",
      "Hermes Engine", "Hephaestus Framework", "Poseidon Core",
      "Hercules Foundation"
    ];
  } else {
    const purchases = await Purchase.find({ email });
    purchasedPrograms = purchases.map(p => p.programName);
  }

  res.json({
    userId: user._id.toString(),
    email,
    purchasedPrograms,
    streak: user.streak || 0
  });
});

app.get("/api/streak/:userId", async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    res.json({ streak: user?.streak || 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/leads", async (req, res) => {
  const { email, source } = req.body;
  if (!email || !email.includes("@")) {
    return res.status(400).json({ error: "Valid email required" });
  }
  try {
    const lead = await Lead.findOneAndUpdate(
      { email },
      { email, source: source || "register_modal", updatedAt: new Date() },
      { upsert: true, new: true }
    );
    console.log(`📧 Lead captured: ${email}`);
    res.json({ message: "Lead saved", lead });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/admin/leads", async (req, res) => {
  const { adminEmail, adminPassword } = req.headers;
  const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "kieren2203@googlemail.com";
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
  
  if (adminEmail !== ADMIN_EMAIL) {
    return res.status(403).json({ error: "Not authorized" });
  }
  if (ADMIN_PASSWORD && adminPassword !== ADMIN_PASSWORD) {
    return res.status(403).json({ error: "Invalid admin password" });
  }
  
  const leads = await Lead.find().sort({ createdAt: -1 });
  res.json(leads);
});

app.get("/api/admin/leads/export", async (req, res) => {
  const { adminEmail, adminPassword } = req.headers;
  const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "kieren2203@googlemail.com";
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
  
  if (adminEmail !== ADMIN_EMAIL) {
    return res.status(403).json({ error: "Not authorized" });
  }
  if (ADMIN_PASSWORD && adminPassword !== ADMIN_PASSWORD) {
    return res.status(403).json({ error: "Invalid admin password" });
  }
  
  const leads = await Lead.find().sort({ createdAt: -1 });
  let csv = "email,source,createdAt\n";
  leads.forEach(l => {
    csv += `"${l.email}","${l.source}","${l.createdAt.toISOString()}"\n`;
  });
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=forge_leads.csv");
  res.send(csv);
});

app.post("/api/admin/assign-program", async (req, res) => {
  const { adminEmail, adminPassword, userEmail, programName } = req.body;
  
  const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "kieren2203@googlemail.com";
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
  
  if (adminEmail !== ADMIN_EMAIL) {
    return res.status(403).json({ error: "Not authorized" });
  }
  if (ADMIN_PASSWORD && adminPassword !== ADMIN_PASSWORD) {
    return res.status(403).json({ error: "Invalid admin password" });
  }
  if (!userEmail || !programName) {
    return res.status(400).json({ error: "Email and program name required" });
  }
  
  let user = await User.findOne({ email: userEmail });
  if (!user) {
    user = await User.create({ email: userEmail });
  }
  
  await Purchase.findOneAndUpdate(
    { email: userEmail, programName },
    { email: userEmail, programName, stripePaymentIntentId: `admin_${Date.now()}` },
    { upsert: true }
  );
  
  console.log(`✅ Admin assigned ${programName} to ${userEmail}`);
  res.json({ message: `Assigned ${programName} to ${userEmail}` });
});

// Serve React build
const distPath = path.join(__dirname, "frontend", "dist");
app.use(express.static(distPath));
app.get("*", (req, res) => res.sendFile(path.join(distPath, "index.html")));

// Global error handler (must be AFTER all routes)
app.use((err, req, res, next) => {
  console.error("Global error:", err);
  res.status(500).json({ error: err.message || "Internal server error" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));