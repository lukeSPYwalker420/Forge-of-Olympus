// coaching.js – rule‑based AI coaching prompts
import Session from "./models/Session.js";   // adjust import paths if needed
import LiftState from "./models/LiftState.js";

const MAIN_LIFTS = [
  "Squat (Top Set)",
  "Bench (Top Set)",
  "Deadlift (Top Set)"
];

/**
 * Fetch recent sessions for a given lift.
 */
async function getRecentSessions(userId, liftName, limit = 6) {
  return Session.find({ userId, liftName })
    .sort({ createdAt: -1 })
    .limit(limit)
    .select("actualWeight repsPerSet actualRPE targetRPE createdAt")
    .lean();
}

/**
 * Produce coaching prompts for a user.
 */
export async function getCoachingPrompts(userId) {
  const liftStates = await LiftState.find({ userId, liftName: { $in: MAIN_LIFTS } });
  const prompts = [];

  for (const state of liftStates) {
    const sessions = await getRecentSessions(userId, state.liftName);
    if (sessions.length < 3) continue;   // not enough data yet

    // Calculate recent 1RM trend
    const rpeToPercent = {
      10: 1.00, 9.5: 0.97, 9: 0.94, 8.5: 0.91, 8: 0.88,
      7.5: 0.85, 7: 0.82, 6.5: 0.79, 6: 0.76, 5.5: 0.73, 5: 0.70
    };
    const oneRMs = sessions.map(s => {
      const bestReps = s.repsPerSet?.length ? Math.max(...s.repsPerSet) : 0;
      const actualRPE = s.actualRPE || 8;
      if (!s.actualWeight || !bestReps) return null;
      const percent = rpeToPercent[actualRPE] || 0.8;
      return Math.round(s.actualWeight / percent);
    }).filter(v => v !== null);

    if (oneRMs.length < 2) continue;

    // Simple linear trend over last 4-6 sessions
    const recent1RMs = oneRMs.slice(-4);
    const x = recent1RMs.map((_, i) => i);
    const y = recent1RMs;
    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const slope = (n * x.reduce((s, xi, i) => s + xi * y[i], 0) - sumX * sumY) /
                  (n * x.reduce((s, xi) => s + xi * xi, 0) - sumX * sumX);
    const trend = slope * n;  // total kg change over the window

    // Average RPE vs target
    const avgActualRPE = sessions.reduce((sum, s) => sum + (s.actualRPE || s.targetRPE || 7.5), 0) / sessions.length;
    const avgTargetRPE = sessions.reduce((sum, s) => sum + (s.targetRPE || 7.5), 0) / sessions.length;
    const rpeDelta = avgActualRPE - avgTargetRPE;

    const liftName = state.liftName;

    // ----- HEURISTICS -----
    if (trend < -2.5 && state.stallCounter >= 2) {
      prompts.push({
        lift: liftName,
        type: "stall_regression",
        message: `Your ${liftName} is trending down and has stalled. Drop working weight by 5% for 2 weeks and focus on explosive reps. Form check recommended.`
      });
    } else if (trend > 1 && rpeDelta < -0.5) {
      prompts.push({
        lift: liftName,
        type: "progress_easy",
        message: `Great progress on ${liftName}! You’re handling the weights easily. Consider increasing the next top‑set RPE by 0.5.`
      });
    } else if (rpeDelta > 1.5) {
      prompts.push({
        lift: liftName,
        type: "rpe_overshoot",
        message: `You’ve been overshooting RPE on ${liftName} by ~${rpeDelta.toFixed(1)} points. Reduce your training max by 2.5% to stay within target intensity.`
      });
    } else if (trend < 0 && rpeDelta > 0.5) {
      prompts.push({
        lift: liftName,
        type: "grinding",
        message: `Your ${liftName} weights are holding but RPE is creeping up. You may be accumulating fatigue. Take a light day or add an extra rest day.`
      });
    } else if (trend > 2 && rpeDelta >= -0.5 && rpeDelta <= 0.5) {
      prompts.push({
        lift: liftName,
        type: "perfect",
        message: `Your ${liftName} is progressing perfectly. Keep following the prescribed RPE and enjoy the gains!`
      });
    }
  }

  // If no specific tips, give a general positive one
  if (prompts.length === 0) {
    prompts.push({
      lift: "overall",
      type: "general",
      message: "Everything looks solid. Keep logging your sets and the engine will keep optimising your training."
    });
  }

  return prompts;
}