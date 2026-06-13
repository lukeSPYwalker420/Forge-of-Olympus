// scripts/programData/meetPrepMaster.js
export const meetPrepMaster = {
  name: "Meet Prep – Master Database",
  logic: "STRENGTH_RPE",
  useFatigueBudget: true,

  // ========== NEW: waveTemplates for dynamic duration selection ==========
  waveTemplates: {
    8: {
      weeks: [
        { week: 1, phase: "Hypertrophy", rpeBase: 6, volumeFactor: 1.0, fatigueCap: 26 },
        { week: 2, phase: "Hypertrophy", rpeBase: 6.5, volumeFactor: 1.0, fatigueCap: 28 },
        { week: 3, phase: "Strength", rpeBase: 7, volumeFactor: 0.95, fatigueCap: 28 },
        { week: 4, phase: "Strength", rpeBase: 7.5, volumeFactor: 0.9, fatigueCap: 28 },
        { week: 5, phase: "Peak", rpeBase: 8, volumeFactor: 0.85, fatigueCap: 26 },
        { week: 6, phase: "Peak", rpeBase: 8.5, volumeFactor: 0.8, fatigueCap: 26 },
        { week: 7, phase: "Taper", rpeBase: 8.5, volumeFactor: 0.7, fatigueCap: 22 },
        { week: 8, phase: "Taper", rpeBase: 9, volumeFactor: 0.6, fatigueCap: 20 }
      ]
    },
    12: {
      weeks: [
        { week: 1, phase: "Hypertrophy", rpeBase: 6, volumeFactor: 1.0, fatigueCap: 26 },
        { week: 2, phase: "Hypertrophy", rpeBase: 6.5, volumeFactor: 1.0, fatigueCap: 28 },
        { week: 3, phase: "Hypertrophy", rpeBase: 6.5, volumeFactor: 1.0, fatigueCap: 28 },
        { week: 4, phase: "Strength", rpeBase: 7, volumeFactor: 0.95, fatigueCap: 28 },
        { week: 5, phase: "Strength", rpeBase: 7.5, volumeFactor: 0.95, fatigueCap: 28 },
        { week: 6, phase: "Strength", rpeBase: 7.5, volumeFactor: 0.9, fatigueCap: 28 },
        { week: 7, phase: "Peak", rpeBase: 8, volumeFactor: 0.85, fatigueCap: 26 },
        { week: 8, phase: "Peak", rpeBase: 8.5, volumeFactor: 0.85, fatigueCap: 26 },
        { week: 9, phase: "Peak", rpeBase: 8.5, volumeFactor: 0.8, fatigueCap: 26 },
        { week: 10, phase: "Taper", rpeBase: 8.5, volumeFactor: 0.75, fatigueCap: 22 },
        { week: 11, phase: "Taper", rpeBase: 9, volumeFactor: 0.65, fatigueCap: 20 },
        { week: 12, phase: "Taper", rpeBase: 9, volumeFactor: 0.55, fatigueCap: 18 }
      ]
    },
    16: {
      weeks: [
        { week: 1, phase: "Hypertrophy", rpeBase: 6, volumeFactor: 1.0, fatigueCap: 26 },
        { week: 2, phase: "Hypertrophy", rpeBase: 6.5, volumeFactor: 1.0, fatigueCap: 28 },
        { week: 3, phase: "Hypertrophy", rpeBase: 6.5, volumeFactor: 1.0, fatigueCap: 28 },
        { week: 4, phase: "Hypertrophy", rpeBase: 7, volumeFactor: 1.0, fatigueCap: 28 },
        { week: 5, phase: "Strength", rpeBase: 7, volumeFactor: 0.95, fatigueCap: 28 },
        { week: 6, phase: "Strength", rpeBase: 7.5, volumeFactor: 0.95, fatigueCap: 28 },
        { week: 7, phase: "Strength", rpeBase: 7.5, volumeFactor: 0.9, fatigueCap: 28 },
        { week: 8, phase: "Strength", rpeBase: 8, volumeFactor: 0.9, fatigueCap: 28 },
        { week: 9, phase: "Peak", rpeBase: 8, volumeFactor: 0.85, fatigueCap: 26 },
        { week: 10, phase: "Peak", rpeBase: 8.5, volumeFactor: 0.85, fatigueCap: 26 },
        { week: 11, phase: "Peak", rpeBase: 8.5, volumeFactor: 0.8, fatigueCap: 26 },
        { week: 12, phase: "Peak", rpeBase: 9, volumeFactor: 0.8, fatigueCap: 24 },
        { week: 13, phase: "Taper", rpeBase: 9, volumeFactor: 0.7, fatigueCap: 22 },
        { week: 14, phase: "Taper", rpeBase: 9, volumeFactor: 0.65, fatigueCap: 20 },
        { week: 15, phase: "Taper", rpeBase: 9.5, volumeFactor: 0.6, fatigueCap: 18 },
        { week: 16, phase: "Meet Week", rpeBase: 9.5, volumeFactor: 0.5, fatigueCap: 16 }
      ]
    }
  },

  // Keep your existing peakingWaves for backward compatibility
  peakingWaves: {
    "8week": {
      duration: 8,
      weeks: [
        { week: 1, rpeBase: 7, volumeFactor: 1.0, fatigueCap: 26, description: "Accumulation" },
        { week: 2, rpeBase: 7.5, volumeFactor: 1.0, fatigueCap: 28, description: "Intensification" },
        { week: 3, rpeBase: 8, volumeFactor: 0.9, fatigueCap: 28, description: "Overreach" },
        { week: 4, rpeBase: 7, volumeFactor: 0.8, fatigueCap: 22, description: "Deload" },
        { week: 5, rpeBase: 7.5, volumeFactor: 0.9, fatigueCap: 26, description: "Transmutation" },
        { week: 6, rpeBase: 8, volumeFactor: 0.8, fatigueCap: 26, description: "Peak intensity" },
        { week: 7, rpeBase: 8.5, volumeFactor: 0.7, fatigueCap: 24, description: "Realisation" },
        { week: 8, rpeBase: 9, volumeFactor: 0.6, fatigueCap: 20, description: "Taper / Openers" }
      ]
    },
    "6week": {
      duration: 6,
      weeks: [
        { week: 1, rpeBase: 7, volumeFactor: 1.0, fatigueCap: 26 },
        { week: 2, rpeBase: 7.5, volumeFactor: 1.0, fatigueCap: 28 },
        { week: 3, rpeBase: 8, volumeFactor: 0.9, fatigueCap: 28 },
        { week: 4, rpeBase: 7, volumeFactor: 0.8, fatigueCap: 22 },
        { week: 5, rpeBase: 8, volumeFactor: 0.8, fatigueCap: 24 },
        { week: 6, rpeBase: 9, volumeFactor: 0.6, fatigueCap: 20 }
      ]
    }
  },

  // Keep your existing properties unchanged
  taperOptions: {
    standard: {
      weekFactor: 0.8,
      rpeDrop: -1,
      setDrop: 0.7,
      description: "Moderate volume drop, intensity maintained"
    },
    aggressive: {
      weekFactor: 0.6,
      rpeDrop: -1.5,
      setDrop: 0.5,
      description: "High specificity, low fatigue"
    }
  },

  coreLifts: [
    { liftName: "Squat (Comp)", role: "top-set", sets: 1, reps: "1-3", rpeTarget: 8, baseFUCost: 4, stressTags: ["axial","knee-dominant"] },
    { liftName: "Squat (Back Off)", role: "back-off", sets: 3, reps: "3-5", rpeTarget: 7, baseFUCost: 4, stressTags: ["axial","knee-dominant"] },
    { liftName: "Bench (Comp)", role: "top-set", sets: 1, reps: "1-3", rpeTarget: 8, baseFUCost: 2.5, stressTags: ["push"] },
    { liftName: "Bench (Back Off)", role: "back-off", sets: 3, reps: "3-5", rpeTarget: 7, baseFUCost: 2.5, stressTags: ["push"] },
    { liftName: "Deadlift (Comp)", role: "top-set", sets: 1, reps: "1-2", rpeTarget: 8, baseFUCost: 5, stressTags: ["axial","hinge"] },
    { liftName: "Deadlift (Back Off)", role: "back-off", sets: 2, reps: "2-3", rpeTarget: 7, baseFUCost: 5, stressTags: ["axial","hinge"] }
  ],

  variationPool: {
    squat: [
      { liftName: "Paused Squat", baseFUCost: 3, mechanicalDisadvantage: true, constraintMultiplier: 1.2 },
      { liftName: "Tempo Squat (3-0-3)", baseFUCost: 3, mechanicalDisadvantage: true },
      { liftName: "High Bar Squat", baseFUCost: 3 },
      { liftName: "SSB Squat", baseFUCost: 3 }
    ],
    bench: [
      { liftName: "Spoto Press", baseFUCost: 2.5, mechanicalDisadvantage: true },
      { liftName: "Close Grip Bench", baseFUCost: 2.5 },
      { liftName: "Floor Press", baseFUCost: 2.5 },
      { liftName: "Board Press (2-board)", baseFUCost: 2.5 }
    ],
    deadlift: [
      { liftName: "Deficit Deadlift", baseFUCost: 4, mechanicalDisadvantage: true },
      { liftName: "Rack Pull", baseFUCost: 3.5 },
      { liftName: "Snatch Grip Deadlift", baseFUCost: 4 },
      { liftName: "Romanian Deadlift", baseFUCost: 3 }
    ]
  },

  accessoryPool: {
    quads: [
      { liftName: "Leg Press", baseFUCost: 1.0, reps: "8-12", rirTarget: 2 },
      { liftName: "Bulgarian Split Squat", baseFUCost: 1.0, reps: "8-12", rirTarget: 2 }
    ],
    posterior: [
      { liftName: "Leg Curl", baseFUCost: 1.0, reps: "10-15", rirTarget: 2 },
      { liftName: "Hip Thrust", baseFUCost: 1.0, reps: "10-12", rirTarget: 2 }
    ],
    push: [
      { liftName: "Tricep Pushdowns", baseFUCost: 0.7, reps: "10-15", rirTarget: 2 },
      { liftName: "Overhead Press", baseFUCost: 1.5, reps: "8-12", rirTarget: 2 }
    ],
    pull: [
      { liftName: "Pull-Ups", baseFUCost: 1.0, reps: "8-12", rirTarget: 2 },
      { liftName: "Face Pulls", baseFUCost: 0.7, reps: "15-20", rirTarget: 2 }
    ]
  },

  volumeFactors: {
    3: 0.85,
    4: 1.0,
    5: 1.15
  }
};
};
