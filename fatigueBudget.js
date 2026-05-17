// fatigueBudget.js – Constraint‑based fatigue unit engine

/**
 * RPE → multiplier mapping
 */
const RPEMultiplier = {
  5: 0.85,
  5.5: 0.92,
  6: 1.0,
  6.5: 1.08,
  7: 1.15,
  7.5: 1.22,
  8: 1.3,
  8.5: 1.45,
  9: 1.6,
  9.5: 1.8,
  10: 2.0,
};

/**
 * Weekly stress baselines (FU per tag) – initial fixed values
 */
const WeeklyStressBaselines = {
  axial: 30,
  hinge: 25,
  "knee-dominant": 22,
  push: 28,
  pull: 20,
  eccentric: 18,
};

/**
 * Calculate FU for a single set of an exercise.
 */
export function fatigueUnitsPerSet(exercise, rpeOverride = null, stressMultiplier = 1.0) {
  const base = exercise.baseFUCost || 1;
  const rpe = rpeOverride ?? exercise.rpeTarget ?? 7;
  const rpeMult = RPEMultiplier[rpe] || 1.0;
  const constraint = exercise.constraintMultiplier || 1.0;
  return Math.round((base * rpeMult * constraint * stressMultiplier) * 10) / 10;
}

/**
 * Compute total FU for a list of exercises (with their current sets/reps).
 * Returns { totalFU, tagLoads: { tag: totalFU } }
 */
export function calculateSessionLoad(exercises) {
  let totalFU = 0;
  const tagLoads = {};

  for (const ex of exercises) {
    const fuPerSet = fatigueUnitsPerSet(ex);
    const sets = ex.sets || 0;
    const totalExFU = fuPerSet * sets;
    totalFU += totalExFU;

    if (ex.stressTags && Array.isArray(ex.stressTags)) {
      for (const tag of ex.stressTags) {
        tagLoads[tag] = (tagLoads[tag] || 0) + totalExFU;
      }
    }
  }
  return { totalFU, tagLoads };
}

/**
 * Given completed sessions for the current week, compute cumulative tag loads.
 */
export function computeWeeklyTagLoads(sessions) {
  const weekly = {};
  for (const sess of sessions) {
    if (!sess.stressTagTotals) continue;
    for (const [tag, load] of Object.entries(sess.stressTagTotals)) {
      weekly[tag] = (weekly[tag] || 0) + load;
    }
  }
  return weekly;
}

/**
 * Compute stress overload multiplier for an exercise, based on weekly tag loads.
 * Returns a multiplier (1.0 = no overload, up to 1.3 for heavy overload).
 */
export function stressOverloadMultiplier(exercise, weeklyTagLoads) {
  if (!exercise.stressTags || exercise.stressTags.length === 0) return 1.0;
  let maxOverload = 1.0;
  for (const tag of exercise.stressTags) {
    const baseline = WeeklyStressBaselines[tag] || 20;
    const current = weeklyTagLoads[tag] || 0;
    const ratio = current / baseline;
    if (ratio > 0.8) {
      // linear scale: 1.0 at 0.8, 1.3 at 1.2
      const excess = Math.min(ratio - 0.8, 0.4);
      const tagMult = 1.0 + (excess / 0.4) * 0.3;
      if (tagMult > maxOverload) maxOverload = tagMult;
    }
  }
  return Math.round(maxOverload * 100) / 100;
}

/**
 * Allocate sets for a session, respecting fatigueCap and priority tiers.
 * Modifies the exercises array in place: reduces `sets` field for lower‑priority exercises.
 * Returns { totalFU, overloadedTags: string[] } for frontend flags.
 */
export function allocateSessionBudget(exercises, fatigueCap, weeklyTagLoads) {
  // Sort by priority (ascending). If no priority, treat as 3.
  const sorted = [...exercises].sort((a, b) => (a.priority || 3) - (b.priority || 3));

  let totalFU = 0;
  const overloadedTags = new Set();

  // First pass: compute FU per set for each exercise, record tag overloads
  for (const ex of sorted) {
    const stressMult = stressOverloadMultiplier(ex, weeklyTagLoads);
    if (stressMult > 1.0) {
      ex._stressOverload = stressMult;
      if (ex.stressTags) {
        ex.stressTags.forEach(t => overloadedTags.add(t));
      }
    }
  }

  // Second pass: allocate full sets until cap reached
  for (const ex of sorted) {
    const stressMult = ex._stressOverload || 1.0;
    const fuPerSet = fatigueUnitsPerSet(ex, null, stressMult);
    const originalSets = ex.sets;
    let allocatedSets = 0;

    for (let i = 0; i < originalSets; i++) {
      if (totalFU + fuPerSet <= fatigueCap) {
        totalFU += fuPerSet;
        allocatedSets++;
      } else {
        break;
      }
    }
    ex.sets = allocatedSets;
  }

  // If totalFU still under cap and some exercises got zero sets, it's fine; the cap is a maximum.
  return {
    totalFU: Math.round(totalFU * 10) / 10,
    overloadedTags: [...overloadedTags],
  };
}