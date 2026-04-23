import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import Stripe from "stripe";
import nodemailer from 'nodemailer';

dotenv.config();

const app = express();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-02-24.acacia",
});
const transporter = nodemailer.createTransport({
  service: 'gmail', // or your email provider
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

// Helper function to decode and normalize program names - FIXED for JSON file matching
function normalizeProgramName(encodedName) {
  try {
    let decoded = decodeURIComponent(encodedName);
    
    // First, try to extract the core program name from Stripe descriptions
    const validPrograms = [
  "Ares Protocol",
  "Apollo Physique", 
  "Hephaestus Framework",
  "Hercules Foundation",
  "Mark Training",       
  "Hercules Foundation - Pauline Version" 
];
    
    // Check if the decoded name contains any of our valid program names
    const decodedLower = decoded.toLowerCase();
    for (const validName of validPrograms) {
      if (decodedLower.includes(validName.toLowerCase())) {
        console.log(`[NORMALIZE] "${decoded}" → "${validName}"`);
        return validName;
      }
    }
    
    // Fallback: remove common suffixes
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

// Replace the existing PurchaseSchema with this:
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
  createdAt: { type: Date, default: Date.now }
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

// Streak milestone rewards
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

  // Handle checkout.session.completed
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const customerEmail = session.customer_details?.email || session.customer_email || session.metadata?.userEmail;

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

  // Handle subscription cancellation
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
  
  // Handle payment failure
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
  
  // Handle successful payment (reactivate)
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
  // First, try to find by normalized name matching
  let filePath = findProgramFile(programName);
  
  // If not found, try converting spaces to hyphens (for direct filename match)
  if (!filePath) {
    const hyphenatedName = programNameToFilename(programName);
    filePath = path.join(__dirname, "data", `${hyphenatedName}.json`);
    console.log(`[LOAD] Trying hyphenated path: ${filePath}`);
  }
  
  // If still not found, try original program name as-is
  if (!filePath || !fs.existsSync(filePath)) {
    const asIsPath = path.join(__dirname, "data", `${programName}.json`);
    console.log(`[LOAD] Trying as-is path: ${asIsPath}`);
    if (fs.existsSync(asIsPath)) {
      filePath = asIsPath;
    }
  }
  
  if (!filePath || !fs.existsSync(filePath)) {
    const dataDir = path.join(__dirname, "data");
    const availableFiles = fs.existsSync(dataDir) ? fs.readdirSync(dataDir) : [];
    console.error(`❌ Program file not found for: "${programName}"`);
    console.error(`   Available files: ${availableFiles.join(', ')}`);
    throw new Error(`Program file not found: ${programName}`);
  }
  
  console.log(`✅ Loading program from: ${filePath}`);
  const raw = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  
  if (raw.sessions && Array.isArray(raw.sessions)) {
    return { name: raw.name, logic: raw.logic, sessions: raw.sessions };
  }
  if (Array.isArray(raw)) {
    return { sessions: raw, logic: "STRENGTH_RPE" };
  }
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
  const repsPerSet = sessionData.repsPerSet || [];
  const targetReps = parseInt(sessionData.targetReps, 10);
  const targetSets = sessionData.targetSets || 1;
  const allSetsCompleted = repsPerSet.length === targetSets && repsPerSet.every(r => r >= targetReps);
  const rpeOk = sessionData.actualRPE <= sessionData.targetRPE + 0.5;
  const isGoodSession = completed && allSetsCompleted && rpeOk;

  let fresh1RM = null;
  if (completed && sessionData.actualWeight && repsPerSet.length && sessionData.actualRPE) {
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
  const actualReps = Math.max(...repsPerSet);
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
  let newWeight = state.currentWeight || sessionData.actualWeight || 0;
  let successStreak = state.consecutiveSuccesses || 0;
  let stallCounter = state.stallCounter || 0;

  const completed = sessionData.completed === true;
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
      const increment = 2.5;
      newWeight += increment;
      successStreak = 0;
      console.log(`💪 Mobility progression (stability): ${sessionData.liftName} increased to ${newWeight}kg`);
    }
  } else {
    successStreak = 0;
    stallCounter += 1;
    
    if (stallCounter >= 2 && newWeight > 0) {
      newWeight = Math.max(0, newWeight - 2.5);
      stallCounter = 0;
      console.log(`⚠️ Mobility regression: ${sessionData.liftName} decreased to ${newWeight}kg`);
    }
  }

  return {
    currentWeight: Math.round(newWeight * 2) / 2,
    consecutiveSuccesses: successStreak,
    stallCounter,
    lastROM: state.lastROM
  };
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

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: Date.now() });
});

// Debug endpoint to check program files
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

app.get("/api/session-view/:week/:day/:userId", async (req, res) => {
  try {
    const week = Number(req.params.week);
    const day = Number(req.params.day);
    const userId = req.params.userId;
    let programName = req.query.program;
    if (!programName) return res.status(400).json({ error: "Missing program name" });

    programName = normalizeProgramName(programName);

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
        else if ((logic === "GENERAL_FITNESS_HYBRID" || logic === "HYPERTROPHY_VOLUME") && state.currentWeight > 0) {
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
        stabilityTarget: ex.stabilityTarget,
        qualityTarget: ex.qualityTarget,
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

// The rest of your routes remain the same (session-log, progression/apply, history, etc.)
// ... (keep all your existing routes from here)

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

// In server.js, replace the /api/login route (around line 812-848)

app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email) return res.status(400).json({ error: "Email required" });

  email = email.toLowerCase().trim();

  const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "kieren2203@googlemail.com";
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

  let isAdmin = false;
  if (email === ADMIN_EMAIL) {
    // Admin MUST provide correct password if one is set
    if (ADMIN_PASSWORD) {
      if (!password || password !== ADMIN_PASSWORD) {
        return res.status(401).json({ error: "Invalid admin password" });
      }
    } else {
      // If no admin password set in env, warn but allow (only in dev)
      console.warn("⚠️ No ADMIN_PASSWORD set in .env - admin access unprotected!");
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
      "Mark Training", "Hercules Foundation - Pauline Version"
    ];
    hasActiveSubscription = true;
  } else {
    const activePurchases = await Purchase.find({ email, active: true });
    purchasedPrograms = activePurchases.map(p => p.programName);
    hasActiveSubscription = activePurchases.length > 0;
  }

  res.json({
    userId: user._id.toString(),
    email,
    purchasedPrograms,
    streak: user.streak || 0,
    hasActiveSubscription
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
  const { adminemail, adminpassword } = req.headers;
  const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "kieren2203@googlemail.com";
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
  
  if (adminemail !== ADMIN_EMAIL) {
    return res.status(403).json({ error: "Not authorized" });
  }
  if (ADMIN_PASSWORD && adminpassword !== ADMIN_PASSWORD) {
    return res.status(403).json({ error: "Invalid admin password" });
  }
  
  const leads = await Lead.find().sort({ createdAt: -1 });
  res.json(leads);
});

app.get("/api/admin/leads/export", async (req, res) => {
  const { adminemail, adminpassword } = req.headers;
  const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "kieren2203@googlemail.com";
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
  
  if (adminemail !== ADMIN_EMAIL) {
    return res.status(403).json({ error: "Not authorized" });
  }
  if (ADMIN_PASSWORD && adminpassword !== ADMIN_PASSWORD) {
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

  const normalizedAdminEmail = adminEmail.toLowerCase().trim();
  const normalizedUserEmail = userEmail.toLowerCase().trim();
  
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
  
  // FIXED: Add active: true and all required fields
  await Purchase.findOneAndUpdate(
    { email: userEmail, programName },
    { 
      email: userEmail, 
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
  
  console.log(`✅ Admin assigned ${programName} to ${userEmail}`);
  res.json({ message: `Assigned ${programName} to ${userEmail}` });
});

// Update the create-checkout-session endpoint:
app.post("/api/create-checkout-session", async (req, res) => {
  try {
    const { programName, email } = req.body;
    email = email.toLowerCase().trim();

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

    // Check if this email has ever purchased before (used trial)
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

// Subscription status endpoint
// Subscription status endpoint
app.get("/api/subscription-status/:userId", async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.json({ active: false, everHadSubscription: false });
    
    // Check if this is the admin email
    const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "kieren2203@googlemail.com";
    const isAdmin = user.email === ADMIN_EMAIL;
    
    if (isAdmin) {
      return res.json({ active: true, everHadSubscription: true, programName: "Admin Access" });
    }
    
    const activePurchase = await Purchase.findOne({ email: user.email, active: true });
    const anyPurchase = await Purchase.findOne({ email: user.email });
    
    res.json({ 
      active: !!activePurchase, 
      everHadSubscription: !!anyPurchase,
      programName: activePurchase?.programName || null
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

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