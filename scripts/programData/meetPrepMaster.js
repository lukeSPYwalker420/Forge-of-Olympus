// scripts/programData/meetPrepMaster.js
export const meetPrepMaster = {
  name: "Meet Prep – Master Database",
  logic: "STRENGTH_RPE",
  useFatigueBudget: true,

  // Peaking wave templates (8 weeks, 6 weeks, etc.)
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

  // Taper options (last 1-2 weeks)
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

  // Core lifts (always present)
  coreLifts: [
    { liftName: "Squat (Comp)", role: "top-set", sets: 1, reps: "1-3", rpeTarget: 8, baseFUCost: 4, stressTags: ["axial","knee-dominant"] },
    { liftName: "Squat (Back Off)", role: "back-off", sets: 3, reps: "3-5", rpeTarget: 7, baseFUCost: 4, stressTags: ["axial","knee-dominant"] },
    { liftName: "Bench (Comp)", role: "top-set", sets: 1, reps: "1-3", rpeTarget: 8, baseFUCost: 2.5, stressTags: ["push"] },
    { liftName: "Bench (Back Off)", role: "back-off", sets: 3, reps: "3-5", rpeTarget: 7, baseFUCost: 2.5, stressTags: ["push"] },
    { liftName: "Deadlift (Comp)", role: "top-set", sets: 1, reps: "1-2", rpeTarget: 8, baseFUCost: 5, stressTags: ["axial","hinge"] },
    { liftName: "Deadlift (Back Off)", role: "back-off", sets: 2, reps: "2-3", rpeTarget: 7, baseFUCost: 5, stressTags: ["axial","hinge"] }
  ],

  // Variation lifts (rotated weekly)
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

  // Accessories (minimal during peak, more during accumulation) – reduced FU costs
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

  // Volume factor per week (inverse of RPE increase)
  volumeFactors: {
    3: 0.85,
    4: 1.0,
    5: 1.15
  }
};