// hypertrophyMaster.js – large pool with stretch emphasis
export const hypertrophyMaster = {
  name: "Apollo Physique – Master Database",
  logic: "HYPERTROPHY_VOLUME",

  // Four plane‑bias session templates (each with many exercises to choose from)
  planeSessions: {
    upperHorizontal: {
      focus: "Upper (Horizontal Bias)",
      exercisePool: [
        { liftName: "Barbell Bench Press (full ROM)", sets: 4, reps: "8-12", rirTarget: 2, progressionType: "volume", stretchPriority: "medium" },
        { liftName: "Chest Supported Row (stretch at bottom)", sets: 4, reps: "8-12", rirTarget: 2, progressionType: "volume", stretchPriority: "high" },
        { liftName: "Incline Dumbbell Press (deep stretch)", sets: 3, reps: "10-12", rirTarget: 2, progressionType: "volume", stretchPriority: "high" },
        { liftName: "Seated Cable Row (full stretch)", sets: 3, reps: "10-12", rirTarget: 2, progressionType: "volume", stretchPriority: "high" },
        { liftName: "Dumbbell Flyes (pec stretch)", sets: 3, reps: "12-15", rirTarget: 3, progressionType: "volume", stretchPriority: "high" },
        { liftName: "T‑Bar Row (chest supported)", sets: 3, reps: "10-12", rirTarget: 2, progressionType: "volume", stretchPriority: "medium" },
        { liftName: "Lateral Raises (leaning stretch)", sets: 4, reps: "12-15", rirTarget: 3, progressionType: "volume", stretchPriority: "high" },
        { liftName: "Tricep Pushdowns (overhead variant for stretch)", sets: 3, reps: "12-15", rirTarget: 3, progressionType: "volume", stretchPriority: "high" },
        { liftName: "Bicep Curls (preacher or incline stretch)", sets: 3, reps: "12-15", rirTarget: 3, progressionType: "volume", stretchPriority: "high" }
      ]
    },
    upperVertical: {
      focus: "Upper (Vertical / Shoulder Bias)",
      exercisePool: [
        { liftName: "Overhead Press (full ROM)", sets: 4, reps: "8-12", rirTarget: 2, progressionType: "volume", stretchPriority: "medium" },
        { liftName: "Pull-Ups (weighted, full stretch)", sets: 4, reps: "8-12", rirTarget: 2, progressionType: "volume", stretchPriority: "high" },
        { liftName: "Incline Chest Press Machine (deep stretch)", sets: 3, reps: "10-12", rirTarget: 2, progressionType: "volume", stretchPriority: "high" },
        { liftName: "Single Arm Dumbbell Row (stretch at bottom)", sets: 3, reps: "10 per arm", rirTarget: 2, progressionType: "volume", stretchPriority: "high" },
        { liftName: "Lateral Raises (cable or DB, stretch bias)", sets: 4, reps: "12-15", rirTarget: 3, progressionType: "volume", stretchPriority: "high" },
        { liftName: "Rear Delt Fly (bent over, stretch)", sets: 3, reps: "12-15", rirTarget: 3, progressionType: "volume", stretchPriority: "high" },
        { liftName: "Tricep Overhead Extension (stretch at bottom)", sets: 3, reps: "12-15", rirTarget: 3, progressionType: "volume", stretchPriority: "high" },
        { liftName: "Straight Arm Pulldown (lat stretch)", sets: 3, reps: "12-15", rirTarget: 3, progressionType: "volume", stretchPriority: "high" }
      ]
    },
    lowerQuad: {
      focus: "Lower (Quad Bias)",
      exercisePool: [
        { liftName: "Back Squat (deep, stretch)", sets: 4, reps: "8-12", rirTarget: 2, progressionType: "volume", stretchPriority: "high" },
        { liftName: "Leg Press (deep stretch)", sets: 4, reps: "10-12", rirTarget: 2, progressionType: "volume", stretchPriority: "high" },
        { liftName: "Sissy Squat (or hack squat)", sets: 3, reps: "8-10", rirTarget: 2, progressionType: "volume", stretchPriority: "high" },
        { liftName: "Leg Extension (stretch at bottom)", sets: 3, reps: "12-15", rirTarget: 3, progressionType: "volume", stretchPriority: "high" },
        { liftName: "Walking Lunges (long stride, stretch)", sets: 3, reps: "12 per leg", rirTarget: 2, progressionType: "volume", stretchPriority: "high" },
        { liftName: "Front Squat (upright, quad stretch)", sets: 3, reps: "8-12", rirTarget: 2, progressionType: "volume", stretchPriority: "medium" },
        { liftName: "Standing Calf Raises (full stretch)", sets: 4, reps: "12-15", rirTarget: 3, progressionType: "volume", stretchPriority: "medium" }
      ]
    },
    lowerPosterior: {
      focus: "Lower (Posterior Bias)",
      exercisePool: [
        { liftName: "Romanian Deadlift (deep stretch)", sets: 4, reps: "8-10", rirTarget: 2, progressionType: "volume", stretchPriority: "high" },
        { liftName: "Hip Thrust (hold stretch at top)", sets: 4, reps: "10-12", rirTarget: 2, progressionType: "volume", stretchPriority: "medium" },
        { liftName: "Leg Curl (lying, stretch bias)", sets: 3, reps: "10-12", rirTarget: 2, progressionType: "volume", stretchPriority: "high" },
        { liftName: "Cable Kickback (glute stretch)", sets: 3, reps: "10-12 per leg", rirTarget: 2, progressionType: "volume", stretchPriority: "high" },
        { liftName: "Bulgarian Split Squat (posterior lean, stretch)", sets: 3, reps: "10 per leg", rirTarget: 2, progressionType: "volume", stretchPriority: "high" },
        { liftName: "Good Morning (stretch hamstrings)", sets: 3, reps: "8-12", rirTarget: 2, progressionType: "volume", stretchPriority: "high" },
        { liftName: "Seated Calf Raises (stretch)", sets: 4, reps: "12-15", rirTarget: 3, progressionType: "volume", stretchPriority: "high" },
        { liftName: "Nordic Curl (eccentric stretch)", sets: 3, reps: "6-10", rirTarget: 2, progressionType: "volume", stretchPriority: "high" }
      ]
    }
  },

  // Arms / shoulder special day (for 5-day)
  armsDay: {
    focus: "Arms & Shoulders (Stretch Focus)",
    exercisePool: [
      { liftName: "Tricep Overhead Extension (stretch)", sets: 4, reps: "12-15", rirTarget: 2 },
      { liftName: "Bayesian Cable Curl (stretch)", sets: 4, reps: "12-15", rirTarget: 2 },
      { liftName: "Lateral Raises (leaning stretch)", sets: 4, reps: "15-20", rirTarget: 3 },
      { liftName: "Face Pulls (rear delt stretch)", sets: 3, reps: "15", rirTarget: 3 },
      { liftName: "Concentration Curl (stretch)", sets: 3, reps: "12-15", rirTarget: 2 },
      { liftName: "Skull Crushers (stretch)", sets: 3, reps: "10-12", rirTarget: 2 }
    ]
  },

  // Volume adjustments per frequency
  volumeFactors: {
    3: 0.8,
    4: 1.0,
    5: 1.2
  }
};