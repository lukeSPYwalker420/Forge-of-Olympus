// powerliftingMaster.js
export const powerliftingMaster = {
  name: "Ares Protocol – Master Database",
  logic: "STRENGTH_RPE",
  useFatigueBudget: true,
  
  // Primary lift sessions (each includes top set + back off)
  primarySessions: {
    squat: {
      focus: "Squat Primary",
      baseFatigueCap: 24,
      exercises: [
        { liftName: "Squat (Top Set)", role: "top-set", sets: 1, reps: "4", rpeTarget: 7, baseFUCost: 4, priority: 1, stressTags: ["axial", "knee-dominant"] },
        { liftName: "Squat (Back Off)", role: "back-off", sets: 4, reps: "4", rpeTarget: 6, baseFUCost: 4, priority: 1, stressTags: ["axial", "knee-dominant"] }
      ]
    },
    bench: {
      focus: "Bench Primary",
      baseFatigueCap: 22,
      exercises: [
        { liftName: "Bench Press (Top Set)", role: "top-set", sets: 1, reps: "4", rpeTarget: 7, baseFUCost: 2.5, priority: 1, stressTags: ["push"] },
        { liftName: "Bench Press (Back Off)", role: "back-off", sets: 4, reps: "4", rpeTarget: 6, baseFUCost: 2.5, priority: 1, stressTags: ["push"] }
      ]
    },
    deadlift: {
      focus: "Deadlift Primary",
      baseFatigueCap: 26,
      exercises: [
        { liftName: "Deadlift (Top Set)", role: "top-set", sets: 1, reps: "3", rpeTarget: 7, baseFUCost: 5, priority: 1, stressTags: ["axial", "hinge"] },
        { liftName: "Deadlift (Back Off)", role: "back-off", sets: 3, reps: "3", rpeTarget: 6, baseFUCost: 5, priority: 1, stressTags: ["axial", "hinge"] }
      ]
    }
  },

  // Secondary / variation lifts (for 4-day and 5-day, focus specific)
  secondaryLifts: {
    benchVariations: [
      { liftName: "Paused Bench", sets: 3, reps: "5", rpeTarget: 7, baseFUCost: 2.5, stressTags: ["push"], mechanicalDisadvantage: true, constraintMultiplier: 1.2 },
      { liftName: "Close Grip Bench", sets: 3, reps: "6", rpeTarget: 7, baseFUCost: 2.5, stressTags: ["push"] },
      { liftName: "Spoto Press", sets: 3, reps: "5", rpeTarget: 7, baseFUCost: 2.5, stressTags: ["push"], mechanicalDisadvantage: true, constraintMultiplier: 1.15 },
      { liftName: "Floor Press", sets: 3, reps: "6", rpeTarget: 7, baseFUCost: 2.5, stressTags: ["push"] },
      { liftName: "Board Press (2-board)", sets: 3, reps: "4", rpeTarget: 7.5, baseFUCost: 2.5, stressTags: ["push"] }
    ],
    squatVariations: [
      { liftName: "Paused Squat", sets: 3, reps: "5", rpeTarget: 7, baseFUCost: 3, stressTags: ["axial", "knee-dominant"], mechanicalDisadvantage: true, constraintMultiplier: 1.2 },
      { liftName: "Tempo Squat (3-0-3)", sets: 3, reps: "5", rpeTarget: 7, baseFUCost: 3, stressTags: ["axial", "knee-dominant", "eccentric"], mechanicalDisadvantage: true, constraintMultiplier: 1.4 },
      { liftName: "Front Squat", sets: 3, reps: "6", rpeTarget: 7, baseFUCost: 3, stressTags: ["axial", "knee-dominant"] },
      { liftName: "High Bar Squat", sets: 3, reps: "6", rpeTarget: 7, baseFUCost: 3, stressTags: ["axial", "knee-dominant"] },
      { liftName: "Safety Bar Squat", sets: 3, reps: "5", rpeTarget: 7, baseFUCost: 3, stressTags: ["axial", "knee-dominant"] }
    ],
    deadliftVariations: [
      { liftName: "Deficit Deadlift", sets: 3, reps: "4", rpeTarget: 7, baseFUCost: 4, stressTags: ["hinge", "axial"], mechanicalDisadvantage: true, constraintMultiplier: 1.3 },
      { liftName: "Rack Pull (above knee)", sets: 3, reps: "4", rpeTarget: 7, baseFUCost: 3.5, stressTags: ["hinge", "axial"] },
      { liftName: "Snatch Grip Deadlift", sets: 3, reps: "5", rpeTarget: 7, baseFUCost: 4, stressTags: ["hinge", "axial"], mechanicalDisadvantage: true, constraintMultiplier: 1.25 },
      { liftName: "Romanian Deadlift (heavy)", sets: 3, reps: "6", rpeTarget: 7, baseFUCost: 3, stressTags: ["hinge"] },
      { liftName: "Trap Bar Deadlift", sets: 3, reps: "5", rpeTarget: 7, baseFUCost: 3.5, stressTags: ["axial", "hinge"] }
    ]
  },

  // Accessory pool (reduced FU costs)
  accessories: {
    quads: [
      { liftName: "Leg Press", baseFUCost: 1.0, reps: "10-15", rirTarget: 2, stressTags: ["knee-dominant"] },
      { liftName: "Bulgarian Split Squat", baseFUCost: 1.0, reps: "10-12 per leg", rirTarget: 2, stressTags: ["knee-dominant"] },
      { liftName: "Hack Squat", baseFUCost: 1.0, reps: "10-12", rirTarget: 2, stressTags: ["knee-dominant"] },
      { liftName: "Walking Lunges", baseFUCost: 1.0, reps: "12 per leg", rirTarget: 2, stressTags: ["knee-dominant"] },
      { liftName: "Leg Extensions", baseFUCost: 0.7, reps: "12-15", rirTarget: 2, stressTags: ["knee-dominant"] },
      { liftName: "Goblet Squat", baseFUCost: 0.7, reps: "12-15", rirTarget: 2, stressTags: ["knee-dominant"] }
    ],
    posterior: [
      { liftName: "Romanian Deadlift", baseFUCost: 1.5, reps: "8-12", rirTarget: 2, stressTags: ["hinge"] },
      { liftName: "Leg Curl (lying)", baseFUCost: 1.0, reps: "10-15", rirTarget: 2, stressTags: ["hinge"] },
      { liftName: "Seated Leg Curl", baseFUCost: 1.0, reps: "10-15", rirTarget: 2, stressTags: ["hinge"] },
      { liftName: "Hip Thrust", baseFUCost: 1.0, reps: "10-15", rirTarget: 2, stressTags: ["hinge"] },
      { liftName: "Good Morning", baseFUCost: 1.5, reps: "8-12", rirTarget: 2, stressTags: ["axial", "hinge"] },
      { liftName: "Nordic Curl", baseFUCost: 1.0, reps: "6-10", rirTarget: 2, stressTags: ["hinge", "eccentric"] },
      { liftName: "45° Hyperextension", baseFUCost: 0.7, reps: "12-15", rirTarget: 2, stressTags: ["hinge"] }
    ],
    push: [
      { liftName: "Incline Dumbbell Press", baseFUCost: 1.0, reps: "8-12", rirTarget: 2, stressTags: ["push"] },
      { liftName: "Overhead Press", baseFUCost: 1.5, reps: "8-12", rirTarget: 2, stressTags: ["push"] },
      { liftName: "Dips (weighted)", baseFUCost: 1.0, reps: "8-12", rirTarget: 2, stressTags: ["push"] },
      { liftName: "Tricep Pushdowns", baseFUCost: 0.7, reps: "12-15", rirTarget: 2, stressTags: ["push"] },
      { liftName: "JM Press", baseFUCost: 0.7, reps: "10-12", rirTarget: 2, stressTags: ["push"] },
      { liftName: "Cable Flyes", baseFUCost: 0.7, reps: "12-15", rirTarget: 2, stressTags: ["push"] },
      { liftName: "Machine Press (plate loaded)", baseFUCost: 1.0, reps: "8-12", rirTarget: 2, stressTags: ["push"] }
    ],
    pull: [
      { liftName: "Pull-Ups", baseFUCost: 1.0, reps: "8-12", rirTarget: 2, stressTags: ["pull"] },
      { liftName: "Chest Supported Row", baseFUCost: 1.0, reps: "8-12", rirTarget: 2, stressTags: ["pull"] },
      { liftName: "Lat Pulldown", baseFUCost: 1.0, reps: "10-12", rirTarget: 2, stressTags: ["pull"] },
      { liftName: "Seated Cable Row", baseFUCost: 1.0, reps: "10-12", rirTarget: 2, stressTags: ["pull"] },
      { liftName: "Face Pulls", baseFUCost: 0.7, reps: "15-20", rirTarget: 2, stressTags: ["pull", "rear delt"] },
      { liftName: "Barbell Row", baseFUCost: 1.0, reps: "8-12", rirTarget: 2, stressTags: ["pull"] },
      { liftName: "Bicep Curls", baseFUCost: 0.7, reps: "12-15", rirTarget: 2, stressTags: ["pull"] },
      { liftName: "Hammer Curls", baseFUCost: 0.7, reps: "12-15", rirTarget: 2, stressTags: ["pull"] }
    ]
  },

  // Tertiary lifts for 5-day frequency (extra volume, light technique)
  tertiary: {
    squatTertiary: [
      { liftName: "Pin Squat (light)", sets: 3, reps: "5", rpeTarget: 6, baseFUCost: 1.5, stressTags: ["axial", "knee-dominant"], mechanicalDisadvantage: true, constraintMultiplier: 1.3 },
      { liftName: "Belt Squat", sets: 3, reps: "10", rpeTarget: 6, baseFUCost: 1.0, stressTags: ["knee-dominant"] }
    ],
    benchTertiary: [
      { liftName: "Feet Up Bench", sets: 3, reps: "8", rpeTarget: 6, baseFUCost: 1.0, stressTags: ["push"] },
      { liftName: "Slingshot Bench", sets: 3, reps: "5", rpeTarget: 7, baseFUCost: 1.5, stressTags: ["push"] }
    ],
    deadliftTertiary: [
      { liftName: "Snatch Grip Rack Pull", sets: 3, reps: "5", rpeTarget: 6, baseFUCost: 1.5, stressTags: ["hinge", "axial"] },
      { liftName: "Block Pull", sets: 3, reps: "4", rpeTarget: 6.5, baseFUCost: 1.5, stressTags: ["hinge", "axial"] }
    ]
  }
};