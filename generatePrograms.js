// scripts/generatePrograms.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { powerliftingMaster } from './programData/powerliftingMaster.js';
import { hypertrophyMaster } from './programData/hypertrophyMaster.js';
import { meetPrepMaster } from './programData/meetPrepMaster.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.resolve(__dirname, '../frontend/public/programs');
const BACKEND_DATA_DIR = path.resolve(__dirname, '../data');
if (!fs.existsSync(BACKEND_DATA_DIR)) fs.mkdirSync(BACKEND_DATA_DIR, { recursive: true });
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// ========== HELPER FUNCTIONS ==========
// Deterministic pseudo‑random pick (same order each run)
function pickItems(arr, count) {
  if (!arr.length) return [];
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor((i + 1) * 0.618033988749895) % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count);
}

// Compute fatigue cap from a list of exercises (assumes RPE 7 ≈ multiplier 1.15)
function computeFatigueCap(exercises, buffer = 1.2) {
  let total = 0;
  for (const ex of exercises) {
    const baseFU = ex.baseFUCost !== undefined ? ex.baseFUCost : 1;
    const rpeMult = 1.15;
    total += baseFU * rpeMult * (ex.sets || 3);
  }
  return Math.ceil(total * buffer);
}

// Apply wave adjustments (RPE/RIR and volume factor) to a single exercise
function applyWave(ex, weekData, isHypertrophy = false) {
  const newEx = { ...ex };
  if (isHypertrophy && newEx.rirTarget !== undefined) {
    // Hypertrophy: lower RIR = harder. Wave affects RIR inversely to RPE.
    // Base RIR = 2, waveRIR = 2 + (7 - weekData.rpeBase)
    let rir = 2 + (7 - weekData.rpeBase);
    rir = Math.min(5, Math.max(0, rir));
    newEx.rirTarget = rir;
  } else if (newEx.rpeTarget !== undefined) {
    // Strength: RPE = base + (weekRPE - 7)
    let rpe = newEx.rpeTarget + (weekData.rpeBase - 7);
    rpe = Math.min(9.5, Math.max(5, rpe));
    newEx.rpeTarget = rpe;
  }
  if (newEx.sets !== undefined) {
    let sets = Math.round(newEx.sets * weekData.volumeFactor);
    sets = Math.max(1, sets);
    newEx.sets = sets;
  }
  return newEx;
}

// ========== STRENGTH GENERATOR (wave‑loaded) ==========
// Uses 5‑week wave template with RPE wave and volume wave
const strengthWave = {
  weeks: [
    { week: 1, phase: "Accumulation", rpeBase: 6, volumeFactor: 1.0 },
    { week: 2, phase: "Intensification", rpeBase: 7, volumeFactor: 1.0 },
    { week: 3, phase: "Overreaching", rpeBase: 7.5, volumeFactor: 0.9 },
    { week: 4, phase: "Peak", rpeBase: 8, volumeFactor: 0.8 },
    { week: 5, phase: "Deload", rpeBase: 5, volumeFactor: 0.6 }
  ]
};

function generateStrengthProgram(freq, focus) {
  freq = Number(freq);
  const { primarySessions, secondaryLifts, accessories, tertiary } = powerliftingMaster;
  // Determine which sessions to include per frequency
  let sessionOrder = [];
  if (freq === 3) sessionOrder = ['squat', 'bench', 'deadlift'];
  else if (freq === 4) sessionOrder = ['squat', 'bench', 'deadlift', 'bench'];
  else sessionOrder = ['squat', 'bench', 'deadlift', 'squat', 'bench']; // 5‑day example

  // Focus adjustments: add RPE to certain lifts
  const focusAdjust = {
    squat: { squat: 0.5 },
    bench: { bench: 0.5 },
    deadlift: { deadlift: 0.5 },
    balanced: {}
  };
  const adjust = focusAdjust[focus] || {};

  const sessions = [];

  for (const weekData of strengthWave.weeks) {
    const weekNum = weekData.week;
    for (let idx = 0; idx < sessionOrder.length; idx++) {
      const lift = sessionOrder[idx];
      const base = primarySessions[lift];
      if (!base) continue;
      // Clone core exercises
      let exercises = base.exercises.map(ex => ({ ...ex }));
      // Apply wave adjustments
      exercises = exercises.map(ex => applyWave(ex, weekData, false));
      // Add extra RPE for focus lift
      if (adjust[lift]) {
        exercises = exercises.map(ex => {
          if (ex.role === 'top-set') {
            ex.rpeTarget = Math.min(9.5, ex.rpeTarget + adjust[lift]);
          }
          return ex;
        });
      }
      // Add one variation (secondary) for 4‑day and 5‑day on certain days
      if ((freq === 4 && (idx === 1 || idx === 3)) || (freq === 5 && (idx === 3 || idx === 4))) {
        const variationPool = secondaryLifts[`${lift}Variations`];
        if (variationPool && variationPool.length) {
          const varLift = { ...pickItems(variationPool, 1)[0] };
          varLift.role = 'variation';
          varLift.sets = Math.max(2, Math.round(3 * weekData.volumeFactor));
          varLift = applyWave(varLift, weekData, false);
          exercises.push(varLift);
        }
      }
      // Add accessories (2–3 per session)
      let accessoryCount = freq === 3 ? 2 : (freq === 4 ? 3 : 4);
      if (weekData.phase === 'Deload') accessoryCount = 1;
      if (accessoryCount > 0) {
        let allAcc = [];
        if (lift === 'squat') allAcc = [...accessories.quads, ...accessories.posterior];
        else if (lift === 'bench') allAcc = [...accessories.push, ...accessories.pull];
        else allAcc = [...accessories.posterior, ...accessories.pull, ...accessories.quads];
        const selected = pickItems(allAcc, accessoryCount);
        for (let acc of selected) {
          let newAcc = { ...acc };
          newAcc = applyWave(newAcc, weekData, false);
          exercises.push(newAcc);
        }
      }
      // Compute fatigue cap
      const fatigueCap = computeFatigueCap(exercises, 1.2);
      sessions.push({
        week: weekNum,
        day: idx + 1,
        focus: base.focus,
        fatigueCap,
        exercises
      });
    }
  }

  return {
    name: `Apex Strength – ${freq}d / ${focus} focus (Wave‑Loaded)`,
    logic: "STRENGTH_RPE",
    useFatigueBudget: true,
    sessions
  };
}

// ========== HYPERTROPHY GENERATOR ==========
// Uses a 6‑week wave with RIR (higher RIR = easier)
const hypertrophyWave = {
  weeks: [
    { week: 1, phase: "Accumulation", rpeBase: 6, volumeFactor: 1.0 },   // RIR ~3
    { week: 2, phase: "Accumulation", rpeBase: 6.5, volumeFactor: 1.0 }, // RIR ~2.5
    { week: 3, phase: "Intensification", rpeBase: 7, volumeFactor: 0.95 }, // RIR ~2
    { week: 4, phase: "Intensification", rpeBase: 7.5, volumeFactor: 0.9 }, // RIR ~1.5
    { week: 5, phase: "Peak", rpeBase: 8, volumeFactor: 0.85 },           // RIR ~1
    { week: 6, phase: "Deload", rpeBase: 5, volumeFactor: 0.6 }           // RIR ~4
  ]
};

function generateHypertrophyProgram(freq, split) {
  freq = Number(freq);
  const { planeSessions, armsDay, volumeFactors } = hypertrophyMaster;

  // Map split to a list of session keys
  let sessionKeys = [];
  if (split === 'upper_lower') sessionKeys = ['upperHorizontal', 'lowerQuad', 'upperVertical', 'lowerPosterior'];
  else if (split === 'plane') sessionKeys = ['upperHorizontal', 'lowerQuad', 'upperVertical', 'lowerPosterior'];
  else if (split === 'ppl') sessionKeys = ['push', 'pull', 'legs', 'fullbody'];

  // For 3‑day, take first 3; for 5‑day, insert arms day
  if (freq === 3) sessionKeys = sessionKeys.slice(0, 3);
  else if (freq === 5) {
    // Insert arms day after 2nd session
    sessionKeys = [sessionKeys[0], sessionKeys[1], 'arms', sessionKeys[2], sessionKeys[3]];
  }

  const factor = volumeFactors[freq] || 1.0;
  const sessions = [];

  for (const weekData of hypertrophyWave.weeks) {
    const weekNum = weekData.week;
    const volumeFactor = weekData.volumeFactor * factor;
    for (let idx = 0; idx < sessionKeys.length; idx++) {
      const key = sessionKeys[idx];
      let base;
      if (key === 'arms') base = armsDay;
      else if (planeSessions[key]) base = planeSessions[key];
      else if (key === 'push') base = { exercisePool: [...planeSessions.upperHorizontal.exercisePool, ...planeSessions.upperVertical.exercisePool] };
      else if (key === 'pull') base = { exercisePool: [...planeSessions.upperHorizontal.exercisePool, ...planeSessions.upperVertical.exercisePool] };
      else if (key === 'legs') base = { exercisePool: [...planeSessions.lowerQuad.exercisePool, ...planeSessions.lowerPosterior.exercisePool] };
      else if (key === 'fullbody') base = { exercisePool: [...planeSessions.upperHorizontal.exercisePool, ...planeSessions.lowerQuad.exercisePool] };
      if (!base || !base.exercisePool) continue;

      // Select exercises from pool
      let numExercises = factor === 1.2 ? 6 : (factor === 0.8 ? 4 : 5);
      if (weekData.phase === 'Deload') numExercises = 3;
      let selected = pickItems(base.exercisePool, numExercises);
      let exercises = selected.map(ex => ({ ...ex }));
      // Apply volume factor to sets
      exercises.forEach(ex => {
        if (ex.sets) ex.sets = Math.max(1, Math.floor(ex.sets * volumeFactor));
      });
      // Apply wave (RIR adjustment)
      exercises = exercises.map(ex => applyWave(ex, weekData, true));
      // Compute fatigue cap (hypertrophy uses RIR so baseFUCost is low)
      const fatigueCap = computeFatigueCap(exercises, 1.15);
      sessions.push({
        week: weekNum,
        day: idx + 1,
        focus: base.focus || key,
        fatigueCap,
        exercises
      });
    }
  }

  return {
    name: `Apex Hypertrophy – ${freq}d / ${split.toUpperCase()} split (Wave‑Loaded)`,
    logic: "HYPERTROPHY_VOLUME",
    sessions
  };
}

// ========== MEET PREP GENERATOR ==========
// Uses waveTemplates from meetPrepMaster (8,12,16 weeks)
function generateMeetPrepProgram(freq, focus, duration = 8) {
  freq = Number(freq);
  const { waveTemplates, coreLifts, variationPool, accessoryPool, volumeFactors } = meetPrepMaster;
  const wave = waveTemplates[duration] || waveTemplates[8];
  const factor = volumeFactors[freq] || 1.0;
  const sessions = [];

  // Map frequency to session days (simplified: 3‑day = squat/bench/deadlift split)
  let sessionDays = [];
  if (freq === 3) sessionDays = [1, 3, 5];
  else if (freq === 4) sessionDays = [1, 2, 4, 5];
  else sessionDays = [1, 2, 3, 4, 5];

  for (const weekData of wave.weeks) {
    const weekNum = weekData.week;
    const isTaper = weekData.phase === 'Taper' || weekData.phase === 'Meet Week';
    for (let dayIdx = 0; dayIdx < sessionDays.length; dayIdx++) {
      const dayNum = sessionDays[dayIdx];
      let exercises = [];

      // Core lifts based on day
      if (dayNum === 1) exercises.push(...coreLifts.filter(l => l.liftName.includes('Squat')));
      if (dayNum === 2 || dayNum === 4) exercises.push(...coreLifts.filter(l => l.liftName.includes('Bench')));
      if (dayNum === 3 || dayNum === 5) exercises.push(...coreLifts.filter(l => l.liftName.includes('Deadlift')));

      // Add a variation (rotated weekly)
      const weekParity = weekNum % 3;
      if (dayNum === 1 && weekParity === 0 && variationPool.squat.length) {
        const varLift = { ...pickItems(variationPool.squat, 1)[0], role: 'variation', sets: 3, reps: '5-6' };
        varLift.rpeTarget = weekData.rpeBase - 0.5;
        exercises.push(varLift);
      }
      if (dayNum === 2 && weekParity === 1 && variationPool.bench.length) {
        const varLift = { ...pickItems(variationPool.bench, 1)[0], role: 'variation', sets: 3, reps: '5-6' };
        varLift.rpeTarget = weekData.rpeBase - 0.5;
        exercises.push(varLift);
      }
      if (dayNum === 3 && weekParity === 2 && variationPool.deadlift.length) {
        const varLift = { ...pickItems(variationPool.deadlift, 1)[0], role: 'variation', sets: 2, reps: '4-5' };
        varLift.rpeTarget = weekData.rpeBase - 0.5;
        exercises.push(varLift);
      }

      // Accessories: fewer in peak/taper
      let accessoryCount = freq === 3 ? 2 : (freq === 4 ? 3 : 4);
      if (weekData.rpeBase >= 8.5) accessoryCount = Math.max(1, accessoryCount - 1);
      if (isTaper) accessoryCount = Math.max(0, accessoryCount - 1);
      if (accessoryCount > 0) {
        let allAcc = [...accessoryPool.quads, ...accessoryPool.posterior, ...accessoryPool.push, ...accessoryPool.pull];
        const selected = pickItems(allAcc, accessoryCount);
        exercises.push(...selected);
      }

      // Apply volume factor and RPE adjustments
      exercises.forEach(ex => {
        if (ex.sets) ex.sets = Math.max(1, Math.floor(ex.sets * weekData.volumeFactor * factor));
        if (ex.rpeTarget !== undefined) {
          let rpe = ex.rpeTarget + (weekData.rpeBase - 7);
          rpe = Math.min(9.5, Math.max(5, rpe));
          ex.rpeTarget = rpe;
        }
        if (isTaper && ex.role === 'top-set') {
          ex.sets = 1;
          if (weekData.phase === 'Meet Week') ex.rpeTarget = Math.min(9, ex.rpeTarget);
        }
      });

      const fatigueCap = computeFatigueCap(exercises, 1.2);
      sessions.push({
        week: weekNum,
        day: dayNum,
        focus: `Meet Prep – ${weekData.phase}`,
        fatigueCap,
        exercises
      });
    }
  }

  return {
    name: `Meet Prep – ${freq}d / ${duration} weeks`,
    logic: "STRENGTH_RPE",
    useFatigueBudget: true,
    sessions
  };
}

// ========== GENERATE ALL PROGRAMS ==========
const freqs = [3, 4, 5];
const strengthFoci = ['balanced', 'squat', 'bench', 'deadlift'];
const hypertrophySplits = ['upper_lower', 'ppl', 'plane'];
const meetPrepDurations = [8, 12, 16];

// Strength
for (const freq of freqs) {
  for (const focus of strengthFoci) {
    const prog = generateStrengthProgram(freq, focus);
    const fileName = `str_${freq}_${focus}.json`;
    const frontendPath = path.join(OUTPUT_DIR, fileName);
    const backendPath = path.join(BACKEND_DATA_DIR, fileName);
    fs.writeFileSync(frontendPath, JSON.stringify(prog, null, 2));
    fs.writeFileSync(backendPath, JSON.stringify(prog, null, 2));
    console.log(`Generated ${fileName}`);
  }
}

// Hypertrophy
for (const freq of freqs) {
  for (const split of hypertrophySplits) {
    const prog = generateHypertrophyProgram(freq, split);
    const fileName = `hyp_${freq}_${split}.json`;
    const frontendPath = path.join(OUTPUT_DIR, fileName);
    const backendPath = path.join(BACKEND_DATA_DIR, fileName);
    fs.writeFileSync(frontendPath, JSON.stringify(prog, null, 2));
    fs.writeFileSync(backendPath, JSON.stringify(prog, null, 2));
    console.log(`Generated ${fileName}`);
  }
}

// Meet Prep
for (const freq of freqs) {
  for (const duration of meetPrepDurations) {
    const prog = generateMeetPrepProgram(freq, 'peaking', duration);
    const fileName = `mp_${freq}_${duration}w.json`;
    const frontendPath = path.join(OUTPUT_DIR, fileName);
    const backendPath = path.join(BACKEND_DATA_DIR, fileName);
    fs.writeFileSync(frontendPath, JSON.stringify(prog, null, 2));
    fs.writeFileSync(backendPath, JSON.stringify(prog, null, 2));
    console.log(`Generated ${fileName}`);
  }
}

console.log("✅ All wave‑loaded programs generated successfully.");