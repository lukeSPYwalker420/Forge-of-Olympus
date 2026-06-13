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

// Helper: compute fatigueCap based on exercises (assuming RPE 7 gives multiplier ~1.15)
function computeFatigueCap(exercises, buffer = 1.2) {
  let totalFU = 0;
  for (const ex of exercises) {
    const baseFU = ex.baseFUCost !== undefined ? ex.baseFUCost : 1;
    const rpeMult = 1.15;  // typical RPE 7
    const sets = ex.sets || 3;
    totalFU += baseFU * rpeMult * sets;
  }
  return Math.ceil(totalFU * buffer);
}

// Deterministic "random" selection (same each run)
function pickItems(arr, count) {
  if (!arr.length) return [];
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor((i + 1) * 0.618033988749895) % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count);
}

// ========== POWERLIFTING GENERATOR ==========
function generatePowerliftingProgram(freq, focus) {
  freq = Number(freq);
  const { primarySessions, secondaryLifts, accessories, tertiary } = powerliftingMaster;
  let sessions = [];

  if (freq === 3) {
    sessions = [primarySessions.squat, primarySessions.bench, primarySessions.deadlift];
  } else if (freq === 4) {
    sessions = [primarySessions.squat, primarySessions.bench, primarySessions.deadlift];
    const benchVol = JSON.parse(JSON.stringify(primarySessions.bench));
    benchVol.focus = "Bench Volume";
    benchVol.exercises.forEach(ex => { if (ex.reps === "4") ex.reps = "8"; if (ex.rpeTarget) ex.rpeTarget = Math.max(5, ex.rpeTarget - 1); });
    sessions.push(benchVol);
  } else if (freq === 5) {
    sessions = [
      JSON.parse(JSON.stringify(primarySessions.squat)),
      JSON.parse(JSON.stringify(primarySessions.bench)),
      JSON.parse(JSON.stringify(primarySessions.deadlift)),
      { focus: "Secondary Variation", exercises: [] },
      { focus: "Technique / Tertiary", exercises: [] }
    ];
    // Secondary day
    let secEx = [];
    if (focus === "squat") secEx = pickItems(secondaryLifts.squatVariations, 2);
    else if (focus === "bench") secEx = pickItems(secondaryLifts.benchVariations, 2);
    else if (focus === "deadlift") secEx = pickItems(secondaryLifts.deadliftVariations, 2);
    else secEx = pickItems([...secondaryLifts.squatVariations, ...secondaryLifts.benchVariations], 2);
    sessions[3].exercises = secEx;
    // Tertiary day
    let tertEx = [];
    if (focus === "squat") tertEx = pickItems(tertiary.squatTertiary, 2);
    else if (focus === "bench") tertEx = pickItems(tertiary.benchTertiary, 2);
    else if (focus === "deadlift") tertEx = pickItems(tertiary.deadliftTertiary, 2);
    else tertEx = pickItems([...tertiary.squatTertiary, ...tertiary.benchTertiary], 2);
    sessions[4].exercises = tertEx;
  }

  // Add accessories to all sessions
  const accCount = freq === 3 ? 3 : (freq === 4 ? 4 : 5);
  let selectedAcc = [];
  if (focus === "balanced") {
    selectedAcc = [...pickItems(accessories.quads,1), ...pickItems(accessories.posterior,1),
                   ...pickItems(accessories.push,1), ...pickItems(accessories.pull,1)];
  } else if (focus === "squat") {
    selectedAcc = [...pickItems(accessories.quads,2), ...pickItems(accessories.posterior,1),
                   ...pickItems(accessories.push,1), ...pickItems(accessories.pull,0)];
  } else if (focus === "bench") {
    selectedAcc = [...pickItems(accessories.push,2), ...pickItems(accessories.pull,1),
                   ...pickItems(accessories.posterior,1), ...pickItems(accessories.quads,0)];
  } else if (focus === "deadlift") {
    selectedAcc = [...pickItems(accessories.posterior,2), ...pickItems(accessories.pull,1),
                   ...pickItems(accessories.push,1), ...pickItems(accessories.quads,0)];
  }
  selectedAcc = selectedAcc.slice(0, accCount);
  sessions.forEach(s => s.exercises.push(...selectedAcc));

  const fullProgram = {
    name: `Apex Strength – ${freq}d / ${focus} focus`,
    logic: "STRENGTH_RPE",
    useFatigueBudget: true,
    sessions: []
  };
  for (let week = 1; week <= 5; week++) {
    for (let i = 0; i < sessions.length; i++) {
      const sessCopy = JSON.parse(JSON.stringify(sessions[i]));
      sessCopy.week = week;
      sessCopy.day = i + 1;
      if (week === 5) {
        sessCopy.exercises.forEach(ex => { if (ex.rpeTarget) ex.rpeTarget = Math.max(5, ex.rpeTarget-2); if (ex.rirTarget) ex.rirTarget = (ex.rirTarget||2)+2; if (ex.sets) ex.sets = Math.max(2, ex.sets-1); });
      } else if (week >= 2) {
        sessCopy.exercises.forEach(ex => { if (ex.rpeTarget) ex.rpeTarget = Math.min(9, ex.rpeTarget+0.5); if (ex.rirTarget) ex.rirTarget = Math.max(1, (ex.rirTarget||2)-0.5); });
      }
      // Compute dynamic fatigueCap
      sessCopy.fatigueCap = computeFatigueCap(sessCopy.exercises, 1.2);
      fullProgram.sessions.push(sessCopy);
    }
  }
  return fullProgram;
}

// ========== HYPERTROPHY GENERATOR ==========
function generateHypertrophyProgram(freq, split) {
  freq = Number(freq);
  const { planeSessions, armsDay, volumeFactors } = hypertrophyMaster;
  let sessions = [];

  if (split === "plane") {
    sessions = [
      JSON.parse(JSON.stringify(planeSessions.upperHorizontal)),
      JSON.parse(JSON.stringify(planeSessions.lowerQuad)),
      JSON.parse(JSON.stringify(planeSessions.upperVertical)),
      JSON.parse(JSON.stringify(planeSessions.lowerPosterior))
    ];
  } else if (split === "upper_lower") {
    sessions = [
      JSON.parse(JSON.stringify(planeSessions.upperHorizontal)),
      JSON.parse(JSON.stringify(planeSessions.lowerQuad)),
      JSON.parse(JSON.stringify(planeSessions.upperVertical)),
      JSON.parse(JSON.stringify(planeSessions.lowerPosterior))
    ];
    sessions[0].focus = "Upper (Horizontal)";
    sessions[1].focus = "Lower (Quad)";
    sessions[2].focus = "Upper (Vertical)";
    sessions[3].focus = "Lower (Posterior)";
  } else if (split === "ppl") {
    const upperHorPool = planeSessions.upperHorizontal?.exercisePool ?? [];
    const upperVerPool = planeSessions.upperVertical?.exercisePool ?? [];
    const lowerQuadPool = planeSessions.lowerQuad?.exercisePool ?? [];
    const lowerPostPool = planeSessions.lowerPosterior?.exercisePool ?? [];
    sessions = [
      { focus: "Push (Chest/Shoulders/Triceps)", exercisePool: [...upperHorPool, ...upperVerPool] },
      { focus: "Pull (Back/Biceps)", exercisePool: [...upperHorPool, ...upperVerPool] },
      { focus: "Legs (Quads/Hams/Glutes)", exercisePool: [...lowerQuadPool, ...lowerPostPool] },
      { focus: "Full Body / Arms", exercisePool: [...upperHorPool, ...lowerQuadPool] }
    ];
  }

  if (freq === 3) {
    sessions = sessions.slice(0, 3);
  } else if (freq === 5) {
    const armsDayData = armsDay || { focus: "Arms & Shoulders", exercisePool: [] };
    const armsPool = armsDayData.exercisePool ?? [];
    const armsSession = { focus: armsDayData.focus, exercisePool: armsPool };
    sessions = [sessions[0], sessions[1], armsSession, sessions[2], sessions[3]];
  }

  const factor = volumeFactors[freq];
  sessions.forEach(s => {
    const pool = s.exercisePool;
    delete s.exercisePool;
    const num = Math.min(pool.length, factor === 1.2 ? 7 : (factor === 0.8 ? 5 : 6));
    s.exercises = pickItems(pool, num);
    s.exercises.forEach(ex => { if (ex.sets) ex.sets = Math.max(2, Math.floor(ex.sets * factor)); });
  });

  const fullProgram = {
    name: `Apex Hypertrophy – ${freq}d / ${split.toUpperCase()} split`,
    logic: "HYPERTROPHY_VOLUME",
    sessions: []
  };
  for (let week = 1; week <= 5; week++) {
    for (let i = 0; i < sessions.length; i++) {
      const sessCopy = JSON.parse(JSON.stringify(sessions[i]));
      sessCopy.week = week;
      sessCopy.day = i + 1;
      if (week === 5) {
        sessCopy.exercises.forEach(ex => { if (ex.rirTarget) ex.rirTarget = (ex.rirTarget||2)+2; if (ex.sets) ex.sets = Math.max(2, ex.sets-1); });
      } else if (week >= 3) {
        sessCopy.exercises.forEach(ex => { if (ex.rirTarget) ex.rirTarget = Math.max(1, (ex.rirTarget||2)-0.5); });
      }
      // Compute dynamic fatigueCap
      sessCopy.fatigueCap = computeFatigueCap(sessCopy.exercises, 1.2);
      fullProgram.sessions.push(sessCopy);
    }
  }
  return fullProgram;
}

// ========== MEET PREP GENERATOR ==========
// In generatePrograms.js – meet prep with dynamic focus
function generateMeetPrepProgram(freq, focusLift, durationWeeks = 8, fatiguePriority = "axial") {
  const { waveTemplates, coreLifts, variationPool, accessoryPool, volumeFactors } = meetPrepMaster;
  const wave = waveTemplates[durationWeeks] || waveTemplates[8];
  const factor = volumeFactors[freq];
  let sessions = [];

  for (let w = 0; w < wave.weeks.length; w++) {
    const weekData = wave.weeks[w];
    const weekNum = w + 1;
    const isTaperWeek = weekData.phase === "Taper" || weekData.phase === "Meet Week";

    let sessionDays = [];
    if (freq === 3) sessionDays = [1, 3, 5];
    else if (freq === 4) sessionDays = [1, 2, 4, 5];
    else sessionDays = [1, 2, 3, 4, 5];

    for (let dayIdx = 0; dayIdx < sessionDays.length; dayIdx++) {
      const dayNum = sessionDays[dayIdx];
      let exercises = [];

      // Add core lifts (always top-set + back-off)
      if (dayNum === 1) {
        exercises.push(...coreLifts.filter(l => l.liftName.includes("Squat")));
        if (focusLift === "squat") {
          exercises.forEach(ex => {
            if (ex.liftName.includes("Squat")) ex.rpeTarget = Math.min(9.5, (ex.rpeTarget || 8) + 0.5);
          });
        }
      }
      if (dayNum === 2 || dayNum === 4) {
        exercises.push(...coreLifts.filter(l => l.liftName.includes("Bench")));
        if (focusLift === "bench") {
          exercises.forEach(ex => {
            if (ex.liftName.includes("Bench")) ex.rpeTarget = Math.min(9.5, (ex.rpeTarget || 8) + 0.5);
          });
        }
      }
      if (dayNum === 3 || dayNum === 5) {
        exercises.push(...coreLifts.filter(l => l.liftName.includes("Deadlift")));
        if (focusLift === "deadlift") {
          exercises.forEach(ex => {
            if (ex.liftName.includes("Deadlift")) ex.rpeTarget = Math.min(9.5, (ex.rpeTarget || 8) + 0.5);
          });
        }
      }

      // Variation lifts (rotated weekly)
      const weekParity = weekNum % 3;
      if (dayNum === 1 && weekParity === 0 && variationPool.squat.length) {
        const varLift = JSON.parse(JSON.stringify(variationPool.squat[weekNum % variationPool.squat.length]));
        varLift.role = "variation";
        varLift.sets = 3;
        varLift.reps = "5-6";
        varLift.rpeTarget = weekData.rpeBase - 0.5;
        exercises.push(varLift);
      }
      if (dayNum === 2 && weekParity === 1 && variationPool.bench.length) {
        const varLift = JSON.parse(JSON.stringify(variationPool.bench[weekNum % variationPool.bench.length]));
        varLift.role = "variation";
        varLift.sets = 3;
        varLift.reps = "5-6";
        varLift.rpeTarget = weekData.rpeBase - 0.5;
        exercises.push(varLift);
      }
      if (dayNum === 3 && weekParity === 2 && variationPool.deadlift.length) {
        const varLift = JSON.parse(JSON.stringify(variationPool.deadlift[weekNum % variationPool.deadlift.length]));
        varLift.role = "variation";
        varLift.sets = 2;
        varLift.reps = "4-5";
        varLift.rpeTarget = weekData.rpeBase - 0.5;
        exercises.push(varLift);
      }

      // Accessories – reduce if fatiguePriority tag is high during peak weeks
      let accessoryCount = freq === 3 ? 2 : (freq === 4 ? 3 : 4);
      if (weekData.rpeBase >= 8.5) accessoryCount = Math.max(1, accessoryCount - 1);
      if (isTaperWeek) accessoryCount = Math.max(0, accessoryCount - 1);
      
      if (accessoryCount > 0) {
        let allAcc = [...accessoryPool.quads, ...accessoryPool.posterior, ...accessoryPool.push, ...accessoryPool.pull];
        // Avoid accessories that stress the fatiguePriority tag during high fatigue weeks
        if (weekData.rpeBase >= 8 && fatiguePriority !== "balanced") {
          allAcc = allAcc.filter(acc => !(acc.stressTags && acc.stressTags.includes(fatiguePriority)));
        }
        const selected = pickItems(allAcc, accessoryCount);
        exercises.push(...selected);
      }

      // Weekly volume and RPE adjustments
      exercises.forEach(ex => {
        if (ex.sets) ex.sets = Math.max(1, Math.floor(ex.sets * weekData.volumeFactor * factor));
        if (ex.rpeTarget !== undefined) {
          let adjustedRPE = ex.rpeTarget + (weekData.rpeBase - 7);
          if (focusLift !== "balanced" && ex.liftName.toLowerCase().includes(focusLift)) {
            if (weekData.phase === "Peak") adjustedRPE += 0.5;
          }
          ex.rpeTarget = Math.min(9.5, Math.max(5, adjustedRPE));
        }
        // Taper
        if (isTaperWeek && ex.role === "top-set") {
          ex.sets = 1;
          if (weekData.phase === "Meet Week") ex.rpeTarget = Math.min(9, ex.rpeTarget);
        } else if (isTaperWeek && ex.role === "back-off") {
          ex.sets = Math.max(0, ex.sets - 1);
        }
      });

      const fatigueBuffer = (fatiguePriority !== "balanced" && weekData.rpeBase >= 8) ? 1.1 : 1.2;
      const fatigueCap = computeFatigueCap(exercises, fatigueBuffer);

      sessions.push({
        week: weekNum,
        day: dayNum,
        focus: `Meet Prep - ${weekData.phase} (${focusLift} focus, clear ${fatiguePriority})`,
        fatigueCap: fatigueCap,
        exercises: exercises,
        phase: weekData.phase
      });
    }
  }

  return {
    name: `Meet Prep - ${freq}d / ${focusLift} focus / ${durationWeeks} weeks`,
    logic: "STRENGTH_RPE",
    useFatigueBudget: true,
    sessions: sessions
  };
}

// ========== GENERATE ALL ==========
const freqs = [3,4,5];
const strengthFoci = ["balanced","squat","bench","deadlift"];
const hypertrophySplits = ["upper_lower","ppl","plane"];
const meetPrepFoci = ["peaking","taper"];

for (const freq of freqs) {
  for (const focus of strengthFoci) {
    const prog = generatePowerliftingProgram(freq, focus);
    const fileName = `str_${freq}_${focus}.json`;
    const filePathFrontend = path.join(OUTPUT_DIR, fileName);
    const filePathBackend = path.join(BACKEND_DATA_DIR, fileName);
    fs.writeFileSync(filePathFrontend, JSON.stringify(prog, null, 2));
    fs.writeFileSync(filePathBackend, JSON.stringify(prog, null, 2));
    console.log(`Generated ${fileName}`);
  }
}

for (const freq of freqs) {
  for (const split of hypertrophySplits) {
    const prog = generateHypertrophyProgram(freq, split);
    const fileName = `hyp_${freq}_${split}.json`;
    const filePathFrontend = path.join(OUTPUT_DIR, fileName);
    const filePathBackend = path.join(BACKEND_DATA_DIR, fileName);
    fs.writeFileSync(filePathFrontend, JSON.stringify(prog, null, 2));
    fs.writeFileSync(filePathBackend, JSON.stringify(prog, null, 2));
    console.log(`Generated ${fileName}`);
  }
}

for (const freq of freqs) {
  for (const focus of meetPrepFoci) {
    const prog = generateMeetPrepProgram(freq, focus);
    const fileName = `mp_${freq}_${focus}.json`;
    const filePathFrontend = path.join(OUTPUT_DIR, fileName);
    const filePathBackend = path.join(BACKEND_DATA_DIR, fileName);
    fs.writeFileSync(filePathFrontend, JSON.stringify(prog, null, 2));
    fs.writeFileSync(filePathBackend, JSON.stringify(prog, null, 2));
    console.log(`Generated ${fileName}`);
  }
}

console.log("✅ All program files written to frontend/public/programs/");