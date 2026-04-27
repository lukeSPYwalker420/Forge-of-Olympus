import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import Stripe from "stripe";
import nodemailer from 'nodemailer';
import cron from 'node-cron';

dotenv.config();

const app = express();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-02-24.acacia",
});
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// ==================== Email Helper Functions ====================
async function sendCancellationEmail(email, programName) {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Your Forge of Olympus Subscription Has Ended",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #d4af37;">Your Journey Continues</h2>
        <p>Your subscription to <strong>${programName}</strong> has ended.</p>
        <p>You can still:</p>
        <ul>
          <li>✓ View your workout history</li>
          <li>✓ See your 1RM progression charts</li>
          <li>✓ Log workouts manually</li>
        </ul>
        <p>To get weight recommendations and adaptive progression again, simply <a href="https://forge-of-olympus.onrender.com" style="color: #d4af37;">resubscribe</a>.</p>
        <hr />
        <p style="font-size: 12px; color: #666;">Forge of Olympus – Train Without Guessing</p>
      </div>
    `
  };
  
  try {
    await transporter.sendMail(mailOptions);
    console.log(`📧 Cancellation email sent to ${email}`);
  } catch (err) {
    console.error(`Failed to send cancellation email: ${err.message}`);
  }
}

async function sendPaymentFailureEmail(email, programName, gracePeriodEnds) {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "⚠️ Payment Failed – Action Required",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #ffaa44;">Payment Failed</h2>
        <p>We couldn't process your payment for <strong>${programName}</strong>.</p>
        <p>You have until <strong>${gracePeriodEnds.toLocaleDateString()}</strong> to update your payment method.</p>
        <p>During this grace period, your training recommendations are hidden, but you can still log workouts.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://forge-of-olympus.onrender.com" style="background: #d4af37; color: #000; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">
            Update Payment Method
          </a>
        </div>
        <hr />
        <p style="font-size: 12px; color: #666;">Forge of Olympus – Train Without Guessing</p>
      </div>
    `
  };
  
  try {
    await transporter.sendMail(mailOptions);
    console.log(`📧 Payment failure email sent to ${email}`);
  } catch (err) {
    console.error(`Failed to send payment failure email: ${err.message}`);
  }
}

// Helper function to decode and normalize program names
function normalizeProgramName(encodedName) {
  try {
    let decoded = decodeURIComponent(encodedName);
    
    const validPrograms = [
      "Ares Protocol",
      "Apollo Physique", 
      "Hephaestus Framework",
      "Hercules Foundation",
      "Mark Training",       
      "Hercules Foundation - Pauline Version",
      "6-Week Wave Powerlifting" 
    ];
    
    const decodedLower = decoded.toLowerCase();
    for (const validName of validPrograms) {
      if (decodedLower.includes(validName.toLowerCase())) {
        console.log(`[NORMALIZE] "${decoded}" → "${validName}"`);
        return validName;
      }
    }
    
    const suffixesToRemove = [
      " – Strength Program", " – Strength", " – Power", " – Mobility",
      " – Hypertrophy Program", " – Hypertrophy",
      " - Strength Program", " - Strength", " - Power", " - Mobility",
      " - Hypertrophy Program", " - Hypertrophy",
      " Strength Program", " Strength", " Power", " Mobility",
      " Hypertrophy Program", " Hypertrophy"
    ];
    
    for (const suffix of suffixesToRemove) {
      if (decoded.includes(suffix)) {
        decoded = decoded.replace(suffix, '');
        break;
      }
    }
    
    return decoded.trim();
  } catch (e) {
    console.error(`[NORMALIZE ERROR] ${encodedName}:`, e);
    return encodedName;
  }
}

// Helper function to convert program name to filename (spaces to hyphens)
function programNameToFilename(programName) {
  return programName.replace(/\s+/g, '-');
}

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
const Session = mongoose.model("Session", SessionSchema);

const PurchaseSchema = new mongoose.Schema({
  email: { type: String, required: true },
  programName: { type: String, required: true },
  stripePaymentIntentId: { type: String, unique: true, sparse: true },
  stripeSubscriptionId: { type: String, unique: true, sparse: true },
  active: { type: Boolean, default: true },
  purchasedAt: { type: Date, default: Date.now },
  canceledAt: { type: Date },
  lastPaymentFailure: { type: Date },
  gracePeriodEnds: { type: Date }
});
const Purchase = mongoose.model("Purchase", PurchaseSchema);

const UserSchema = new mongoose.Schema({
  email: { type: String, unique: true },
  streak: { type: Number, default: 0 },
  lastWorkoutDate: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
  manualPremium: { type: Boolean, default: false }
});
const User = mongoose.model("User", UserSchema);

const LeadSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  source: { type: String, default: "register_modal" },
  createdAt: { type: Date, default: Date.now }
});
const Lead = mongoose.model("Lead", LeadSchema);

const StreakRewardSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  streakDays: { type: Number, required: true },
  rewardsUnlocked: [{
    rewardId: String,
    unlockedAt: { type: Date, default: Date.now }
  }],
  lastRewardCheck: { type: Date, default: Date.now }
});
const StreakReward = mongoose.model("StreakReward", StreakRewardSchema);

const streakMilestones = [
  { days: 3, rewardId: "motivation_quote", name: "Daily Motivation Quote", description: "Get a new motivational quote each day", type: "feature" },
  { days: 7, rewardId: "workout_summary", name: "Advanced Workout Stats", description: "View detailed workout summaries", type: "feature" },
  { days: 14, rewardId: "accessory_swap_1", name: "Accessory Swap", description: "Swap 1 accessory exercise per workout", type: "feature", swapsAllowed: 1 },
  { days: 21, rewardId: "social_share_image", name: "Share Workout Image", description: "Share your workout as an image", type: "feature" },
  { days: 30, rewardId: "coaching_discount_10", name: "10% Off Coaching", description: "10% discount on coaching add-on", type: "discount", discountPercent: 10 },
  { days: 45, rewardId: "accessory_swap_2", name: "Accessory Swap (2 exercises)", description: "Swap 2 accessory exercises per workout", type: "feature", swapsAllowed: 2 },
  { days: 60, rewardId: "bronze_badge", name: "Bronze Warrior Badge", description: "Bronze profile badge", type: "badge", badgeTier: "bronze" },
  { days: 90, rewardId: "coaching_discount_20", name: "20% Off Coaching", description: "20% discount on coaching add-on", type: "discount", discountPercent: 20 },
  { days: 100, rewardId: "free_coaching_month", name: "Free Coaching Month", description: "One free month of coaching", type: "free" }
];

// ==================== IMPORTANT: Webhook must be BEFORE express.json() ====================
app.post("/api/stripe-webhook", express.raw({ type: "application/json" }), async (req, res) => {
  const sig = req.headers["stripe-signature"];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
  let event;

  if (!endpointSecret) {
    console.error("⚠️ STRIPE_WEBHOOK_SECRET not set");
    return res.status(500).send("Webhook secret not configured");
  }

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error(`Webhook signature failed: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    let customerEmail = session.customer_details?.email || session.customer_email || session.metadata?.userEmail;

    if (customerEmail) {
      customerEmail = customerEmail.toLowerCase().trim();
    }
    
    if (!customerEmail) {
      console.error("No email found in session:", session.id);
      return res.status(400).send("No email");
    }

    try {
      const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
      const rawProgramName = lineItems.data[0]?.description || session.metadata?.programName || "Unknown Program";
      const normalizedProgramName = normalizeProgramName(rawProgramName);

      console.log(`[WEBHOOK] Purchase: "${rawProgramName}" → "${normalizedProgramName}"`);

      let user = await User.findOne({ email: customerEmail });
      if (!user) {
        user = await User.create({ email: customerEmail });
        console.log(`📝 Created new user: ${customerEmail}`);
      }

      await Purchase.findOneAndUpdate(
        { stripePaymentIntentId: session.payment_intent },
        { 
          email: customerEmail, 
          programName: normalizedProgramName, 
          stripePaymentIntentId: session.payment_intent,
          stripeSubscriptionId: session.subscription,
          active: true,
          purchasedAt: new Date(),
          canceledAt: null,
          lastPaymentFailure: null,
          gracePeriodEnds: null
        },
        { upsert: true, new: true }
      );
      
      console.log(`✅ Purchase recorded: ${customerEmail} → ${normalizedProgramName}`);
      
    } catch (dbError) {
      console.error("Database error in webhook:", dbError);
      return res.status(500).send("Database error");
    }
  }

  if (event.type === "customer.subscription.deleted") {
    const subscription = event.data.object;
    const subscriptionId = subscription.id;
    
    const purchase = await Purchase.findOneAndUpdate(
      { stripeSubscriptionId: subscriptionId },
      { active: false, canceledAt: new Date() }
    );
    
    if (purchase) {
      console.log(`❌ Subscription cancelled for ${purchase.email}`);
      await sendCancellationEmail(purchase.email, purchase.programName);
    }
  }
  
  if (event.type === "invoice.payment_failed") {
    const invoice = event.data.object;
    const subscriptionId = invoice.subscription;
    
    const purchase = await Purchase.findOne({ stripeSubscriptionId: subscriptionId });
    if (purchase) {
      const gracePeriodEnds = new Date();
      gracePeriodEnds.setDate(gracePeriodEnds.getDate() + 7);
      
      await Purchase.updateOne(
        { stripeSubscriptionId: subscriptionId },
        { 
          lastPaymentFailure: new Date(),
          gracePeriodEnds: gracePeriodEnds,
          active: false
        }
      );
      
      console.log(`⚠️ Payment failed for ${purchase.email}, grace until ${gracePeriodEnds}`);
      await sendPaymentFailureEmail(purchase.email, purchase.programName, gracePeriodEnds);
    }
  }
  
  if (event.type === "invoice.paid") {
    const invoice = event.data.object;
    const subscriptionId = invoice.subscription;
    
    const result = await Purchase.findOneAndUpdate(
      { stripeSubscriptionId: subscriptionId },
      { 
        active: true, 
        lastPaymentFailure: null,
        gracePeriodEnds: null,
        canceledAt: null
      }
    );
    if (result) {
      console.log(`✅ Payment received, subscription ${subscriptionId} reactivated`);
    }
  }

  res.json({ received: true });
});

// ==================== Normal middleware AFTER webhook ====================
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// MongoDB connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.error("MongoDB error:", err));

// ==================== Program Loader Functions ====================
const findProgramFile = (programName) => {
  const dataDir = path.join(__dirname, "data");
  if (!fs.existsSync(dataDir)) {
    console.error(`Data directory not found: ${dataDir}`);
    return null;
  }
  
  const files = fs.readdirSync(dataDir);
  const normalizedSearch = programName.toLowerCase().replace(/[\s\-]/g, '');
  
  console.log(`[FIND] Looking for program: "${programName}" (normalized: "${normalizedSearch}")`);
  console.log(`[FIND] Available files: ${files.join(', ')}`);
  
  for (const file of files) {
    if (file.endsWith('.json')) {
      const fileNameWithoutExt = file.replace('.json', '');
      const normalizedFile = fileNameWithoutExt.toLowerCase().replace(/[\s\-]/g, '');
      
      if (normalizedFile === normalizedSearch) {
        const foundPath = path.join(dataDir, file);
        console.log(`[FIND] Matched: "${file}" → "${foundPath}"`);
        return foundPath;
      }
    }
  }
  
  console.log(`[FIND] No match found for "${programName}"`);
  return null;
};

const loadProgram = (programName) => {
  let filePath = findProgramFile(programName);
  if (!filePath) {
    const hyphenatedName = programNameToFilename(programName);
    filePath = path.join(__dirname, "data", `${hyphenatedName}.json`);
  }
  if (!filePath || !fs.existsSync(filePath)) {
    const asIsPath = path.join(__dirname, "data", `${programName}.json`);
    if (fs.existsSync(asIsPath)) filePath = asIsPath;
  }
  if (!filePath || !fs.existsSync(filePath)) {
    throw new Error(`Program file not found: ${programName}`);
  }

  const raw = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  
  // Build sessions array (existing format)
  let sessions = [];
  let weeksMetadata = null;
  
  if (raw.sessions && Array.isArray(raw.sessions)) {
    sessions = raw.sessions;
    weeksMetadata = raw.weeks || null;
  } else if (Array.isArray(raw)) {
    sessions = raw;
  } else {
    throw new Error(`Invalid program format`);
  }
  
  return { 
    name: raw.name, 
    logic: raw.logic || "STRENGTH_RPE", 
    sessions,
    weeks: weeksMetadata   // <-- store weeks metadata
  };
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
// ==================== Robust Progression Logic ====================

/**
 * STRENGTH_RPE progression (for Ares Protocol)
 * - Good session: 1RM increases if fresh estimate is higher (never decreases)
 * - Bad session: 1RM decreases by 2% (reflects regression), never increases
 */
function strengthRPEProgression(state, sessionData) {
  let new1RM = state.estimated1RM || 0;
  const completed = !!sessionData.completed;
  const repsPerSet = sessionData.repsPerSet || [];
  const targetReps = parseInt(sessionData.targetReps, 10);
  const targetSets = sessionData.targetSets || 1;

  // Guard: no valid data → no change
  if (!completed || !sessionData.actualWeight || !repsPerSet.length || !sessionData.actualRPE) {
    console.log(`⚠️ [STRENGTH] Incomplete data for ${sessionData.liftName}, skipping update`);
    return { estimated1RM: new1RM };
  }

  const bestReps = Math.max(...repsPerSet);
  const fresh1RM = estimate1RM(sessionData.actualWeight, bestReps, sessionData.actualRPE);

  const allSetsCompleted = repsPerSet.length === targetSets && repsPerSet.every(r => r >= targetReps);
  const rpeOk = sessionData.actualRPE <= (sessionData.targetRPE || 7) + 0.5;
  const isGoodSession = allSetsCompleted && rpeOk;

  if (isGoodSession) {
    // Good session: 1RM only goes up
    if (fresh1RM > new1RM) {
      new1RM = fresh1RM;
      console.log(`📈 [STRENGTH] Good session ${sessionData.liftName}: 1RM ↑ ${state.estimated1RM || '?'} → ${new1RM}`);
    } else {
      console.log(`✅ [STRENGTH] Good session ${sessionData.liftName}: 1RM unchanged (${new1RM})`);
    }
  } else {
    // Bad session: never increase, optionally decrease by 2%
    if (new1RM > 0) {
      const decreased = Math.round(new1RM * 0.98);
      if (decreased < new1RM) {
        new1RM = decreased;
        console.log(`⚠️ [STRENGTH] Bad session ${sessionData.liftName}: 1RM ↓ to ${new1RM}`);
      }
    } else {
      console.log(`⚠️ [STRENGTH] Bad session ${sessionData.liftName}: 1RM unchanged (no prior 1RM)`);
    }
  }

  return { estimated1RM: Math.round(new1RM) };
}

/**
 * HYPERTROPHY_VOLUME progression (for Apollo Physique)
 * - Good session: increases weight after lastReps reaches maxReps
 * - Bad session: after 3 stalls, decreases weight
 */
function hypertrophyVolumeProgression(state, sessionData) {
  let newWeight = state.currentWeight || sessionData.actualWeight || 0;
  let lastReps = state.lastRepsAchieved || 0;
  let successStreak = state.consecutiveSuccesses || 0;
  let stallCounter = state.stallCounter || 0;

  const completed = !!sessionData.completed;
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
  const actualReps = Math.max(...repsPerSet);
  const targetRIR = sessionData.targetRIR || 2;
  const actualRIR = sessionData.actualRIR;
  const hasRIR = typeof actualRIR === 'number';
  const rirGood = hasRIR && actualRIR <= targetRIR - 1;
  const isGoodSession = completed && allSetsCompleted && rirGood;

  if (isGoodSession) {
    if (actualReps > lastReps && actualReps <= maxReps) lastReps = actualReps;
    successStreak += 1;
    stallCounter = 0;
    if (lastReps >= maxReps) {
      const inc = (sessionData.liftName?.toLowerCase().includes("squat") || sessionData.liftName?.toLowerCase().includes("deadlift")) ? 5 : 2.5;
      newWeight += inc;
      lastReps = minReps;
      successStreak = 0;
      console.log(`📈 [HYPERTROPHY] Good session ${sessionData.liftName}: weight ↑ to ${newWeight}kg`);
    }
  } else {
    successStreak = 0;
    stallCounter += 1;
    if (stallCounter >= 3 && newWeight > 0) {
      const dec = (sessionData.liftName?.toLowerCase().includes("squat") || sessionData.liftName?.toLowerCase().includes("deadlift")) ? 5 : 2.5;
      newWeight = Math.max(0, newWeight - dec);
      stallCounter = 0;
      lastReps = minReps;
      console.log(`⚠️ [HYPERTROPHY] 3 bad sessions ${sessionData.liftName}: weight ↓ to ${newWeight}kg`);
    }
  }

  return {
    currentWeight: Math.round(newWeight),
    lastRepsAchieved: lastReps,
    consecutiveSuccesses: successStreak,
    stallCounter
  };
}

/**
 * EXPLOSIVE_POWER progression – placeholder, no auto‑adjustment
 */
function explosivePowerProgression(state, sessionData) {
  return { currentWeight: state.currentWeight, consecutiveSuccesses: 0, stallCounter: 0 };
}

/**
 * ENDURANCE_DENSITY progression – placeholder
 */
function enduranceDensityProgression(state, sessionData) {
  return { currentWeight: state.currentWeight, consecutiveSuccesses: 0, stallCounter: 0 };
}

/**
 * MOBILITY progression (for Hephaestus Framework)
 * - Good session: after 3 consecutive good sessions, increase weight by 2.5kg
 * - Bad session: after 2 consecutive bad sessions, decrease weight by 2.5kg
 */
function mobilityRangeProgression(state, sessionData) {
  let newWeight = state.currentWeight || sessionData.actualWeight || 0;
  let successStreak = state.consecutiveSuccesses || 0;
  let stallCounter = state.stallCounter || 0;

  const completed = !!sessionData.completed;
  const actualStability = sessionData.actualStability || 0;
  const targetStability = sessionData.targetStability || 7;
  const stabilityMet = actualStability >= targetStability;
  const actualPain = sessionData.actualPain || 0;
  const targetPain = sessionData.targetPain || 4;
  const painOk = actualPain <= targetPain;
  const isGoodSession = completed && stabilityMet && painOk;

  if (isGoodSession) {
    successStreak += 1;
    stallCounter = 0;
    if (successStreak >= 3) {
      newWeight += 2.5;
      successStreak = 0;
      console.log(`💪 [MOBILITY] Good streak ${sessionData.liftName}: weight ↑ to ${newWeight}kg`);
    }
  } else {
    successStreak = 0;
    stallCounter += 1;
    if (stallCounter >= 2 && newWeight > 0) {
      newWeight = Math.max(0, newWeight - 2.5);
      stallCounter = 0;
      console.log(`⚠️ [MOBILITY] Bad streak ${sessionData.liftName}: weight ↓ to ${newWeight}kg`);
    }
  }

  return {
    currentWeight: Math.round(newWeight * 2) / 2,
    consecutiveSuccesses: successStreak,
    stallCounter,
    lastROM: state.lastROM  // unchanged
  };
}

/**
 * GENERAL_FITNESS_HYBRID progression (for Hercules Foundation, Mark Training, etc.)
 * Supports multiple progression types: strength, power, mobility, volume/stability, deload
 */
function generalFitnessProgression(state, sessionData) {
  let newWeight = state.currentWeight || sessionData.actualWeight || 0;
  let newROM = state.lastROM || sessionData.actualROM || 0;
  let successStreak = state.consecutiveSuccesses || 0;
  let stallCounter = state.stallCounter || 0;
  const completed = !!sessionData.completed;
  const progressionType = sessionData.progressionType || "strength";

  // Helper to increment weight (5kg for squat/deadlift, else 2.5kg)
  const getIncrement = (liftName) => (liftName?.toLowerCase().includes("squat") || liftName?.toLowerCase().includes("deadlift")) ? 5 : 2.5;
  const getDecrement = (liftName) => (liftName?.toLowerCase().includes("squat") || liftName?.toLowerCase().includes("deadlift")) ? 5 : 2.5;

  switch (progressionType) {
    case "strength":
      const targetReps = parseInt(sessionData.targetReps, 10);
      const actualReps = sessionData.repsCompleted || 0;
      const repsMet = !isNaN(targetReps) && actualReps >= targetReps;
      const rpeOk = sessionData.actualRPE <= (sessionData.targetRPE || 7) + 1;
      const isGoodStrength = completed && repsMet && rpeOk;

      if (isGoodStrength) {
        successStreak++;
        stallCounter = 0;
        if (successStreak >= 3) {
          newWeight += getIncrement(sessionData.liftName);
          successStreak = 0;
          console.log(`📈 [GF-strength] Good streak ${sessionData.liftName}: weight ↑ to ${newWeight}kg`);
        }
      } else {
        successStreak = 0;
        stallCounter++;
        if (stallCounter >= 2 && newWeight > 0) {
          newWeight = Math.max(0, newWeight - getDecrement(sessionData.liftName));
          stallCounter = 0;
          console.log(`⚠️ [GF-strength] Bad streak ${sessionData.liftName}: weight ↓ to ${newWeight}kg`);
        }
      }
      break;

    case "power":
      const qualityOk = (sessionData.actualQuality || 0) >= (sessionData.targetQuality || 7);
      const isGoodPower = completed && qualityOk;
      if (isGoodPower) {
        successStreak++;
        if (successStreak >= 2) {
          newWeight += 2.5;
          successStreak = 0;
          console.log(`📈 [GF-power] Good streak ${sessionData.liftName}: weight ↑ to ${newWeight}kg`);
        }
      } else {
        successStreak = 0;
        // no auto‑decrease for power, just reset streak
      }
      break;

    case "mobility":
      const romMet = (sessionData.actualROM || 0) >= (sessionData.targetROM || 0);
      const painOkMob = (sessionData.actualPain || 0) <= (sessionData.targetPain || 2);
      const isGoodMobility = completed && romMet && painOkMob;
      if (isGoodMobility) {
        successStreak++;
        if (successStreak >= 2) {
          newROM += 5;
          successStreak = 0;
          console.log(`📈 [GF-mobility] Good streak ${sessionData.liftName}: ROM ↑ to ${newROM}%`);
        }
      } else {
        successStreak = 0;
      }
      break;

    case "volume":
    case "stability":
      const targetVolReps = parseInt(sessionData.targetReps, 10);
      const actualVolReps = sessionData.repsCompleted || 0;
      const repsMetVol = !isNaN(targetVolReps) && actualVolReps >= targetVolReps;
      const isGoodVolume = completed && repsMetVol;
      if (isGoodVolume) {
        successStreak++;
        if (successStreak >= 3) {
          // volume progress does not change weight, just records success
          successStreak = 0;
          console.log(`✅ [GF-volume] Good session ${sessionData.liftName}`);
        }
      } else {
        successStreak = 0;
      }
      break;

    case "deload":
      // Deload weeks do nothing
      break;

    default:
      console.warn(`⚠️ Unknown progression type ${progressionType} in generalFitnessProgression`);
  }

  return {
    currentWeight: Math.round(newWeight),
    lastROM: Math.round(newROM),
    consecutiveSuccesses: successStreak,
    stallCounter
  };
}

/**
 * Main dispatcher – selects the correct progression function based on program logic
 */
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
      console.warn(`⚠️ Unknown logic "${logic}", falling back to STRENGTH_RPE`);
      return strengthRPEProgression(state, sessionData);
  }
}

// ==================== API Routes ====================

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: Date.now() });
});

app.get("/api/debug/programs", (req, res) => {
  const dataDir = path.join(__dirname, "data");
  if (!fs.existsSync(dataDir)) {
    return res.json({ error: "Data directory not found", path: dataDir });
  }
  
  const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.json'));
  const programs = files.map(file => {
    const filePath = path.join(dataDir, file);
    try {
      const raw = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      return {
        filename: file,
        name: raw.name || file.replace('.json', ''),
        logic: raw.logic || "unknown"
      };
    } catch (e) {
      return { filename: file, name: file.replace('.json', ''), error: e.message };
    }
  });
  
  res.json({ 
    dataDir, 
    filesExist: files.length,
    programs,
    expectedMappings: {
      "Ares Protocol": "Ares-Protocol.json",
      "Apollo Physique": "Apollo-Physique.json",
      "Hephaestus Framework": "Hephaestus-Framework.json",
      "Hercules Foundation": "Hercules-Foundation.json"
    }
  });
});

/**
 * Find week metadata for a given week number
 */
function getWeekMetadata(weeks, weekNumber) {
  if (!weeks) return null;
  return weeks.find(w => w.week === weekNumber);
}

/**
 * Apply volume modifier (reduce sets and reps)
 */
function applyVolumeModifier(exercise, volumeModifier) {
  if (!volumeModifier || volumeModifier === 1.0) return exercise;
  const newSets = Math.max(1, Math.round((exercise.sets || 3) * volumeModifier));
  let newReps = exercise.reps;
  if (typeof newReps === 'string' && newReps.includes('-')) {
    const [min, max] = newReps.split('-').map(Number);
    const newMin = Math.max(1, Math.round(min * volumeModifier));
    const newMax = Math.max(1, Math.round(max * volumeModifier));
    newReps = `${newMin}-${newMax}`;
  } else {
    const numReps = parseInt(newReps, 10);
    if (!isNaN(numReps)) newReps = Math.max(1, Math.round(numReps * volumeModifier)).toString();
  }
  return { ...exercise, sets: newSets, reps: newReps };
}

/**
 * Apply rep drop (reduce reps by a fixed amount)
 */
function applyRepDrop(exercise, repDropAmount = 1) {
  if (!repDropAmount) return exercise;
  let newReps = exercise.reps;
  if (typeof newReps === 'string' && newReps.includes('-')) {
    let [min, max] = newReps.split('-').map(Number);
    min = Math.max(1, min - repDropAmount);
    max = Math.max(1, max - repDropAmount);
    newReps = `${min}-${max}`;
  } else {
    let numReps = parseInt(newReps, 10);
    if (!isNaN(numReps)) newReps = Math.max(1, numReps - repDropAmount).toString();
  }
  return { ...exercise, reps: newReps };
}

/**
 * Apply descending back-off sets – generate multiple entries for the same lift with decreasing RPE
 * This modifies the exercise list: one exercise becomes multiple (e.g., "Squat Back Offs" with descending RPE)
 */
function applyDescendingSets(exercises, descendingFlag, weekRpe) {
  if (!descendingFlag) return exercises;
  const newExercises = [];
  for (const ex of exercises) {
    if (ex.descending === true) {
      const sets = ex.sets || 3;
      const baseRPE = ex.rpeTarget !== undefined ? ex.rpeTarget : weekRpe;
      const dropPerSet = 0.5;
      for (let i = 0; i < sets; i++) {
        const newEx = { ...ex, sets: 1 };
        newEx.rpeTarget = Math.max(5, baseRPE - (i * dropPerSet));
        newEx.liftName = `${ex.liftName} (Set ${i + 1})`;
        newEx._descendingSet = true;   // ← new flag
        newExercises.push(newEx);
      }
    } else {
      newExercises.push(ex);
    }
  }
  return newExercises;
}

app.get("/api/session-view/:week/:day/:userId", async (req, res) => {
  try {
    const week = Number(req.params.week);
    const day = Number(req.params.day);
    const userId = req.params.userId;
    let programName = req.query.program;
    
    const rpeAdjustment = Number(req.query.rpeAdjustment) || 0;
    const rirAdjustment = Number(req.query.rirAdjustment) || 0;
    const qualityAdjustment = Number(req.query.qualityAdjustment) || 0;
    
    if (!programName) return res.status(400).json({ error: "Missing program name" });

    programName = normalizeProgramName(programName);
    const programData = loadProgram(programName);
    let session = programData.sessions.find(p => p.week === week && p.day === day);
    if (!session) return res.status(404).json({ error: "Session not found" });

    // Define weekMeta and exercises BEFORE any use
    const weekMeta = getWeekMetadata(programData.weeks, week);
    let exercises = session.exercises || [];

    // Apply volume modifier
    if (weekMeta?.volumeModifier && weekMeta.volumeModifier !== 1.0) {
      exercises = exercises.map(ex => applyVolumeModifier(ex, weekMeta.volumeModifier));
    }
    // Remove back-off sets if specified
    if (weekMeta?.adjustments?.backOffSets) {
      const removeCount = weekMeta.adjustments.backOffSets;
      exercises = exercises.map(ex => {
        if (ex.role === "back-off") {
          if (removeCount < 0) {
            const newSets = Math.max(1, (ex.sets || 3) + removeCount);
            return { ...ex, sets: newSets };
          }
          return ex;
        }
        return ex;
      });
    }
    // Apply rep drop
    if (weekMeta?.adjustments?.repDrop === true) {
      const dropAmount = weekMeta.adjustments.repDropAmount || 1;
      exercises = exercises.map(ex => applyRepDrop(ex, dropAmount));
    }
    // Week-level RPE override
    if (weekMeta?.rpe) {
      exercises = exercises.map(ex => {
        if (ex.rpeTarget === undefined) {
          return { ...ex, rpeTarget: weekMeta.rpe };
        }
        return ex;
      });
    }
    
    // ✅ APPLY DESCENDING SETS (now always runs for any exercise with descending:true)
    exercises = applyDescendingSets(exercises, true, weekMeta?.rpe || 7);

    // Now rebuild the session with adjusted exercises
    const adjustedSession = { ...session, exercises };

    // Rest of the route remains unchanged …
    const availableWeeks = [...new Set(programData.sessions.map(s => s.week))].sort((a,b)=>a-b);
    const availableDaysPerWeek = {};
    availableWeeks.forEach(w => {
      availableDaysPerWeek[w] = [...new Set(programData.sessions.filter(s => s.week === w).map(s => s.day))].sort((a,b)=>a-b);
    });

    const logic = programData.logic || "STRENGTH_RPE";
    const liftStates = await LiftState.find({ userId });

    const projected = adjustedSession.exercises.map(ex => {
      const state = liftStates.find(s => s.liftName === ex.liftName);
      let currentWeight = 0;
      let projectedNextWeight = 0;
      let adjustedRpeTarget = ex.rpeTarget;
      let adjustedRirTarget = ex.rirTarget;
      let adjustedQualityTarget = ex.qualityTarget;
      let adjustedStabilityTarget = ex.stabilityTarget;

      if (rpeAdjustment !== 0 && (ex.progressionType === "strength" || logic === "STRENGTH_RPE")) {
        adjustedRpeTarget = Math.min(10, Math.max(1, (ex.rpeTarget || 7) + rpeAdjustment));
      }
      if (rirAdjustment !== 0 && (ex.progressionType === "volume" || logic === "HYPERTROPHY_VOLUME")) {
        adjustedRirTarget = Math.min(5, Math.max(0, (ex.rirTarget || 2) + rirAdjustment));
      }
      if (qualityAdjustment !== 0 && ex.progressionType === "power") {
        adjustedQualityTarget = Math.min(10, Math.max(1, (ex.qualityTarget || 7) + qualityAdjustment));
      }
      if (ex.progressionType === "mobility" || ex.progressionType === "stability") {
        const avgAdjustment = (rpeAdjustment + rirAdjustment) / 2;
        if (avgAdjustment !== 0) {
          adjustedStabilityTarget = Math.min(10, Math.max(1, (ex.stabilityTarget || 7) + avgAdjustment));
        }
      }

      if (state) {
        if (logic === "STRENGTH_RPE" && state.estimated1RM > 0) {
          currentWeight = weightForRPE(state.estimated1RM, adjustedRpeTarget, ex.reps);
          projectedNextWeight = weightForRPE(state.estimated1RM, adjustedRpeTarget + 0.5, ex.reps);
        } 
        else if ((logic === "GENERAL_FITNESS_HYBRID" || logic === "HYPERTROPHY_VOLUME") && state.currentWeight > 0) {
          currentWeight = state.currentWeight;
          let weightModifier = 1;
          if (rirAdjustment !== 0) weightModifier *= (rirAdjustment === 1 ? 0.92 : rirAdjustment === -1 ? 1.08 : 1);
          if (rpeAdjustment !== 0) weightModifier *= (1 + (rpeAdjustment * 0.05));
          if (weightModifier !== 1) currentWeight = Math.round(currentWeight * weightModifier / 2.5) * 2.5;
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
        stabilityTarget: ex.stabilityTarget,
        qualityTarget: ex.qualityTarget,
        progressionType: ex.progressionType,
        currentWeight,
        projectedNextWeight,
        adjustedRpeTarget: adjustedRpeTarget !== ex.rpeTarget ? adjustedRpeTarget : null,
        adjustedRirTarget: adjustedRirTarget !== ex.rirTarget ? adjustedRirTarget : null,
        adjustedQualityTarget: adjustedQualityTarget !== ex.qualityTarget ? adjustedQualityTarget : null,
        adjustedStabilityTarget: adjustedStabilityTarget !== ex.stabilityTarget ? adjustedStabilityTarget : null,
        descendingSet: ex._descendingSet || false
      };
    });

    res.json({ program: adjustedSession, logic, projected, availableWeeks, availableDaysPerWeek, readinessApplied: { rpeAdjustment, rirAdjustment, qualityAdjustment } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/session-log", async (req, res) => {
  try {
    const log = await Session.create(req.body);
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
        let bestReps = null;
        if (lastSession.repsPerSet && lastSession.repsPerSet.length) {
          bestReps = Math.max(...lastSession.repsPerSet);
        } else {
          bestReps = lastSession.repsCompleted;
        }
        const initial1RM = estimate1RM(lastSession.actualWeight, bestReps, lastSession.actualRPE);
        initialState.estimated1RM = initial1RM;
        initialState.currentWeight = 0;
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
      .select("actualWeight repsCompleted repsPerSet actualRPE createdAt");

    const history = sessions.map(s => {
      let reps = null;
      if (s.repsPerSet && s.repsPerSet.length) {
        reps = Math.max(...s.repsPerSet);
      } else {
        reps = s.repsCompleted;
      }
      if (!s.actualWeight || !reps || !s.actualRPE) return null;
      return {
        date: s.createdAt,
        estimated1RM: estimate1RM(s.actualWeight, reps, s.actualRPE)
      };
    }).filter(h => h !== null);
    
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
    const limit = parseInt(req.query.limit) || 20;
    const sessions = await Session.find({ userId }).sort({ createdAt: -1 }).limit(limit);
    res.json(sessions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/next-session/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    let programName = req.query.program;
    if (!programName) return res.status(400).json({ error: "Missing program name" });

    programName = normalizeProgramName(programName);

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
  let { email, password } = req.body;
  if (!email) return res.status(400).json({ error: "Email required" });

  email = email.toLowerCase().trim();

  const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "kieren2203@googlemail.com";
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

  let isAdmin = false;
  if (email === ADMIN_EMAIL) {
    if (ADMIN_PASSWORD) {
      if (!password || password !== ADMIN_PASSWORD) {
        return res.status(401).json({ error: "Invalid admin password" });
      }
    }
    isAdmin = true;
  }

  let user = await User.findOne({ email });
  if (!user) {
    user = await User.create({ email });
  }

  let purchasedPrograms = [];
  let hasActiveSubscription = false;
  
  if (isAdmin) {
    purchasedPrograms = [
      "Ares Protocol", "Apollo Physique",
      "Hephaestus Framework", "Hercules Foundation",
      "Mark Training", "Hercules Foundation - Pauline Version",
      "6-Week Wave Powerlifting"
    ];
    hasActiveSubscription = true;
  } else {
    const activePurchases = await Purchase.find({ email, active: true });
    purchasedPrograms = activePurchases.map(p => p.programName);
    hasActiveSubscription = activePurchases.length > 0 || user.manualPremium === true;
  }

  res.json({
    userId: user._id.toString(),
    email,
    purchasedPrograms,
    streak: user.streak || 0,
    hasActiveSubscription
  });
});

app.post("/api/send-cheatsheet", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email required" });
  const pdfUrl = "https://forge-of-olympus.onrender.com/RPE-Cheat-Sheet.pdf";
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Your RPE Cheat Sheet & Free Trial",
    html: `<p>Thanks for joining the Forge.</p>
           <p>Download your RPE Cheat Sheet: <a href="${pdfUrl}">Click here</a></p>
           <p>Start your 30‑day free trial now: <a href="https://forge-of-olympus.onrender.com">Start Free Trial</a></p>`
  };
  try {
    await transporter.sendMail(mailOptions);
    res.json({ message: "Cheat sheet sent" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
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
  const { adminemail } = req.headers;
  const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "kieren2203@googlemail.com";
  
  if (adminemail !== ADMIN_EMAIL) {
    return res.status(403).json({ error: "Not authorized" });
  }
  
  const leads = await Lead.find().sort({ createdAt: -1 });
  res.json(leads);
});

app.get("/api/admin/leads/export", async (req, res) => {
  const { adminemail } = req.headers;
  const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "kieren2203@googlemail.com";
  
  if (adminemail !== ADMIN_EMAIL) {
    return res.status(403).json({ error: "Not authorized" });
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
  const { adminEmail, userEmail, programName } = req.body;

  const normalizedAdminEmail = adminEmail.toLowerCase().trim();
  const normalizedUserEmail = userEmail.toLowerCase().trim();
  
  const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "kieren2203@googlemail.com";
  
  if (normalizedAdminEmail !== ADMIN_EMAIL) {
    return res.status(403).json({ error: "Not authorized" });
  }
  if (!userEmail || !programName) {
    return res.status(400).json({ error: "Email and program name required" });
  }
  
  let user = await User.findOne({ email: normalizedUserEmail });
  if (!user) {
    user = await User.create({ email: normalizedUserEmail });
  }
  
  await Purchase.findOneAndUpdate(
    { email: normalizedUserEmail, programName },
    { 
      email: normalizedUserEmail, 
      programName, 
      stripePaymentIntentId: `admin_${Date.now()}`,
      active: true,
      purchasedAt: new Date(),
      canceledAt: null,
      lastPaymentFailure: null,
      gracePeriodEnds: null
    },
    { upsert: true }
  );
  
  console.log(`✅ Admin assigned ${programName} to ${normalizedUserEmail}`);
  res.json({ message: `Assigned ${programName} to ${normalizedUserEmail}` });
});

app.post("/api/create-checkout-session", async (req, res) => {
  try {
    let { programName, email } = req.body;
    
    if (email) {
      email = email.toLowerCase().trim();
    }

    console.log(`[DEBUG] Creating checkout session for ${programName}, email: ${email}`);

    if (!programName) return res.status(400).json({ error: "Program name is required" });
    if (!email) return res.status(400).json({ error: "Email is required" });

    const priceIds = {
      "Ares Protocol": "price_1TJM36FywsnhFgWfMqo2H5no",
      "Apollo Physique": "price_1TJM3yFywsnhFgWfCLEAFwZD",
      "Hephaestus Framework": "price_1TJM5EFywsnhFgWfwr1yhP4e",
      "Hercules Foundation": "price_1TJM4hFywsnhFgWfygiuDvQ6"
    };

    const priceId = priceIds[programName];
    if (!priceId) return res.status(400).json({ error: `Program "${programName}" not found` });

    const existingPurchase = await Purchase.findOne({ email });
    const hasUsedTrialBefore = !!existingPurchase;
    
    let subscriptionData = {};
    if (!hasUsedTrialBefore) {
      subscriptionData = {
        trial_period_days: 30,
        trial_settings: { end_behavior: { missing_payment_method: "cancel" } }
      };
      console.log(`[DEBUG] New user ${email} - offering 30-day trial`);
    } else {
      console.log(`[DEBUG] Existing user ${email} - no trial (already used)`);
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: email,
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: subscriptionData,
      payment_method_collection: "always",
      success_url: "https://forge-of-olympus.onrender.com/success?session_id={CHECKOUT_SESSION_ID}",
      cancel_url: "https://forge-of-olympus.onrender.com/cancel",
      metadata: {
        programName: programName,
        userEmail: email
      }
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error("Checkout error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/test-stripe", (req, res) => {
  res.json({ 
    stripeExists: !!stripe, 
    keyExists: !!process.env.STRIPE_SECRET_KEY,
    keyPrefix: process.env.STRIPE_SECRET_KEY ? process.env.STRIPE_SECRET_KEY.substring(0, 7) : "none"
  });
});

app.delete("/api/session-log/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await Session.findByIdAndDelete(id);
    res.json({ message: "Session deleted" });
  } catch (err) {
    console.error("Delete error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/admin/remove-program", async (req, res) => {
  const { adminEmail, userEmail, programName } = req.body;
  
  const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "kieren2203@googlemail.com";
  
  if (adminEmail !== ADMIN_EMAIL) {
    return res.status(403).json({ error: "Not authorized" });
  }
  if (!userEmail || !programName) {
    return res.status(400).json({ error: "Email and program name required" });
  }
  
  const result = await Purchase.deleteOne({ email: userEmail, programName });
  
  if (result.deletedCount === 0) {
    return res.status(404).json({ error: "Program not found for this user" });
  }
  
  console.log(`✅ Admin removed ${programName} from ${userEmail}`);
  res.json({ message: `Removed ${programName} from ${userEmail}` });
});

app.get("/api/workout-summary/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const { program, week, day } = req.query;
    
    const sessions = await Session.find({ 
      userId, programName: program, week: Number(week), day: Number(day) 
    });
    
    let totalVolume = 0;
    const prs = [];
    const underRPE = [];
    
    for (const s of sessions) {
      if (s.actualWeight && s.repsPerSet && s.repsPerSet.length) {
        const setVolume = s.repsPerSet.reduce((sum, reps) => sum + (reps * s.actualWeight), 0);
        totalVolume += setVolume;
      } else if (s.actualWeight && s.repsCompleted) {
        totalVolume += s.repsCompleted * s.actualWeight;
      }
      
      if (s.actualRPE && s.targetRPE && s.actualRPE <= s.targetRPE) {
        underRPE.push(`${s.liftName}: ${s.actualRPE} ≤ ${s.targetRPE}`);
      }
      
      const previousSessions = await Session.find({ 
        userId, liftName: s.liftName 
      }).sort({ createdAt: -1 }).limit(2);
      
      if (previousSessions.length >= 2) {
        const prev = previousSessions[1];
        let currentReps = s.repsPerSet ? Math.max(...s.repsPerSet) : s.repsCompleted;
        let prevReps = prev.repsPerSet ? Math.max(...prev.repsPerSet) : prev.repsCompleted;
        if (currentReps > prevReps) {
          prs.push(`${s.liftName}: ${prevReps} → ${currentReps} reps`);
        }
      }
    }
    
    const timeToComplete = `${sessions.length * 8 + 10} min`;
    const user = await User.findById(userId);
    
    res.json({
      exercisesCompleted: sessions.length,
      totalVolume,
      timeToComplete,
      prs: prs.slice(0, 3),
      underRPE: underRPE.slice(0, 3),
      streak: user?.streak || 0,
      nextFocus: "Keep building on today's momentum. Focus on form as weight increases."
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/user-rewards/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });
    
    let rewardRecord = await StreakReward.findOne({ userId });
    if (!rewardRecord) {
      rewardRecord = await StreakReward.create({ userId, streakDays: 0, rewardsUnlocked: [] });
    }
    
    const newlyUnlocked = [];
    for (const milestone of streakMilestones) {
      const alreadyUnlocked = rewardRecord.rewardsUnlocked.some(r => r.rewardId === milestone.rewardId);
      if (!alreadyUnlocked && user.streak >= milestone.days) {
        newlyUnlocked.push(milestone);
        rewardRecord.rewardsUnlocked.push({ rewardId: milestone.rewardId });
      }
    }
    
    if (newlyUnlocked.length > 0) {
      await rewardRecord.save();
      console.log(`🎁 User ${userId} unlocked: ${newlyUnlocked.map(r => r.name).join(', ')}`);
    }
    
    const unlockedRewards = streakMilestones
      .filter(m => user.streak >= m.days)
      .map(m => ({ ...m, unlocked: true }));
    
    const nextMilestone = streakMilestones.find(m => user.streak < m.days);
    
    res.json({
      streak: user.streak,
      unlockedRewards,
      nextMilestone: nextMilestone ? {
        days: nextMilestone.days,
        daysNeeded: nextMilestone.days - user.streak,
        reward: nextMilestone.name,
        description: nextMilestone.description
      } : null,
      newlyUnlocked
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/daily-quote", async (req, res) => {
  const quotes = [
    { text: "The only bad workout is the one that didn't happen.", author: "Unknown" },
    { text: "Strength doesn't come from what you can do. It comes from overcoming the things you once thought you couldn't.", author: "Rikki Rogers" },
    { text: "The pain you feel today will be the strength you feel tomorrow.", author: "Unknown" },
    { text: "Discipline is choosing between what you want now and what you want most.", author: "Unknown" },
    { text: "Your body can stand almost anything. It's your mind that you have to convince.", author: "Unknown" },
    { text: "The only easy day was yesterday.", author: "Navy SEALs" },
    { text: "Don't count the days, make the days count.", author: "Muhammad Ali" }
  ];
  const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
  res.json(randomQuote);
});

app.get("/api/swap-permission/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);
    if (!user) return res.json({ swapsAllowed: 0 });
    
    let swapsAllowed = 0;
    if (user.streak >= 45) swapsAllowed = 2;
    else if (user.streak >= 14) swapsAllowed = 1;
    
    res.json({ swapsAllowed, streak: user.streak });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/subscription-status/:userId", async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.json({ active: false, everHadSubscription: false });
    
    const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "kieren2203@googlemail.com";
    const isAdmin = user.email === ADMIN_EMAIL;
    
    if (isAdmin) {
      return res.json({ active: true, everHadSubscription: true, programName: "Admin Access" });
    }
    
    const activePurchase = await Purchase.findOne({ email: user.email, active: true });
    const anyPurchase = await Purchase.findOne({ email: user.email });
    
    res.json({ 
      active: !!activePurchase || user.manualPremium === true, 
      everHadSubscription: !!anyPurchase || user.manualPremium === true,
      programName: activePurchase?.programName || (user.manualPremium ? "Manual Premium Access" : null)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== Manual Premium Admin Routes ====================
app.get("/api/admin/manual-premium-users", async (req, res) => {
  const { adminemail } = req.headers;
  const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "kieren2203@googlemail.com";
  
  if (adminemail !== ADMIN_EMAIL) {
    return res.status(403).json({ error: "Not authorized" });
  }
  
  const users = await User.find({ manualPremium: true }).select("email manualPremium createdAt streak");
  res.json(users);
});

app.post("/api/admin/grant-premium", async (req, res) => {
  const { adminEmail, userEmail } = req.body;
  
  const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "kieren2203@googlemail.com";
  
  if (adminEmail !== ADMIN_EMAIL) {
    return res.status(403).json({ error: "Not authorized" });
  }
  if (!userEmail) {
    return res.status(400).json({ error: "Email required" });
  }
  
  const normalizedEmail = userEmail.toLowerCase().trim();
  
  let user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    user = await User.create({ email: normalizedEmail });
  }
  
  user.manualPremium = true;
  await user.save();
  
  console.log(`✅ Granted manual premium access to ${normalizedEmail}`);
  res.json({ message: `Granted premium access to ${normalizedEmail}` });
});

app.post("/api/admin/revoke-premium", async (req, res) => {
  const { adminEmail, userEmail } = req.body;
  
  const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "kieren2203@googlemail.com";
  
  if (adminEmail !== ADMIN_EMAIL) {
    return res.status(403).json({ error: "Not authorized" });
  }
  if (!userEmail) {
    return res.status(400).json({ error: "Email required" });
  }
  
  const normalizedEmail = userEmail.toLowerCase().trim();
  
  const user = await User.findOne({ email: normalizedEmail });
  if (user) {
    user.manualPremium = false;
    await user.save();
    console.log(`❌ Revoked manual premium access from ${normalizedEmail}`);
    res.json({ message: `Revoked premium access from ${normalizedEmail}` });
  } else {
    res.status(404).json({ error: "User not found" });
  }
});

// Progress comparison endpoint
app.get("/api/progress-comparison/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    // Get all sessions grouped by week
    const sessions = await Session.find({ userId }).sort({ week: 1, day: 1, createdAt: 1 });
    if (sessions.length === 0) return res.json({ weeks: [], lifts: [] });

    const weeksMap = new Map();
    for (const s of sessions) {
      if (!weeksMap.has(s.week)) weeksMap.set(s.week, []);
      weeksMap.get(s.week).push(s);
    }
    const weeks = Array.from(weeksMap.keys()).sort((a,b)=>a-b);
    if (weeks.length < 2) return res.json({ weeks, lifts: [] });

    const firstWeek = weeks[0];
    const lastWeek = weeks[weeks.length-1];

    const firstWeekSessions = weeksMap.get(firstWeek);
    const lastWeekSessions = weeksMap.get(lastWeek);

    // Map lifts to their first and last weight (average or last session per lift)
    const liftMap = new Map();
    for (const s of firstWeekSessions) {
      if (!liftMap.has(s.liftName)) liftMap.set(s.liftName, { firstWeight: null, lastWeight: null });
      if (liftMap.get(s.liftName).firstWeight === null && s.actualWeight)
        liftMap.get(s.liftName).firstWeight = s.actualWeight;
    }
    for (const s of lastWeekSessions) {
      if (!liftMap.has(s.liftName)) liftMap.set(s.liftName, { firstWeight: null, lastWeight: null });
      if (s.actualWeight) liftMap.get(s.liftName).lastWeight = s.actualWeight;
    }

    const lifts = [];
    for (const [name, data] of liftMap.entries()) {
      const change = (data.lastWeight && data.firstWeight) ? data.lastWeight - data.firstWeight : null;
      lifts.push({
        name,
        firstWeight: data.firstWeight,
        lastWeight: data.lastWeight,
        change: change !== null ? Math.round(change * 10) / 10 : null
      });
    }

    res.json({ weeks, lifts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Email templates
async function sendWelcomeEmail1(email) {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Welcome to Forge of Olympus – Your First Workout",
    html: `<h2>Welcome to the Forge</h2>
           <p>You’ve taken the first step toward training without guessing.</p>
           <p><strong>Your first workout is ready.</strong> Log in and start your program.</p>
           <p>👉 <a href="https://forge-of-olympus.onrender.com/login">Start your first session</a></p>
           <p>Here’s a quick tip: use the “Auto Fill” button to pre‑fill your recommended weights and RPE targets.</p>
           <hr /><p style="font-size:12px;">Forge of Olympus – Train Without Guessing</p>`
  };
  try { await transporter.sendMail(mailOptions); console.log(`📧 Day1 email to ${email}`); } catch(e) { console.error(e); }
}

async function sendWelcomeEmail2(email) {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Why RPE beats percentages (and how you’re already benefiting)",
    html: `<h2>Why guessing your weights is over</h2>
           <p>Most apps give you fixed percentages. Forge of Olympus adapts to <strong>you</strong>.</p>
           <p>Every set you log with RPE (or RIR) teaches the engine your true strength on that day.</p>
           <p>👉 <a href="https://forge-of-olympus.onrender.com/dashboard">Check your 1RM progression</a></p>
           <hr /><p style="font-size:12px;">Forge of Olympus – Train Without Guessing</p>`
  };
  try { await transporter.sendMail(mailOptions); console.log(`📧 Day7 email to ${email}`); } catch(e) { console.error(e); }
}

async function sendWelcomeEmail3(email) {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Your free trial ends in 5 days – lock in your progress",
    html: `<h2>Don’t lose your adaptive training</h2>
           <p>Your 30‑day free trial is almost over. After that, your personalised weight recommendations will be hidden.</p>
           <p>Subscribe now to keep every lift optimised – <strong>£19.99/month</strong>.</p>
           <p>👉 <a href="https://forge-of-olympus.onrender.com">Subscribe now</a></p>
           <hr /><p style="font-size:12px;">Forge of Olympus – Train Without Guessing</p>`
  };
  try { await transporter.sendMail(mailOptions); console.log(`📧 Day25 email to ${email}`); } catch(e) { console.error(e); }
}

// Cron job – runs daily at 09:00
cron.schedule('0 9 * * *', async () => {
  console.log('🔁 Running welcome email cron job');
  const now = new Date();
  const day1Ago = new Date(now); day1Ago.setDate(now.getDate() - 1);
  const day7Ago = new Date(now); day7Ago.setDate(now.getDate() - 7);
  const day25Ago = new Date(now); day25Ago.setDate(now.getDate() - 25);

  // Users who signed up exactly 1 day ago
  const day1Users = await User.find({ createdAt: { $gte: day1Ago, $lt: now } });
  for (const user of day1Users) await sendWelcomeEmail1(user.email);

  // Users who signed up exactly 7 days ago
  const day7Users = await User.find({ createdAt: { $gte: day7Ago, $lt: day7Ago.setHours(24,0,0,0) } });
  for (const user of day7Users) await sendWelcomeEmail2(user.email);

  // Users who signed up exactly 25 days ago
  const day25Users = await User.find({ createdAt: { $gte: day25Ago, $lt: day25Ago.setHours(24,0,0,0) } });
  for (const user of day25Users) await sendWelcomeEmail3(user.email);
});

app.post("/api/run-email-cron", async (req, res) => {
  // This endpoint will be called by Render Cron Job
  console.log("🕐 Running email cron job");
  const now = new Date();
  const day1Ago = new Date(now); day1Ago.setDate(now.getDate() - 1);
  const day7Ago = new Date(now); day7Ago.setDate(now.getDate() - 7);
  const day25Ago = new Date(now); day25Ago.setDate(now.getDate() - 25);

  // Day 1 (users created exactly 1 day ago)
  const day1Users = await User.find({ createdAt: { $gte: day1Ago, $lt: now } });
  for (const user of day1Users) await sendWelcomeEmail1(user.email);

  // Day 7 (users created exactly 7 days ago – careful with time calculation)
  const day7Start = new Date(now); day7Start.setDate(now.getDate() - 7);
  const day7End = new Date(day7Start); day7End.setHours(24,0,0,0);
  const day7Users = await User.find({ createdAt: { $gte: day7Start, $lt: day7End } });
  for (const user of day7Users) await sendWelcomeEmail2(user.email);

  // Day 25
  const day25Start = new Date(now); day25Start.setDate(now.getDate() - 25);
  const day25End = new Date(day25Start); day25End.setHours(24,0,0,0);
  const day25Users = await User.find({ createdAt: { $gte: day25Start, $lt: day25End } });
  for (const user of day25Users) await sendWelcomeEmail3(user.email);

  res.json({ message: "Cron job executed" });
});

app.post("/api/check-stalls", async (req, res) => {
  const stalled = await LiftState.find({ stallCounter: { $gte: 3 } }).populate("userId");
  for (const s of stalled) {
    await sendStallAlert(s.userId.email, s.liftName, s.stallCounter);
  }
  res.json({ checked: stalled.length });
});

async function sendStallAlert(email, liftName, stallCounter) {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: process.env.ADMIN_EMAIL || "kieren2203@googlemail.com",
    subject: `⚠️ Stall detected on ${liftName}`,
    html: `<p>User: ${email}</p><p>Lift: ${liftName}</p><p>Stall counter: ${stallCounter}</p><p>Consider outreach: "I noticed your ${liftName} progression has stalled – want a free form check?"</p>`
  };
  try {
    await transporter.sendMail(mailOptions);
    console.log(`📧 Stall alert sent for ${email} – ${liftName}`);
  } catch (err) { console.error(err); }
}

// Serve static files from the public directory (images)
const publicPath = path.join(__dirname, "frontend", "public");
if (fs.existsSync(publicPath)) {
  app.use(express.static(publicPath));
}

// Serve React build
const distPath = path.join(__dirname, "frontend", "dist");
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get("*", (req, res) => res.sendFile(path.join(distPath, "index.html")));
} else {
  console.log("⚠️ React build not found. Run 'npm run build' in frontend directory");
  app.get("*", (req, res) => res.status(404).send("Build not found. Please run build first."));
}

// Global error handler
app.use((err, req, res, next) => {
  console.error("Global error:", err);
  res.status(500).json({ error: err.message || "Internal server error" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));