// meetPrepGenerator.js
import { meetPrepMaster } from './scripts/programData/meetPrepMaster.js';

function pickItems(arr, count) {
  if (!arr.length) return [];
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor((i + 1) * 0.618033988749895) % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count);
}

function computeFatigueCap(exercises, buffer = 1.2) {
  let total = 0;
  for (const ex of exercises) {
    const baseFU = ex.baseFUCost !== undefined ? ex.baseFUCost : 1;
    const rpeMult = 1.15;
    total += baseFU * rpeMult * (ex.sets || 3);
  }
  return Math.ceil(total * buffer);
}

export function generateMeetPrepProgram(freq, durationWeeks = 8, focusLift = "balanced") {
  const { waveTemplates, coreLifts, variationPool, accessoryPool, volumeFactors } = meetPrepMaster;
  const wave = waveTemplates[durationWeeks] || waveTemplates[8];
  const factor = volumeFactors[freq] || 1.0;
  const sessions = [];

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

      if (dayNum === 1) exercises.push(...coreLifts.filter(l => l.liftName.includes('Squat')));
      if (dayNum === 2 || dayNum === 4) exercises.push(...coreLifts.filter(l => l.liftName.includes('Bench')));
      if (dayNum === 3 || dayNum === 5) exercises.push(...coreLifts.filter(l => l.liftName.includes('Deadlift')));

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

      let accessoryCount = freq === 3 ? 2 : (freq === 4 ? 3 : 4);
      if (weekData.rpeBase >= 8.5) accessoryCount = Math.max(1, accessoryCount - 1);
      if (isTaper) accessoryCount = Math.max(0, accessoryCount - 1);
      if (accessoryCount > 0) {
        const allAcc = [...accessoryPool.quads, ...accessoryPool.posterior, ...accessoryPool.push, ...accessoryPool.pull];
        const selected = pickItems(allAcc, accessoryCount);
        exercises.push(...selected);
      }

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
    name: `Meet Prep – ${freq}d / ${durationWeeks} weeks`,
    logic: "STRENGTH_RPE",
    useFatigueBudget: true,
    sessions
  };
}