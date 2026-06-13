// hypertrophyMaster.js – large pool with stretch emphasis
export const hypertrophyMaster = {
  name: "Apollo Physique – Master Database",
  logic: "HYPERTROPHY_VOLUME",

  // Four plane‑bias session templates (each with many exercises to choose from)
  planeSessions: {
    upperHorizontal: {
      focus: "Upper (Horizontal Bias)",
      exercisePool: [
        { liftName: "Barbell Bench Press (full ROM)", sets: 4, reps: "8-12", rirTarget: 2, progressionType: "volume", stretchPriority: "medium", baseFUCost: 0.8 },
        { liftName: "Chest Supported Row (stretch at bottom)", sets: 4, reps: "8-12", rirTarget: 2, progressionType: "volume", stretchPriority: "high", baseFUCost: 0.8 },
        { liftName: "Incline Dumbbell Press (deep stretch)", sets: 3, reps: "10-12", rirTarget: 2, progressionType: "volume", stretchPriority: "high", baseFUCost: 0.8 },
        { liftName: "Seated Cable Row (full stretch)", sets: 3, reps: "10-12", rirTarget: 2, progressionType: "volume", stretchPriority: "high", baseFUCost: 0.8 },
        { liftName: "Dumbbell Flyes (pec stretch)", sets: 3, reps: "12-15", rirTarget: 3, progressionType: "volume", stretchPriority: "high", baseFUCost: 0.8 },
        { liftName: "T‑Bar Row (chest supported)", sets: 3, reps: "10-12", rirTarget: 2, progressionType: "volume", stretchPriority: "medium", baseFUCost: 0.8 },
        { liftName: "Lateral Raises (leaning stretch)", sets: 4, reps: "12-15", rirTarget: 3, progressionType: "volume", stretchPriority: "high", baseFUCost: 0.8 },
        { liftName: "Tricep Pushdowns (overhead variant for stretch)", sets: 3, reps: "12-15", rirTarget: 3, progressionType: "volume", stretchPriority: "high", baseFUCost: 0.8 },
        { liftName: "Bicep Curls (preacher or incline stretch)", sets: 3, reps: "12-15", rirTarget: 3, progressionType: "volume", stretchPriority: "high", baseFUCost: 0.8 }
      ]
    },
    upperVertical: {
      focus: "Upper (Vertical / Shoulder Bias)",
      exercisePool: [
        { liftName: "Overhead Press (full ROM)", sets: 4, reps: "8-12", rirTarget: 2, progressionType: "volume", stretchPriority: "medium", baseFUCost: 0.8 },
        { liftName: "Pull-Ups (weighted, full stretch)", sets: 4, reps: "8-12", rirTarget: 2, progressionType: "volume", stretchPriority: "high", baseFUCost: 0.8 },
        { liftName: "Incline Chest Press Machine (deep stretch)", sets: 3, reps: "10-12", rirTarget: 2, progressionType: "volume", stretchPriority: "high", baseFUCost: 0.8 },
        { liftName: "Single Arm Dumbbell Row (stretch at bottom)", sets: 3, reps: "10 per arm", rirTarget: 2, progressionType: "volume", stretchPriority: "high", baseFUCost: 0.8 },
        { liftName: "Lateral Raises (cable or DB, stretch bias)", sets: 4, reps: "12-15", rirTarget: 3, progressionType: "volume", stretchPriority: "high", baseFUCost: 0.8 },
        { liftName: "Rear Delt Fly (bent over, stretch)", sets: 3, reps: "12-15", rirTarget: 3, progressionType: "volume", stretchPriority: "high", baseFUCost: 0.8 },
        { liftName: "Tricep Overhead Extension (stretch at bottom)", sets: 3, reps: "12-15", rirTarget: 3, progressionType: "volume", stretchPriority: "high", baseFUCost: 0.8 },
        { liftName: "Straight Arm Pulldown (lat stretch)", sets: 3, reps: "12-15", rirTarget: 3, progressionType: "volume", stretchPriority: "high", baseFUCost: 0.8 }
      ]
    },
    lowerQuad: {
      focus: "Lower (Quad Bias)",
      exercisePool: [
        { liftName: "Back Squat (deep, stretch)", sets: 4, reps: "8-12", rirTarget: 2, progressionType: "volume", stretchPriority: "high", baseFUCost: 0.8 },
        { liftName: "Leg Press (deep stretch)", sets: 4, reps: "10-12", rirTarget: 2, progressionType: "volume", stretchPriority: "high", baseFUCost: 0.8 },
        { liftName: "Sissy Squat (or hack squat)", sets: 3, reps: "8-10", rirTarget: 2, progressionType: "volume", stretchPriority: "high", baseFUCost: 0.8 },
        { liftName: "Leg Extension (stretch at bottom)", sets: 3, reps: "12-15", rirTarget: 3, progressionType: "volume", stretchPriority: "high", baseFUCost: 0.8 },
        { liftName: "Walking Lunges (long stride, stretch)", sets: 3, reps: "12 per leg", rirTarget: 2, progressionType: "volume", stretchPriority: "high", baseFUCost: 0.8 },
        { liftName: "Front Squat (upright, quad stretch)", sets: 3, reps: "8-12", rirTarget: 2, progressionType: "volume", stretchPriority: "medium", baseFUCost: 0.8 },
        { liftName: "Standing Calf Raises (full stretch)", sets: 4, reps: "12-15", rirTarget: 3, progressionType: "volume", stretchPriority: "medium", baseFUCost: 0.8 }
      ]
    },
    lowerPosterior: {
      focus: "Lower (Posterior Bias)",
      exercisePool: [
        { liftName: "Romanian Deadlift (deep stretch)", sets: 4, reps: "8-10", rirTarget: 2, progressionType: "volume", stretchPriority: "high", baseFUCost: 0.8 },
        { liftName: "Hip Thrust (hold stretch at top)", sets: 4, reps: "10-12", rirTarget: 2, progressionType: "volume", stretchPriority: "medium", baseFUCost: 0.8 },
        { liftName: "Leg Curl (lying, stretch bias)", sets: 3, reps: "10-12", rirTarget: 2, progressionType: "volume", stretchPriority: "high", baseFUCost: 0.8 },
        { liftName: "Cable Kickback (glute stretch)", sets: 3, reps: "10-12 per leg", rirTarget: 2, progressionType: "volume", stretchPriority: "high", baseFUCost: 0.8 },
        { liftName: "Bulgarian Split Squat (posterior lean, stretch)", sets: 3, reps: "10 per leg", rirTarget: 2, progressionType: "volume", stretchPriority: "high", baseFUCost: 0.8 },
        { liftName: "Good Morning (stretch hamstrings)", sets: 3, reps: "8-12", rirTarget: 2, progressionType: "volume", stretchPriority: "high", baseFUCost: 0.8 },
        { liftName: "Seated Calf Raises (stretch)", sets: 4, reps: "12-15", rirTarget: 3, progressionType: "volume", stretchPriority: "high", baseFUCost: 0.8 },
        { liftName: "Nordic Curl (eccentric stretch)", sets: 3, reps: "6-10", rirTarget: 2, progressionType: "volume", stretchPriority: "high", baseFUCost: 0.8 }
      ]
    }
  },

  // Arms / shoulder special day (for 5-day)
  armsDay: {
    focus: "Arms & Shoulders (Stretch Focus)",
    exercisePool: [
      { liftName: "Tricep Overhead Extension (stretch)", sets: 4, reps: "12-15", rirTarget: 2, baseFUCost: 0.8 },
      { liftName: "Bayesian Cable Curl (stretch)", sets: 4, reps: "12-15", rirTarget: 2, baseFUCost: 0.8 },
      { liftName: "Lateral Raises (leaning stretch)", sets: 4, reps: "15-20", rirTarget: 3, baseFUCost: 0.8 },
      { liftName: "Face Pulls (rear delt stretch)", sets: 3, reps: "15", rirTarget: 3, baseFUCost: 0.8 },
      { liftName: "Concentration Curl (stretch)", sets: 3, reps: "12-15", rirTarget: 2, baseFUCost: 0.8 },
      { liftName: "Skull Crushers (stretch)", sets: 3, reps: "10-12", rirTarget: 2, baseFUCost: 0.8 }
    ]
  },

  // Volume adjustments per frequency
  volumeFactors: {
    3: 0.8,
    4: 1.0,
    5: 1.2
  }
};
