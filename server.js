import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

/* =========================
   FIX __dirname (ES MODULE SAFE)
========================= */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* =========================
   DB CONNECTION
========================= */
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch(err => {
    console.error("MongoDB connection error:", err);
  });

/* =========================
   SCHEMAS
========================= */

const ProgramSchema = new mongoose.Schema({
  week: Number,
  day: Number,
  focus: String,
  exercises: [
    {
      liftName: String,
      role: String,
      sets: Number,
      reps: String,
      rpeTarget: Number
    }
  ]
});

const Program = mongoose.model("Program", ProgramSchema);

const LiftStateSchema = new mongoose.Schema({
  userId: String,
  lift: String,
  currentWeight: Number,
  consecutiveSuccesses: { type: Number, default: 0 },
  stallCounter: { type: Number, default: 0 },
  lastRPE: Number,
  lastCompleted: Boolean,
  updatedAt: { type: Date, default: Date.now }
});

const LiftState = mongoose.model("LiftState", LiftStateSchema);

const SessionSchema = new mongoose.Schema({
  userId: String,
  week: Number,
  day: Number,
  lift: String,
  targetRPE: Number,
  actualRPE: Number,
  completed: Boolean,
  actualWeight: Number,
  repsCompleted: Number,
  createdAt: { type: Date, default: Date.now }
});

const Session = mongoose.model("Session", SessionSchema);

/* =========================
   PROGRAM LOADER
========================= */

const programPath = path.join(__dirname, "data", "powerlifting-program.json");

const loadProgram = () => {
  return JSON.parse(fs.readFileSync(programPath, "utf-8"));
};

/* =========================
   PROGRESSION ENGINE
========================= */

function calculateProgression(state, session) {
  let nextWeight =
    typeof state.currentWeight === "number" && state.currentWeight > 0
      ? state.currentWeight
      : session.actualWeight || 0;

  let successStreak = state.consecutiveSuccesses || 0;
  let stallCounter = state.stallCounter || 0;

  const completed = session.completed === true;

  const targetRPE = session.targetRPE;
  const actualRPE = session.actualRPE;

  // ─────────────────────────────
  // 1. VALID RPE SIGNAL
  // ─────────────────────────────
  const hasRPE =
    typeof actualRPE === "number" &&
    typeof targetRPE === "number";

  const rpeDelta = hasRPE ? (targetRPE - actualRPE) : 0;

  // ─────────────────────────────
  // 2. PERFORMANCE QUALITY
  // ─────────────────────────────
  const isGoodSession =
    completed &&
    hasRPE &&
    actualRPE <= targetRPE + 0.5;

  const isOverreaching =
    hasRPE &&
    actualRPE > targetRPE + 1;

  // ─────────────────────────────
  // 3. PROGRESSION LOGIC (RPE-BASED)
  // ─────────────────────────────

  if (isGoodSession) {
    successStreak += 1;
    stallCounter = 0;

    // ONLY progress if consistently under target (true surplus capacity)
    if (successStreak >= 2 && rpeDelta >= 0.5) {
      nextWeight += getLoadIncrease(session.liftName);
      successStreak = 0;
    }

    return {
      nextWeight,
      consecutiveSuccesses: successStreak,
      stallCounter
    };
  }

  // ─────────────────────────────
  // 4. OVERREACH = FATIGUE RESPONSE
  // ─────────────────────────────
  if (isOverreaching) {
    successStreak = 0;
    stallCounter += 1;

    if (stallCounter >= 2) {
      nextWeight -= getLoadIncrease(session.liftName);
      stallCounter = 0;
    }

    return {
      nextWeight,
      consecutiveSuccesses: successStreak,
      stallCounter
    };
  }

  // ─────────────────────────────
  // 5. DEFAULT (neutral stimulus)
  // ─────────────────────────────
  return {
    nextWeight,
    consecutiveSuccesses: 0,
    stallCounter: stallCounter + 1
  };

  return {
    nextWeight,
    consecutiveSuccesses: successStreak,
    stallCounter
  };
}

function getLoadIncrease(liftName = "") {
  const name = liftName.toLowerCase();

  if (name.includes("squat")) return 5;
  if (name.includes("deadlift")) return 5;
  if (name.includes("bench")) return 2.5;

  return 2.5;
}

/* =========================
   ROUTES
========================= */

/**
 * GET PROGRAM (STATIC)
 */
app.get("/", (req, res) => {
  res.status(200).send("Forge of Olympus backend is live");
});
app.get("/api/program/:week/:day", (req, res) => {
  const week = Number(req.params.week);
  const day = Number(req.params.day);

  if (!Number.isFinite(week) || !Number.isFinite(day)) {
    return res.status(400).json({ error: "Invalid week/day" });
  }

  const program = loadProgram();

  const session = program.find(
    p => p.week === week && p.day === day
  );

  if (!session) {
    return res.status(404).json({ error: "Session not found" });
  }

  res.json(session);
});

/**
 * SESSION LOG (RAW DATA ONLY)
 */
app.post("/api/session-log", async (req, res) => {
  try {
    const {
      userId,
      week,
      day,
      liftName,
      completed,
      actualRPE,
      targetRPE,
      notes
    } = req.body;

    const log = await Session.create({
  userId,
  week,
  day,
  lift: liftName,
  completed: !!completed,
  actualRPE: actualRPE ?? null,
  targetRPE: targetRPE ?? null,
  actualWeight: req.body.actualWeight ?? null,
  notes: notes ?? ""
});

    res.json(log);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * APPLY PROGRESSION (STATE UPDATE)
 */
app.post("/api/progression/apply", async (req, res) => {
  try {
    const { userId, liftName } = req.body;

const state = await LiftState.findOne({ userId, lift: liftName });

const lastSession = await Session.findOne({
  userId,
  lift: liftName
}).sort({ createdAt: -1 });

if (!lastSession) {
  return res.status(400).json({ error: "No session data" });
}

// 🧠 CREATE STATE IF FIRST TIME
if (!state) {
  const newState = new LiftState({
    userId,
    lift: liftName,
    currentWeight: lastSession.actualWeight || 0,
    consecutiveSuccesses: 0,
    stallCounter: 0
  });

  await newState.save();

  return res.json({
    message: "Initial weight set",
    state: newState
  });
}

    const result = calculateProgression(state, {
  liftName,
  targetRPE: lastSession.targetRPE,
  actualRPE: lastSession.actualRPE,
  completed: lastSession.completed,
  actualWeight: lastSession.actualWeight
});

    state.currentWeight = result.nextWeight;
    state.consecutiveSuccesses = result.consecutiveSuccesses;
    state.stallCounter = result.stallCounter;
    state.updatedAt = new Date();

    await state.save();

    res.json({
      message: "Progression applied",
      state
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * LIFT STATE
 */
app.get("/api/lift-state/:userId", async (req, res) => {
  try {
    const state = await LiftState.find({ userId: req.params.userId });
    res.json(state);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * UNIFIED SESSION VIEW (FRONTEND CORE ENDPOINT)
 */
app.get("/api/session-view/:week/:day/:userId", async (req, res) => {
  try {
    const week = Number(req.params.week);
    const day = Number(req.params.day);
    const userId = req.params.userId;

    const program = loadProgram();

    if (!program) {
      return res.status(500).json({ error: "Program not loaded" });
    }

    const session = program.find(
      p => p.week === week && p.day === day
    );

    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    const logs = await Session.find({
      userId,
      week,
      day
    }).sort({ createdAt: -1 });

    const lastLog = logs[0] || null;

    const liftStates = await LiftState.find({ userId });

    const projected = (session.exercises || []).map(ex => {
      const state = liftStates.find(s => s.lift === ex.liftName);

      if (!state) {
        return {
          liftName: ex.liftName,
          role: ex.role,
          sets: ex.sets,
          reps: ex.reps,
          rpeTarget: ex.rpeTarget,
          currentWeight: 0,
          projectedNextWeight: 0,
          note: "No state yet"
        };
      }

      const simulated = calculateProgression(state, {
        liftName: ex.liftName,
        targetRPE: ex.rpeTarget,
        actualRPE: lastLog?.actualRPE ?? null,
        completed: lastLog?.completed ?? false
      });

      return {
        liftName: ex.liftName,
        role: ex.role,
        sets: ex.sets,
        reps: ex.reps,
        rpeTarget: ex.rpeTarget,
        currentWeight: state.currentWeight,
        projectedNextWeight: simulated?.nextWeight ?? state.currentWeight
      };
    });

    res.json({
      program: session,
      lastLog,
      projected
    });

  } catch (err) {
    console.error("SESSION VIEW ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * SESSION HISTORY (PER LIFT)
 */
app.get("/api/history/:userId/:liftName", async (req, res) => {
  try {
    const { userId, liftName } = req.params;

    const history = await Session.find({
      userId,
      lift: liftName
    })
      .sort({ createdAt: -1 })
      .limit(10);

    res.json(history);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* =========================
   START SERVER
========================= */

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});