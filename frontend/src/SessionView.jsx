import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import Skeleton from "./Skeleton";
import SessionReadiness from "./SessionReadiness";

export default function SessionView() {
  const [subscriptionActive, setSubscriptionActive] = useState(true);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [inputs, setInputs] = useState({});
  const [week, setWeek] = useState(() => {
    const saved = localStorage.getItem("nextWeek");
    return saved ? parseInt(saved) : 1;
  });
  const [day, setDay] = useState(() => {
    const saved = localStorage.getItem("nextDay");
    return saved ? parseInt(saved) : 1;
  });
  const [history, setHistory] = useState({});
  const [showReadiness, setShowReadiness] = useState(true);
  const [adjustments, setAdjustments] = useState({ rpeAdjustment: 0, rirAdjustment: 0, qualityAdjustment: 0 });
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [workoutSummary, setWorkoutSummary] = useState(null);
  const [completedExerciseCount, setCompletedExerciseCount] = useState(0);

  const [missedOpportunityBanner, setMissedOpportunityBanner] = useState(null);
  const [nextPreview, setNextPreview] = useState(null);

  const userId = localStorage.getItem("userId");
  const program = localStorage.getItem("program");

  // Fetch session data WITH readiness adjustments included
  useEffect(() => {
    if (!userId || !program) return;

    const rpeAdj = adjustments.rpeAdjustment || 0;
    const rirAdj = adjustments.rirAdjustment || 0;
    const qualityAdj = adjustments.qualityAdjustment || 0;

    const url = `/api/session-view/${week}/${day}/${userId}?program=${encodeURIComponent(program)}&rpeAdjustment=${rpeAdj}&rirAdjustment=${rirAdj}&qualityAdjustment=${qualityAdj}`;

    fetch(url)
      .then(res => {
        if (!res.ok) throw new Error("Failed to fetch");
        return res.json();
      })
      .then(setData)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [week, day, userId, program, adjustments]);

  // Check subscription status
  useEffect(() => {
    const checkSubscription = async () => {
      try {
        const userEmail = localStorage.getItem("userEmail");
        const isAdmin = userEmail === "kieren2203@googlemail.com";

        if (isAdmin) {
          setSubscriptionActive(true);
          setCheckingStatus(false);
          return;
        }

        const res = await fetch(`/api/subscription-status/${userId}`);
        const data = await res.json();
        setSubscriptionActive(data.active);
      } catch (err) {
        console.error("Subscription check error:", err);
      } finally {
        setCheckingStatus(false);
      }
    };

    if (userId) checkSubscription();
  }, [userId]);

  const handleReadinessComplete = (readinessData) => {
    setAdjustments(readinessData.adjustments);
    setShowReadiness(false);
  };

  const handleUndoLastEntry = async (liftName) => {
    if (!confirm("Undo the last entry for this exercise?")) return;

    try {
      const historyRes = await fetch(`/api/history/${userId}/${encodeURIComponent(liftName)}`);
      const hist = await historyRes.json();

      if (hist.length === 0) {
        alert("No entries to undo");
        return;
      }

      const lastEntry = hist[0];

      await fetch(`/api/session-log/${lastEntry._id}`, {
        method: "DELETE"
      });

      await fetchHistory(liftName);

      // Refresh data (keep same adjustments)
      const rpeAdj = adjustments.rpeAdjustment || 0;
      const rirAdj = adjustments.rirAdjustment || 0;
      const qualityAdj = adjustments.qualityAdjustment || 0;
      const url = `/api/session-view/${week}/${day}/${userId}?program=${encodeURIComponent(program)}&rpeAdjustment=${rpeAdj}&rirAdjustment=${rirAdj}&qualityAdjustment=${qualityAdj}`;
      const res = await fetch(url);
      const json = await res.json();
      setData(json);

      alert("Last entry undone!");
    } catch (err) {
      console.error(err);
      alert("Failed to undo");
    }
  };

  const loadNextPreview = async () => {
    try {
      const nextRes = await fetch(`/api/next-session/${userId}?program=${encodeURIComponent(program)}`);
      if (!nextRes.ok) return;
      const { week: nextWeek, day: nextDay } = await nextRes.json();
      if (nextWeek && nextDay) {
        const rpeAdj = adjustments.rpeAdjustment || 0;
        const rirAdj = adjustments.rirAdjustment || 0;
        const qualityAdj = adjustments.qualityAdjustment || 0;
        const previewUrl = `/api/session-view/${nextWeek}/${nextDay}/${userId}?program=${encodeURIComponent(program)}&rpeAdjustment=${rpeAdj}&rirAdjustment=${rirAdj}&qualityAdjustment=${qualityAdj}`;
        const previewRes = await fetch(previewUrl);
        const previewData = await previewRes.json();
        if (previewData.projected && previewData.projected.length) {
          setNextPreview(previewData.projected.slice(0, 2));
        }
      }
    } catch (err) {
      console.error("Failed to load next preview", err);
    }
  };

  const handleAutoFill = (lift) => {
    const newInputs = { ...inputs };
    const liftInputs = newInputs[lift.liftName] || {};

    // Fill reps per set based on target reps
    const targetRepsPerSet = [];
    const targetRepsValue = lift.reps;

    let targetRepsNumber = 8;
    if (targetRepsValue) {
      if (typeof targetRepsValue === 'string' && targetRepsValue.includes('-')) {
        const parts = targetRepsValue.split('-').map(Number);
        targetRepsNumber = parts[1] || parts[0];
      } else {
        targetRepsNumber = parseInt(targetRepsValue, 10);
      }
    }

    for (let i = 0; i < (lift.sets || 1); i++) {
      targetRepsPerSet.push(targetRepsNumber);
    }
    liftInputs.repsPerSet = targetRepsPerSet;

    // Fill weight from server-calculated current weight (already adjusted by server)
    if (lift.currentWeight && lift.currentWeight > 0) {
      liftInputs.weight = lift.currentWeight;
    }

    // Fill RPE for strength programs (use adjusted target if available)
    if (lift.progressionType === "strength" || data?.logic === "STRENGTH_RPE") {
      const targetRPE = lift.adjustedRpeTarget || lift.rpeTarget;
      liftInputs.rpe = targetRPE;
    }

    // Fill RIR for hypertrophy programs
    if (data?.logic === "HYPERTROPHY_VOLUME" || lift.progressionType === "volume") {
      const targetRIR = lift.adjustedRirTarget || lift.rirTarget;
      liftInputs.rir = targetRIR;
    }

    // Fill quality for power programs
    if (lift.progressionType === "power") {
      const targetQuality = lift.adjustedQualityTarget || lift.qualityTarget;
      liftInputs.quality = targetQuality;
    }

    // Fill stability/pain for mobility programs
    if (lift.progressionType === "mobility") {
      liftInputs.stability = lift.adjustedStabilityTarget || lift.stabilityTarget || 7;
      liftInputs.pain = lift.painTarget || 4;
    }

    newInputs[lift.liftName] = liftInputs;
    setInputs(newInputs);
  };

  const markExerciseComplete = () => {
    const newCount = completedExerciseCount + 1;
    setCompletedExerciseCount(newCount);

    if (newCount === data?.projected?.length) {
      generateWorkoutSummary();
      loadNextPreview(); // loads the next workout preview
    }
  };

  const generateWorkoutSummary = async () => {
    try {
      const res = await fetch(`/api/workout-summary/${userId}?program=${encodeURIComponent(program)}&week=${week}&day=${day}`);
      if (res.ok) {
        const summary = await res.json();
        setWorkoutSummary(summary);
        setShowCompletionModal(true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const logSet = async (lift) => {
    const liftName = lift.liftName;
    const targetReps = lift.reps;
    const targetSets = lift.sets;
    // Use adjusted targets if available (from server)
    let targetRPE = lift.adjustedRpeTarget || lift.rpeTarget;
    let targetRIR = lift.adjustedRirTarget || lift.rirTarget;
    const targetQuality = lift.adjustedQualityTarget || lift.qualityTarget;
    const targetROM = lift.romTarget;
    const targetPain = lift.painTarget || 4;
    const targetStability = lift.adjustedStabilityTarget || lift.stabilityTarget || 7;
    const progressionType = lift.progressionType;
    const logic = data.logic;

    const streakRes = await fetch(`/api/streak/${userId}`);
    if (streakRes.ok) {
      const { streak } = await streakRes.json();
      localStorage.setItem("streak", streak);
    }

    try {
      const weight = inputs[liftName]?.weight;
      if (!weight && progressionType !== "mobility" && progressionType !== "power") {
        alert("Enter weight first");
        return;
      }

      let actualRPE = null;
      let actualRIR = null;
      let actualQuality = null;
      let actualROM = null;
      let actualPain = null;
      let actualStability = null;
      const repsPerSet = inputs[liftName]?.repsPerSet || [];

      if (progressionType === "strength" || logic === "STRENGTH_RPE") {
        actualRPE = Number(inputs[liftName]?.rpe || targetRPE);
      } else if (progressionType === "power") {
        actualQuality = Number(inputs[liftName]?.quality || targetQuality);
      } else if (progressionType === "mobility") {
        actualStability = Number(inputs[liftName]?.stability || targetStability);
        actualPain = Number(inputs[liftName]?.pain || targetPain);
      } else if (logic === "HYPERTROPHY_VOLUME" || progressionType === "volume") {
        actualRIR = Number(inputs[liftName]?.rir || targetRIR);
      }

      const repsCompleted = repsPerSet.reduce((sum, r) => sum + (parseInt(r) || 0), 0);

      await fetch("/api/session-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          programName: program,
          week: data.program?.week,
          day: data.program?.day,
          liftName,
          targetReps: typeof targetReps === 'string' ? targetReps : String(targetReps),
          targetSets,
          repsPerSet: repsPerSet.map(r => parseInt(r) || 0),
          repsCompleted,
          targetRPE,
          targetRIR,
          targetQuality,
          targetROM,
          targetPain,
          targetStability,
          actualRPE,
          actualRIR,
          actualQuality,
          actualROM,
          actualPain,
          actualStability,
          actualWeight: weight ? Number(weight) : null,
          completed: true,
          progressionType
        })
      });

      // “You would have missed this” moment
      if (weight && targetRPE && lift.rpeTarget && lift.currentWeight) {
        const staticWeight = Math.round((lift.currentWeight / 0.82) * 0.82 / 2.5) * 2.5;
        if (staticWeight > 0 && staticWeight !== weight) {
          setMissedOpportunityBanner({
            liftName: lift.liftName,
            staticWeight,
            actualWeight: weight
          });
          setTimeout(() => setMissedOpportunityBanner(null), 5000);
        }
      }

      await new Promise(resolve => setTimeout(resolve, 500));

      await fetch("/api/progression/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, liftName, logic })
      });

      // Refresh data (keep same adjustments)
      const rpeAdj = adjustments.rpeAdjustment || 0;
      const rirAdj = adjustments.rirAdjustment || 0;
      const qualityAdj = adjustments.qualityAdjustment || 0;
      const url = `/api/session-view/${week}/${day}/${userId}?program=${encodeURIComponent(program)}&rpeAdjustment=${rpeAdj}&rirAdjustment=${rirAdj}&qualityAdjustment=${qualityAdj}`;
      const res = await fetch(url);
      const json = await res.json();
      setData(json);

      await fetchHistory(liftName);

      setInputs(prev => ({ ...prev, [liftName]: {} }));
      markExerciseComplete();
    } catch (err) {
      console.error(err);
      alert("Error logging set: " + err.message);
    }
  };

  const fetchHistory = async (liftName) => {
    try {
      const res = await fetch(`/api/history/${userId}/${encodeURIComponent(liftName)}`);
      const hist = await res.json();
      setHistory(prev => ({ ...prev, [liftName]: hist }));
    } catch (err) {
      console.error(err);
    }
  };

  if (!userId) return <Navigate to="/login" replace />;
  if (!program) return <Navigate to="/program" replace />;
  if (showReadiness && data?.logic) {
    return <SessionReadiness onComplete={handleReadinessComplete} programLogic={data.logic} />;
  }
  if (loading) return (
    <div className="dashboard-container">
      <Skeleton />
      <Skeleton />
      <Skeleton />
    </div>
  );
  if (error) return <div>Error: {error}</div>;
  if (!data) return <div>No data returned</div>;

  const getMetricLabel = (lift) => {
    const pt = lift.progressionType;
    if (pt === "power") return "Quality (1-10)";
    if (pt === "mobility") return "Stability (1-10) / Pain (1-10)";
    if (pt === "strength" || data.logic === "STRENGTH_RPE") return "RPE";
    if (data.logic === "HYPERTROPHY_VOLUME" || pt === "volume") return "RIR";
    return "RPE";
  };

  const getTargetValue = (lift) => {
    const pt = lift.progressionType;

    if (pt === "power") {
      const target = lift.adjustedQualityTarget || lift.qualityTarget;
      return target || "—";
    }
    if (pt === "mobility") {
      const stability = lift.adjustedStabilityTarget || lift.stabilityTarget || 7;
      const pain = lift.painTarget || 4;
      return `Stability ≥${stability} / Pain ≤${pain}`;
    }
    if (pt === "strength" || data.logic === "STRENGTH_RPE") {
      const target = lift.adjustedRpeTarget || lift.rpeTarget;
      return target || "—";
    }
    if (data.logic === "HYPERTROPHY_VOLUME" || pt === "volume") {
      const target = lift.adjustedRirTarget || lift.rirTarget;
      return target || "—";
    }
    return "—";
  };

  return (
    <div style={{ padding: 30, fontFamily: "system-ui", maxWidth: 900, margin: "0 auto" }}>
      {/* missed opportunity banner */}
      {missedOpportunityBanner && (
        <div style={{
          background: "#ffaa4422",
          borderLeft: "4px solid #ffaa44",
          padding: "12px",
          marginBottom: "20px",
          borderRadius: "8px"
        }}>
          <strong>💡 You would have missed this lift!</strong><br />
          A static plan would have told you {missedOpportunityBanner.staticWeight}kg for {missedOpportunityBanner.liftName}, but you did {missedOpportunityBanner.actualWeight}kg – that’s {Math.abs(missedOpportunityBanner.actualWeight - missedOpportunityBanner.staticWeight)}kg more!
        </div>
      )}

      <div style={{ marginBottom: 25 }}>
        <h1>Week {data.program?.week ?? "?"} — Day {data.program?.day ?? "?"}</h1>
        <p style={{ opacity: 0.7 }}>{data.program?.focus ?? "No focus found"}</p>
      </div>
      <div style={{ marginBottom: 25, display: "flex", gap: 15 }}>
        <div>
          <label>Week</label><br />
          <select value={week} onChange={e => setWeek(Number(e.target.value))}>
            {(data.availableWeeks || [1,2,3,4]).map(w => (
              <option key={w} value={w}>Week {w}</option>
            ))}
          </select>
        </div>
        <div>
          <label>Day</label><br />
          <select value={day} onChange={e => setDay(Number(e.target.value))}>
            {(data.availableDaysPerWeek?.[week] || [1,2,3,4,5,6,7]).map(d => (
              <option key={d} value={d}>Day {d}</option>
            ))}
          </select>
        </div>
      </div>

      {!subscriptionActive && !checkingStatus && (
        <div style={{
          background: "#ffaa4422",
          border: "1px solid #ffaa44",
          borderRadius: "8px",
          padding: "12px",
          marginBottom: "20px",
          textAlign: "center"
        }}>
          <strong>⚠️ Your subscription has ended.</strong> You can still log workouts manually,
          but recommended weights are hidden. <a href="/" style={{ color: "#ffaa44" }}>Resubscribe</a> to unlock full guidance.
        </div>
      )}

      <div style={{ display: "grid", gap: 20 }}>
        {(data.projected || []).map((lift, i) => {
          const pt = lift.progressionType;
          const currentRepsInputs = inputs[lift.liftName]?.repsPerSet || [];

          return (
            <div key={i} style={{ border: "1px solid #e5e5e5", borderRadius: 12, padding: 20 }}>
              <h3>
                {lift.liftName}
                {lift.descendingSet && (
                  <span style={{
                    fontSize: "0.7rem",
                    background: "#6a5acd",
                    color: "#fff",
                    padding: "2px 8px",
                    borderRadius: "12px",
                    marginLeft: "8px",
                    verticalAlign: "middle"
                  }}>⇊ Descending</span>
                )}
              </h3>
              <div style={{ display: "flex", gap: 20, marginBottom: 10, flexWrap: "wrap" }}>
                <span>Sets: {lift.sets}</span>
                <span>Reps: {lift.reps}</span>
                <span>{getMetricLabel(lift)} Target: {getTargetValue(lift)}</span>
                {(lift.adjustedRpeTarget || lift.adjustedRirTarget || lift.adjustedQualityTarget || lift.adjustedStabilityTarget) && (
                  <span style={{
                    fontSize: "0.65rem",
                    color: "#a1a1aa",
                    marginLeft: "6px",
                    fontStyle: "italic"
                  }}>(auto‑adjusted)</span>
                )}
              </div>
              <div style={{ display: "flex", gap: 20, marginBottom: 15, fontWeight: "bold", flexWrap: "wrap" }}>
                {subscriptionActive ? (
                  <>
                    <span>Current: {lift.currentWeight ?? 0}kg</span>
                    <span>Next: {lift.projectedNextWeight ?? 0}kg</span>
                    {lift.fatigueAdjusted && (
                    <span style={{
                      fontSize: "0.65rem",
                      color: "#ffaa44",
                      marginLeft: "8px",
                      fontStyle: "italic"
                    }}>⚡ fatigue‑adjusted</span>
                  )}
                  </>
                ) : (
                  <span style={{ color: "#ffaa44" }}>
                    ⚡ Subscribe to see recommended weights
                  </span>
                )}
              </div>

              <div style={{ display: "flex", gap: 10, marginBottom: 15, flexWrap: "wrap" }}>
                {pt !== "mobility" && (
                  <input
                    type="number"
                    placeholder={lift.currentWeight > 0 ? `${lift.currentWeight} kg` : "Weight (kg)"}
                    style={{ padding: 8, width: "100px" }}
                    value={inputs[lift.liftName]?.weight || ""}
                    onChange={e => setInputs(prev => ({ ...prev, [lift.liftName]: { ...prev[lift.liftName], weight: e.target.value } }))}
                  />
                )}

                {pt === "power" && (
                  <input
                    type="number"
                    placeholder="Quality (1-10)"
                    style={{ padding: 8, width: "100px" }}
                    value={inputs[lift.liftName]?.quality || ""}
                    onChange={e => setInputs(prev => ({ ...prev, [lift.liftName]: { ...prev[lift.liftName], quality: e.target.value } }))}
                  />
                )}

                {pt === "mobility" && (
                  <>
                    <input
                      type="number"
                      placeholder={lift.currentWeight > 0 ? `${lift.currentWeight} kg` : "Weight (kg)"}
                      style={{ padding: 8, width: "100px" }}
                      value={inputs[lift.liftName]?.weight || ""}
                      onChange={e => setInputs(prev => ({ ...prev, [lift.liftName]: { ...prev[lift.liftName], weight: e.target.value } }))}
                    />
                    <input
                      type="number"
                      placeholder="Stability (1-10)"
                      style={{ padding: 8, width: "100px" }}
                      value={inputs[lift.liftName]?.stability || ""}
                      onChange={e => setInputs(prev => ({ ...prev, [lift.liftName]: { ...prev[lift.liftName], stability: e.target.value } }))}
                    />
                    <input
                      type="number"
                      placeholder="Pain (1-10)"
                      style={{ padding: 8, width: "100px" }}
                      value={inputs[lift.liftName]?.pain || ""}
                      onChange={e => setInputs(prev => ({ ...prev, [lift.liftName]: { ...prev[lift.liftName], pain: e.target.value } }))}
                    />
                  </>
                )}

                {(pt === "strength" || data.logic === "STRENGTH_RPE") && (
                  <input
                    type="number"
                    step="0.5"
                    placeholder="RPE"
                    style={{ padding: 8, width: "80px" }}
                    value={inputs[lift.liftName]?.rpe || ""}
                    onChange={e => setInputs(prev => ({ ...prev, [lift.liftName]: { ...prev[lift.liftName], rpe: e.target.value } }))}
                  />
                )}

                {(data.logic === "HYPERTROPHY_VOLUME" || pt === "volume") && (
                  <input
                    type="number"
                    placeholder="RIR"
                    style={{ padding: 8, width: "80px" }}
                    value={inputs[lift.liftName]?.rir || ""}
                    onChange={e => setInputs(prev => ({ ...prev, [lift.liftName]: { ...prev[lift.liftName], rir: e.target.value } }))}
                  />
                )}
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 15 }}>
                <span style={{ fontWeight: "bold", minWidth: "50px" }}>Sets:</span>
                {[...Array(lift.sets || 3)].map((_, idx) => (
                  <input
                    key={idx}
                    type="number"
                    placeholder={`Set ${idx + 1}`}
                    style={{ padding: 8, width: "70px" }}
                    value={currentRepsInputs[idx] || ""}
                    onChange={e => {
                      const current = inputs[lift.liftName] || {};
                      const newReps = [...(current.repsPerSet || [])];
                      newReps[idx] = e.target.value;
                      setInputs(prev => ({
                        ...prev,
                        [lift.liftName]: { ...current, repsPerSet: newReps }
                      }));
                    }}
                  />
                ))}
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button onClick={() => logSet(lift)} style={{ padding: "10px 15px", borderRadius: 8, border: "none", background: "#111", color: "#fff", cursor: "pointer" }}>
                  Log Set
                </button>
                <button
                  onClick={() => handleAutoFill(lift)}
                  disabled={!subscriptionActive}
                  style={{
                    padding: "10px 15px",
                    borderRadius: 8,
                    border: "1px solid #4caf50",
                    background: subscriptionActive ? "#4caf50" : "#666",
                    color: "#fff",
                    cursor: subscriptionActive ? "pointer" : "not-allowed",
                    opacity: subscriptionActive ? 1 : 0.5
                  }}
                >
                  ⚡ Auto Fill
                </button>
                <button onClick={() => handleUndoLastEntry(lift.liftName)} style={{ padding: "10px 15px", borderRadius: 8, border: "1px solid #ff9800", background: "#ff9800", color: "#fff", cursor: "pointer" }}>
                  ↩ Undo Last
                </button>
                <button onClick={() => fetchHistory(lift.liftName)} style={{ padding: "10px 15px", borderRadius: 8, border: "1px solid #ccc", background: "#fff", cursor: "pointer" }}>
                  History
                </button>
                <button onClick={() => setInputs(prev => ({ ...prev, [lift.liftName]: {} }))} style={{ padding: "6px 12px", fontSize: "12px", background: "#444", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer" }}>
                  Clear
                </button>
              </div>

              {history[lift.liftName] && history[lift.liftName].length > 0 && (
                <div style={{ marginTop: 10, background: "#f5f5f5", padding: 10, color: "#000", borderRadius: 8 }}>
                  <strong>History:</strong>
                  {history[lift.liftName].map((entry, idx) => {
                    let metricStr = "";
                    if (entry.actualRPE) metricStr = `RPE ${entry.actualRPE}`;
                    else if (entry.actualRIR) metricStr = `RIR ${entry.actualRIR}`;
                    else if (entry.actualStability && entry.actualPain) metricStr = `Stability ${entry.actualStability} / Pain ${entry.actualPain}`;
                    else if (entry.actualStability) metricStr = `Stability ${entry.actualStability}`;
                    else if (entry.actualROM) metricStr = `ROM ${entry.actualROM}% / Pain ${entry.actualPain}`;
                    const setsInfo = entry.repsPerSet && entry.repsPerSet.length ? `Sets: [${entry.repsPerSet.join(", ")}]` : `${entry.repsCompleted || 0} reps`;
                    return (
                      <div key={idx} style={{ fontSize: 14 }}>
                        {new Date(entry.createdAt).toLocaleDateString()} — {entry.actualWeight ? `${entry.actualWeight}kg x ` : ""}{setsInfo} {metricStr}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* next workout preview */}
      {nextPreview && (
        <div style={{ marginTop: "30px", padding: "16px", background: "#1e1e2a", borderRadius: "12px", border: "1px solid var(--accent)" }}>
          <h4>🔮 Next workout preview</h4>
          {nextPreview.map(lift => (
            <div key={lift.liftName} style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
              <span>{lift.liftName}</span>
              <strong>{lift.currentWeight}kg</strong>
            </div>
          ))}
        </div>
      )}

      {/* Workout Completion Modal */}
      {showCompletionModal && workoutSummary && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.95)", zIndex: 2000,
          display: "flex", alignItems: "center", justifyContent: "center", padding: "20px",
          overflowY: "auto"
        }}>
          <div style={{
            background: "var(--card-bg, #1e1e2a)", borderRadius: "24px", padding: "30px",
            maxWidth: "500px", width: "100%", border: "1px solid var(--accent, #d4af37)",
            maxHeight: "90vh", overflowY: "auto"
          }}>
            <h2 style={{ color: "var(--accent, #d4af37)", marginBottom: "8px" }}>Workout Complete! 🎉</h2>
            <p style={{ color: "var(--text-gray, #a1a1aa)", marginBottom: "20px" }}>Great work today</p>

            <div style={{ marginBottom: "24px" }}>
              <h3 style={{ fontSize: "1rem", marginBottom: "12px" }}>📊 Session Stats</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div style={{ background: "var(--bg-light, #2a2a35)", padding: "12px", borderRadius: "8px", textAlign: "center" }}>
                  <div style={{ fontSize: "24px", fontWeight: "bold", color: "var(--accent, #d4af37)" }}>{workoutSummary.timeToComplete}</div>
                  <div style={{ fontSize: "12px", color: "var(--text-gray, #a1a1aa)" }}>Time</div>
                </div>
                <div style={{ background: "var(--bg-light, #2a2a35)", padding: "12px", borderRadius: "8px", textAlign: "center" }}>
                  <div style={{ fontSize: "24px", fontWeight: "bold", color: "var(--accent, #d4af37)" }}>{workoutSummary.totalVolume}kg</div>
                  <div style={{ fontSize: "12px", color: "var(--text-gray, #a1a1aa)" }}>Total Volume</div>
                </div>
                <div style={{ background: "var(--bg-light, #2a2a35)", padding: "12px", borderRadius: "8px", textAlign: "center" }}>
                  <div style={{ fontSize: "24px", fontWeight: "bold", color: "var(--accent, #d4af37)" }}>{workoutSummary.exercisesCompleted}</div>
                  <div style={{ fontSize: "12px", color: "var(--text-gray, #a1a1aa)" }}>Exercises</div>
                </div>
                <div style={{ background: "var(--bg-light, #2a2a35)", padding: "12px", borderRadius: "8px", textAlign: "center" }}>
                  <div style={{ fontSize: "24px", fontWeight: "bold", color: "var(--accent, #d4af37)" }}>{workoutSummary.streak} 🔥</div>
                  <div style={{ fontSize: "12px", color: "var(--text-gray, #a1a1aa)" }}>Day Streak</div>
                </div>
              </div>
            </div>

            {workoutSummary.prs && workoutSummary.prs.length > 0 && (
              <div style={{ marginBottom: "24px" }}>
                <h3 style={{ fontSize: "1rem", marginBottom: "12px" }}>🏆 Personal Records</h3>
                <ul style={{ listStyle: "none", padding: 0 }}>
                  {workoutSummary.prs.map((pr, i) => (
                    <li key={i} style={{ padding: "4px 0", color: "#4caf50" }}>✓ {pr}</li>
                  ))}
                </ul>
              </div>
            )}

            {workoutSummary.underRPE && workoutSummary.underRPE.length > 0 && (
              <div style={{ marginBottom: "24px" }}>
                <h3 style={{ fontSize: "1rem", marginBottom: "12px" }}>💪 Nailed It</h3>
                <ul style={{ listStyle: "none", padding: 0 }}>
                  {workoutSummary.underRPE.map((r, i) => (
                    <li key={i} style={{ padding: "4px 0", color: "var(--accent, #d4af37)" }}>✓ {r}</li>
                  ))}
                </ul>
              </div>
            )}

            {workoutSummary.nextFocus && (
              <div style={{ marginBottom: "24px", background: "var(--bg-light, #2a2a35)", padding: "16px", borderRadius: "8px" }}>
                <h3 style={{ fontSize: "1rem", marginBottom: "8px" }}>📝 Next Session Focus</h3>
                <p style={{ fontSize: "14px", color: "var(--text-gray, #a1a1aa)" }}>{workoutSummary.nextFocus}</p>
              </div>
            )}

            <div style={{ display: "flex", gap: "12px", marginTop: "20px", flexWrap: "wrap" }}>
              <button
                onClick={() => {
                  const shareText = `I finally stopped guessing my weights. @ForgeOfOlympus calculates every set based on my actual performance. 30 days free.`;
                  window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`, '_blank');
                }}
                style={{ flex: 1, padding: "12px", background: "#1da1f2", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer" }}
              >
                🐦 Share on X
              </button>
              <button
                onClick={() => {
                  const shareText = `🔥 Just crushed my ${program} workout on Forge of Olympus!\n\nWeek ${week}, Day ${day}\n✅ ${workoutSummary.exercisesCompleted} exercises completed\n💪 ${workoutSummary.prs?.length || 0} personal records\n⏱️ ${workoutSummary.timeToComplete}`;
                  window.open(`https://www.facebook.com/sharer/sharer.php?u=https://forge-of-olympus.onrender.com&quote=${encodeURIComponent(shareText)}`, '_blank');
                }}
                style={{ flex: 1, padding: "12px", background: "#4267B2", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer" }}
              >
                📘 Share on Facebook
              </button>
              <button
                onClick={() => {
                  setShowCompletionModal(false);
                  window.location.href = "/dashboard";
                }}
                style={{ flex: 1, padding: "12px", background: "var(--accent, #d4af37)", color: "#000", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" }}
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}