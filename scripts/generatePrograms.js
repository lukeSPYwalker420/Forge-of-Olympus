// scripts/generatePrograms.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { powerliftingMaster } from './programData/powerliftingMaster.js';
import { hypertrophyMaster } from './programData/hypertrophyMaster.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.resolve(__dirname, '../frontend/public/programs');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

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
  const sessions = [];
  const { primarySessions, secondaryLifts, accessories, tertiary } = powerliftingMaster;

  // Add primary sessions
  sessions.push(primarySessions.squat, primarySessions.bench, primarySessions.deadlift);

  if (freq === 4) {
    // Add bench volume day
    const benchVol = JSON.parse(JSON.stringify(primarySessions.bench));
    benchVol.focus = "Bench Volume";
    benchVol.exercises.forEach(ex => { if (ex.reps === "4") ex.reps = "8"; if (ex.rpeTarget) ex.rpeTarget = Math.max(5, ex.rpeTarget - 1); });
    sessions.push(benchVol);
  } else if (freq === 5) {
    // Add secondary + tertiary
    let secEx = [];
    if (focus === "squat") secEx = pickItems(secondaryLifts.squatVariations, 2);
    else if (focus === "bench") secEx = pickItems(secondaryLifts.benchVariations, 2);
    else if (focus === "deadlift") secEx = pickItems(secondaryLifts.deadliftVariations, 2);
    else secEx = pickItems([...secondaryLifts.squatVariations, ...secondaryLifts.benchVariations], 2);
    sessions.push({ focus: "Secondary Variation", exercises: secEx });

    let tertEx = [];
    if (focus === "squat") tertEx = pickItems(tertiary.squatTertiary, 2);
    else if (focus === "bench") tertEx = pickItems(tertiary.benchTertiary, 2);
    else if (focus === "deadlift") tertEx = pickItems(tertiary.deadliftTertiary, 2);
    else tertEx = pickItems([...tertiary.squatTertiary, ...tertiary.benchTertiary], 2);
    sessions.push({ focus: "Technique / Tertiary", exercises: tertEx });
  }

  // Accessories
  let selectedAcc = [];
  const accCount = freq === 3 ? 3 : (freq === 4 ? 4 : 5);
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

  // Build weeks 1-4 and deload week 5
  const fullProgram = { name: `Ares Protocol – ${freq}d / ${focus} focus`, logic: "STRENGTH_RPE", useFatigueBudget: true, sessions: [] };
  for (let week = 1; week <= 5; week++) {
    for (let i = 0; i < sessions.length; i++) {
      const sessCopy = JSON.parse(JSON.stringify(sessions[i]));
      sessCopy.week = week;
      sessCopy.day = i+1;
      if (week === 5) {
        sessCopy.exercises.forEach(ex => { if (ex.rpeTarget) ex.rpeTarget = Math.max(5, ex.rpeTarget-2); if (ex.rirTarget) ex.rirTarget = (ex.rirTarget||2)+2; if (ex.sets) ex.sets = Math.max(2, ex.sets-1); });
        if (sessCopy.fatigueCap) sessCopy.fatigueCap = Math.floor(sessCopy.fatigueCap * 0.6);
      } else if (week >= 2) {
        sessCopy.exercises.forEach(ex => { if (ex.rpeTarget) ex.rpeTarget = Math.min(9, ex.rpeTarget+0.5); if (ex.rirTarget) ex.rirTarget = Math.max(1, (ex.rirTarget||2)-0.5); });
        if (week === 4 && sessCopy.fatigueCap) sessCopy.fatigueCap += 2;
      }
      fullProgram.sessions.push(sessCopy);
    }
  }
  return fullProgram;
}

// ========== HYPERTROPHY GENERATOR ==========
function generateHypertrophyProgram(freq, split) {
  const { planeSessions, armsDay, volumeFactors } = hypertrophyMaster;
  let sessions = [];
  if (split === "plane") {
    sessions = [planeSessions.upperHorizontal, planeSessions.lowerQuad, planeSessions.upperVertical, planeSessions.lowerPosterior];
  } else if (split === "upper_lower") {
    sessions = [planeSessions.upperHorizontal, planeSessions.lowerQuad, planeSessions.upperVertical, planeSessions.lowerPosterior];
    sessions[0].focus = "Upper (Horizontal)"; sessions[1].focus = "Lower (Quad)"; sessions[2].focus = "Upper (Vertical)"; sessions[3].focus = "Lower (Posterior)";
  } else if (split === "ppl") {
    // Safely get pools, fallback to empty array if missing
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
  if (freq === 3) sessions = sessions.slice(0,3);
else if (freq === 5) {
    const armsPool = armsDay?.exercisePool ?? [];
    sessions.splice(2, 0, { focus: armsDay?.focus || "Arms & Shoulders", exercisePool: armsPool });
}

  const factor = volumeFactors[freq];
  sessions.forEach(s => {
    const pool = s.exercisePool;
    delete s.exercisePool;
    const num = Math.min(pool.length, factor === 1.2 ? 7 : (factor === 0.8 ? 5 : 6));
    s.exercises = pickItems(pool, num);
    s.exercises.forEach(ex => { if (ex.sets) ex.sets = Math.max(2, Math.floor(ex.sets * factor)); });
  });

  const fullProgram = { name: `Apollo Physique – ${freq}d / ${split.toUpperCase()} split`, logic: "HYPERTROPHY_VOLUME", sessions: [] };
  for (let week = 1; week <= 5; week++) {
    for (let i = 0; i < sessions.length; i++) {
      const sessCopy = JSON.parse(JSON.stringify(sessions[i]));
      sessCopy.week = week;
      sessCopy.day = i+1;
      if (week === 5) {
        sessCopy.exercises.forEach(ex => { if (ex.rirTarget) ex.rirTarget = (ex.rirTarget||2)+2; if (ex.sets) ex.sets = Math.max(2, ex.sets-1); });
      } else if (week >= 3) {
        sessCopy.exercises.forEach(ex => { if (ex.rirTarget) ex.rirTarget = Math.max(1, (ex.rirTarget||2)-0.5); });
      }
      fullProgram.sessions.push(sessCopy);
    }
  }
  return fullProgram;
}

// ========== GENERATE ALL ==========
const freqs = [3,4,5];
const strengthFoci = ["balanced","squat","bench","deadlift"];
const hypertrophySplits = ["upper_lower","ppl","plane"];

for (const freq of freqs) {
  for (const focus of strengthFoci) {
    const prog = generatePowerliftingProgram(freq, focus);
    const fileName = `strength_${freq}d_${focus}.json`;
    fs.writeFileSync(path.join(OUTPUT_DIR, fileName), JSON.stringify(prog, null, 2));
    console.log(`Generated ${fileName}`);
  }
}
for (const freq of freqs) {
  for (const split of hypertrophySplits) {
    const prog = generateHypertrophyProgram(freq, split);
    const fileName = `hypertrophy_${freq}d_${split}.json`;
    fs.writeFileSync(path.join(OUTPUT_DIR, fileName), JSON.stringify(prog, null, 2));
    console.log(`Generated ${fileName}`);
  }
}
console.log("✅ All 21 program files written to frontend/public/programs/");