import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import Skeleton from "./Skeleton";
import SessionReadiness from "./SessionReadiness";
import "./Dashboard.css"; // Reuse premium styling

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
  const [adjustments, setAdjustments] = useState({
    rpeAdjustment: 0,
    rirAdjustment: 0,
    qualityAdjustment: 0,
    painAdjustment: 0,
    stabilityAdjustment: 0,
  });
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [workoutSummary, setWorkoutSummary] = useState(null);
  const [completedLifts, setCompletedLifts] = useState(new Set());
  const [missedOpportunityBanner, setMissedOpportunityBanner] = useState(null);
  const [nextPreview, setNextPreview] = useState(null);

  // Onboarding state
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);
  const [onboardingLifts, setOnboardingLifts] = useState([]);
  const [onboardingValues, setOnboardingValues] = useState({});
  const [onboardingSubmitting, setOnboardingSubmitting] = useState(false);

  const userId = localStorage.getItem("userId");
  const program = localStorage.getItem("program");

  // Fetch session data (working endpoint)
  useEffect(() => {
    if (!userId || !program) return;

    const rpeAdj = adjustments.rpeAdjustment || 0;
    const rirAdj = adjustments.rirAdjustment || 0;
    const qualityAdj = adjustments.qualityAdjustment || 0;
    const painAdj = adjustments.painAdjustment || 0;
    const stabAdj = adjustments.stabilityAdjustment || 0;

    const url = `/api/session-view/${week}/${day}/${userId}?program=${encodeURIComponent(program)}`
      + `&rpeAdjustment=${rpeAdj}&rirAdjustment=${rirAdj}&qualityAdjustment=${qualityAdj}`
      + `&painAdjustment=${painAdj}&stabilityAdjustment=${stabAdj}`;

    fetch(url)
      .then(res => {
        if (!res.ok) throw new Error("Failed to fetch session data");
        return res.json();
      })
      .then(setData)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [week, day, userId, program, adjustments]);

  // Subscription status
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

  // Detect missing 1RM for strength lifts (onboarding)
  useEffect(() => {
    if (!data || loading) return;

    const missing = data.projected?.filter(lift => {
      const isStrength = lift.progressionType === "strength" || data.logic === "STRENGTH_RPE";
      const hasZeroWeight = !lift.currentWeight || lift.currentWeight === 0;
      const noExistingState = !history[lift.liftName] || history[lift.liftName].length === 0;
      return isStrength && hasZeroWeight && noExistingState;
    }) || [];

    if (missing.length > 0) {
      setOnboardingLifts(missing);
      const initialValues = {};
      missing.forEach(lift => { initialValues[lift.liftName] = ""; });
      setOnboardingValues(initialValues);
      setShowOnboardingModal(true);
    }
  }, [data, loading, history]);

  const handleInitializeLifts = async () => {
    setOnboardingSubmitting(true);
    try {
      for (const lift of onboardingLifts) {
        const estimated1RM = Number(onboardingValues[lift.liftName]);
        if (!estimated1RM || estimated1RM <= 0) {
          alert(`Please enter a valid 1RM for ${lift.liftName}`);
          setOnboardingSubmitting(false);
          return;
        }
        await fetch("/api/initialize-lift", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, liftName: lift.liftName, estimated1RM })
        });
      }
      // Refresh session data
      const rpeAdj = adjustments.rpeAdjustment || 0;
      const rirAdj = adjustments.rirAdjustment || 0;
      const qualityAdj = adjustments.qualityAdjustment || 0;
      const painAdj = adjustments.painAdjustment || 0;
      const stabAdj = adjustments.stabilityAdjustment || 0;
      const url = `/api/session-view/${week}/${day}/${userId}?program=${encodeURIComponent(program)}`
        + `&rpeAdjustment=${rpeAdj}&rirAdjustment=${rirAdj}&qualityAdjustment=${qualityAdj}`
        + `&painAdjustment=${painAdj}&stabilityAdjustment=${stabAdj}`;
      const res = await fetch(url);
      const json = await res.json();
      setData(json);
      setShowOnboardingModal(false);
      setOnboardingLifts([]);
      setOnboardingValues({});
      alert("Lifts initialised! You can now use Auto Fill.");
    } catch (err) {
      console.error(err);
      alert("Failed to initialise lifts: " + err.message);
    } finally {
      setOnboardingSubmitting(false);
    }
  };

  const handleReadinessComplete = (readinessData) => {
    setAdjustments({
      rpeAdjustment: readinessData.adjustments.rpeAdjustment ?? 0,
      rirAdjustment: readinessData.adjustments.rirAdjustment ?? 0,
      qualityAdjustment: 0,
      painAdjustment: readinessData.adjustments.painAdjustment ?? 0,
      stabilityAdjustment: readinessData.adjustments.stabilityAdjustment ?? 0,
    });
    setShowReadiness(false);
  };

  const handleUndoLastEntry = async (liftName) => {
    if (!confirm("Undo the last entry for this exercise?")) return;
    try {
      const historyRes = await fetch(`/api/history/${userId}/${encodeURIComponent(liftName)}`);
      const hist = await historyRes.json();
      if (hist.length === 0) { alert("No entries to undo"); return; }
      const lastEntry = hist[0];
      await fetch(`/api/session-log/${lastEntry._id}`, { method: "DELETE" });
      await fetchHistory(liftName);
      const rpeAdj = adjustments.rpeAdjustment || 0;
      const rirAdj = adjustments.rirAdjustment || 0;
      const qualityAdj = adjustments.qualityAdjustment || 0;
      const painAdj = adjustments.painAdjustment || 0;
      const stabAdj = adjustments.stabilityAdjustment || 0;
      const url = `/api/session-view/${week}/${day}/${userId}?program=${encodeURIComponent(program)}`
        + `&rpeAdjustment=${rpeAdj}&rirAdjustment=${rirAdj}&qualityAdjustment=${qualityAdj}`
        + `&painAdjustment=${painAdj}&stabilityAdjustment=${stabAdj}`;
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
        const painAdj = adjustments.painAdjustment || 0;
        const stabAdj = adjustments.stabilityAdjustment || 0;
        const previewUrl = `/api/session-view/${nextWeek}/${nextDay}/${userId}?program=${encodeURIComponent(program)}`
          + `&rpeAdjustment=${rpeAdj}&rirAdjustment=${rirAdj}&qualityAdjustment=${qualityAdj}`
          + `&painAdjustment=${painAdj}&stabilityAdjustment=${stabAdj}`;
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
    for (let i = 0; i < (lift.sets || 1); i++) targetRepsPerSet.push(targetRepsNumber);
    liftInputs.repsPerSet = targetRepsPerSet;

    if (lift.currentWeight && lift.currentWeight > 0) liftInputs.weight = lift.currentWeight;
    if (lift.progressionType === "strength" || data?.logic === "STRENGTH_RPE") {
      liftInputs.rpe = lift.adjustedRpeTarget || lift.rpeTarget;
    }
    if (data?.logic === "HYPERTROPHY_VOLUME" || lift.progressionType === "volume") {
      liftInputs.rir = lift.adjustedRirTarget || lift.rirTarget;
    }
    if (lift.progressionType === "power") {
      liftInputs.quality = lift.adjustedQualityTarget || lift.qualityTarget;
    }
    if (lift.progressionType === "mobility") {
      liftInputs.stability = lift.adjustedStabilityTarget || lift.stabilityTarget || 7;
      liftInputs.pain = lift.painTarget || 4;
    }
    newInputs[lift.liftName] = liftInputs;
    setInputs(newInputs);
  };

  const markExerciseComplete = (liftName) => {
    const updated = new Set(completedLifts);
    if (updated.has(liftName)) return;
    updated.add(liftName);
    setCompletedLifts(updated);
    if (updated.size === data?.projected?.length) {
      generateWorkoutSummary();
      loadNextPreview();
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
    const progressionType = lift.progressionType;
    const logic = data.logic;

    let targetRPE = lift.adjustedRpeTarget || lift.rpeTarget;
    if (progressionType === "strength" && targetRPE === undefined) targetRPE = 7;
    let targetRIR = lift.adjustedRirTarget || lift.rirTarget;
    const targetQuality = lift.adjustedQualityTarget || lift.qualityTarget;
    const targetROM = lift.romTarget;
    const targetPain = lift.painTarget || 4;
    const targetStability = lift.adjustedStabilityTarget || lift.stabilityTarget || 7;

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

      let actualRPE = null, actualRIR = null, actualQuality = null, actualROM = null, actualPain = null, actualStability = null;
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
          userId, programName: program, week: data.program?.week, day: data.program?.day,
          liftName, role: lift.role,
          targetReps: typeof targetReps === 'string' ? targetReps : String(targetReps),
          targetSets, repsPerSet: repsPerSet.map(r => parseInt(r) || 0), repsCompleted,
          targetRPE, targetRIR, targetQuality, targetROM, targetPain, targetStability,
          actualRPE, actualRIR, actualQuality, actualROM, actualPain, actualStability,
          actualWeight: weight ? Number(weight) : null, completed: true, progressionType
        })
      });

      if (weight && targetRPE && lift.rpeTarget && lift.currentWeight) {
        const staticWeight = Math.round((lift.currentWeight / 0.82) * 0.82 / 2.5) * 2.5;
        if (staticWeight > 0 && staticWeight !== weight) {
          setMissedOpportunityBanner({ liftName, staticWeight, actualWeight: weight });
          setTimeout(() => setMissedOpportunityBanner(null), 5000);
        }
      }

      await new Promise(resolve => setTimeout(resolve, 500));
      await fetch("/api/progression/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, liftName, logic })
      });

      const rpeAdj = adjustments.rpeAdjustment || 0;
      const rirAdj = adjustments.rirAdjustment || 0;
      const qualityAdj = adjustments.qualityAdjustment || 0;
      const painAdj = adjustments.painAdjustment || 0;
      const stabAdj = adjustments.stabilityAdjustment || 0;
      const url = `/api/session-view/${week}/${day}/${userId}?program=${encodeURIComponent(program)}`
        + `&rpeAdjustment=${rpeAdj}&rirAdjustment=${rirAdj}&qualityAdjustment=${qualityAdj}`
        + `&painAdjustment=${painAdj}&stabilityAdjustment=${stabAdj}`;
      const res = await fetch(url);
      const json = await res.json();
      setData(json);
      await fetchHistory(liftName);
      setInputs(prev => ({ ...prev, [liftName]: {} }));
      markExerciseComplete(lift.liftName);
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
    } catch (err) { console.error(err); }
  };

  // Authentication & loading guards
  if (!userId) return <Navigate to="/login" replace />;
  if (!program) return <Navigate to="/program" replace />;
  if (showReadiness && data?.logic) {
    return <SessionReadiness onComplete={handleReadinessComplete} programLogic={data.logic} />;
  }
  if (loading) return (
    <div className="dashboard-container">
      <div className="dashboard-wrapper">
        <Skeleton />
        <Skeleton />
        <Skeleton />
      </div>
    </div>
  );
  if (error) return <div className="dashboard-container"><div className="premium-card" style={{ borderColor: "#ef4444" }}>Error: {error}</div></div>;
  if (!data) return <div>No data returned</div>;

  const getMetricLabel = (lift) => {
    const pt = lift.progressionType;
    if (pt === "power") return "Quality (1-10)";
    if (pt === "mobility") return "Stability (1-10) / Pain (1-10)";
    if (pt === "strength" || pt === "deload" || data.logic === "STRENGTH_RPE") return "RPE";
    if (data.logic === "HYPERTROPHY_VOLUME" || pt === "volume") return "RIR";
    return "RPE";
  };

  const getTargetValue = (lift) => {
    const pt = lift.progressionType;
    if ((pt === "strength" || pt === "deload" || data.logic === "STRENGTH_RPE" || lift.rpeTarget !== undefined) && lift.rpeTarget !== undefined) {
      return lift.adjustedRpeTarget ?? lift.rpeTarget ?? 7;
    }
    if (pt === "power") return lift.adjustedQualityTarget || lift.qualityTarget || "—";
    if (pt === "mobility") {
      const stability = lift.adjustedStabilityTarget || lift.stabilityTarget || 7;
      const pain = lift.painTarget || 4;
      return `Stability ≥${stability} / Pain ≤${pain}`;
    }
    if (data.logic === "HYPERTROPHY_VOLUME" || pt === "volume") return lift.adjustedRirTarget || lift.rirTarget || "—";
    return "—";
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-wrapper" style={{ maxWidth: "900px" }}>
        {/* Header */}
        <header className="dashboard-header">
          <div>
            <div className="dashboard-logo" onClick={() => window.location.href = "/dashboard"}>← Dashboard</div>
            <h1 style={{ fontSize: "1.6rem", fontWeight: "700", marginTop: "8px" }}>
              Week {data.program?.week ?? "?"} — Day {data.program?.day ?? "?"}
            </h1>
            <p style={{ opacity: 0.7 }}>{data.program?.focus ?? "No focus found"}</p>
          </div>
          <span className="program-badge">{program}</span>
        </header>

        {/* Missed opportunity banner */}
        {missedOpportunityBanner && (
          <div className="premium-card" style={{ borderLeftColor: "#ffaa44", background: "#ffaa4422", padding: "12px", marginBottom: "20px" }}>
            <strong>💡 You would have missed this lift!</strong><br />
            A static plan would have told you {missedOpportunityBanner.staticWeight}kg for {missedOpportunityBanner.liftName}, but you did {missedOpportunityBanner.actualWeight}kg – that’s {Math.abs(missedOpportunityBanner.actualWeight - missedOpportunityBanner.staticWeight)}kg more!
          </div>
        )}

        {/* Fatigue budget notice */}
        {data.fatigueOptimised && (
          <div className="premium-card" style={{ borderLeftColor: "var(--accent)", padding: "12px", marginBottom: "20px", fontSize: "0.9rem" }}>
            <strong>📊 Volume auto‑adjusted to today's recovery capacity</strong>
            {data.overloadedTags?.length > 0 && <span> · High stress on: {data.overloadedTags.join(', ')}</span>}
          </div>
        )}

        {/* Week/Day selector */}
        <div className="premium-card" style={{ marginBottom: "24px" }}>
          <div style={{ display: "flex", gap: "15px", flexWrap: "wrap" }}>
            <div>
              <label>Week</label><br />
              <select value={week} onChange={e => setWeek(Number(e.target.value))} className="premium-input" style={{ width: "auto" }}>
                {(data.availableWeeks || [1,2,3,4]).map(w => <option key={w} value={w}>Week {w}</option>)}
              </select>
            </div>
            <div>
              <label>Day</label><br />
              <select value={day} onChange={e => setDay(Number(e.target.value))} className="premium-input" style={{ width: "auto" }}>
                {(data.availableDaysPerWeek?.[week] || [1,2,3,4,5,6,7]).map(d => <option key={d} value={d}>Day {d}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Subscription warning */}
        {!subscriptionActive && !checkingStatus && (
          <div className="premium-card" style={{ borderColor: "#ffaa44", background: "#ffaa4422", textAlign: "center", marginBottom: "20px" }}>
            <strong>⚠️ Your subscription has ended.</strong> You can still log workouts manually, but recommended weights are hidden. <a href="/" style={{ color: "#ffaa44" }}>Resubscribe</a> to unlock full guidance.
          </div>
        )}

        {/* Exercise cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {(() => {
            const allExercises = data.projected || [];
            const visibleExercises = allExercises.filter(lift => lift.sets > 0);
            const hiddenCount = allExercises.length - visibleExercises.length;
            return (
              <>
                {hiddenCount > 0 && (
                  <div className="premium-card" style={{ borderLeftColor: "#ffaa44", padding: "12px", fontSize: "0.85rem" }}>
                    ⚡ {hiddenCount} exercise(s) skipped today – fatigue budget exceeded
                  </div>
                )}
                {visibleExercises.map((lift, idx) => {
                  const pt = lift.progressionType;
                  const currentRepsInputs = inputs[lift.liftName]?.repsPerSet || [];
                  return (
                    <div key={idx} className="premium-card">
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "16px", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "12px" }}>
                        <div>
                          <h3 style={{ fontSize: "1.2rem", fontWeight: "600" }}>
                            {lift.liftName}
                            {lift.descendingSet && <span className="badge descending">⇊ Descending</span>}
                            {lift.mechanicalDisadvantage && <span className="badge mechanical">🦾 Position‑specific</span>}
                            {lift.stressOverload && <span className="badge overload">⚡ High‑demand</span>}
                          </h3>
                          <div style={{ display: "flex", gap: "20px", marginTop: "6px", flexWrap: "wrap", fontSize: "0.85rem", color: "var(--text-gray)" }}>
                            <span>Sets: {lift.sets}</span>
                            <span>Reps: {lift.reps}</span>
                            <span>{getMetricLabel(lift)} Target: {getTargetValue(lift)}</span>
                            {(lift.adjustedRpeTarget || lift.adjustedRirTarget || lift.adjustedQualityTarget || lift.adjustedStabilityTarget) && (
                              <span className="adjusted-badge">(auto‑adjusted)</span>
                            )}
                          </div>
                        </div>
                        {history[lift.liftName] && history[lift.liftName].length > 0 && (
                          <div style={{ textAlign: "right", fontSize: "0.7rem", color: "var(--text-muted)" }}>
                            Last: {history[lift.liftName][0].actualWeight}kg x {history[lift.liftName][0].repsCompleted} @ RPE {history[lift.liftName][0].actualRPE}
                          </div>
                        )}
                      </div>

                      {/* Current/Next weights */}
                      <div style={{ display: "flex", gap: "20px", marginBottom: "15px", fontWeight: "bold", flexWrap: "wrap" }}>
                        {subscriptionActive ? (
                          <>
                            <span>Current: {lift.currentWeight ?? 0}kg</span>
                            <span>Next: {lift.projectedNextWeight ?? 0}kg</span>
                            {lift.fatigueAdjusted && <span className="fatigue-note">⚡ fatigue‑adjusted</span>}
                          </>
                        ) : (
                          <span className="subscribe-note">⚡ Subscribe to see recommended weights</span>
                        )}
                      </div>

                      {/* Input fields (weight, RPE, etc.) */}
                      <div style={{ display: "flex", gap: "10px", marginBottom: "15px", flexWrap: "wrap" }}>
                        {pt !== "mobility" && (
                          <input type="number" step="2.5" placeholder={lift.currentWeight > 0 ? `${lift.currentWeight} kg` : "Weight (kg)"}
                            className="premium-input" style={{ width: "100px" }}
                            value={inputs[lift.liftName]?.weight || ""}
                            onChange={e => setInputs(prev => ({ ...prev, [lift.liftName]: { ...prev[lift.liftName], weight: e.target.value } }))} />
                        )}
                        {pt === "power" && (
                          <input type="number" placeholder="Quality (1-10)" className="premium-input" style={{ width: "100px" }}
                            value={inputs[lift.liftName]?.quality || ""}
                            onChange={e => setInputs(prev => ({ ...prev, [lift.liftName]: { ...prev[lift.liftName], quality: e.target.value } }))} />
                        )}
                        {pt === "mobility" && (
                          <>
                            <input type="number" placeholder={lift.currentWeight > 0 ? `${lift.currentWeight} kg` : "Weight (kg)"} className="premium-input" style={{ width: "100px" }}
                              value={inputs[lift.liftName]?.weight || ""}
                              onChange={e => setInputs(prev => ({ ...prev, [lift.liftName]: { ...prev[lift.liftName], weight: e.target.value } }))} />
                            <input type="number" placeholder="Stability (1-10)" className="premium-input" style={{ width: "100px" }}
                              value={inputs[lift.liftName]?.stability || ""}
                              onChange={e => setInputs(prev => ({ ...prev, [lift.liftName]: { ...prev[lift.liftName], stability: e.target.value } }))} />
                            <input type="number" placeholder="Pain (1-10)" className="premium-input" style={{ width: "100px" }}
                              value={inputs[lift.liftName]?.pain || ""}
                              onChange={e => setInputs(prev => ({ ...prev, [lift.liftName]: { ...prev[lift.liftName], pain: e.target.value } }))} />
                          </>
                        )}
                        {(pt === "strength" || data.logic === "STRENGTH_RPE") && (
                          <input type="number" step="0.5" placeholder="RPE" className="premium-input" style={{ width: "80px" }}
                            value={inputs[lift.liftName]?.rpe || ""}
                            onChange={e => setInputs(prev => ({ ...prev, [lift.liftName]: { ...prev[lift.liftName], rpe: e.target.value } }))} />
                        )}
                        {(data.logic === "HYPERTROPHY_VOLUME" || pt === "volume") && (
                          <input type="number" placeholder="RIR" className="premium-input" style={{ width: "80px" }}
                            value={inputs[lift.liftName]?.rir || ""}
                            onChange={e => setInputs(prev => ({ ...prev, [lift.liftName]: { ...prev[lift.liftName], rir: e.target.value } }))} />
                        )}
                      </div>

                      {/* Per‑set inputs */}
                      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center", marginBottom: "15px" }}>
                        <span style={{ fontWeight: "bold", minWidth: "50px" }}>Sets:</span>
                        {[...Array(lift.sets)].map((_, setIdx) => (
                          <input key={setIdx} type="number" placeholder={`Set ${setIdx+1}`} className="premium-input" style={{ width: "70px" }}
                            value={currentRepsInputs[setIdx] || ""}
                            onChange={e => {
                              const current = inputs[lift.liftName] || {};
                              const newReps = [...(current.repsPerSet || [])];
                              newReps[setIdx] = e.target.value;
                              setInputs(prev => ({ ...prev, [lift.liftName]: { ...current, repsPerSet: newReps } }));
                            }} />
                        ))}
                      </div>

                      {/* Action buttons */}
                      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                        <button onClick={() => logSet(lift)} className="premium-btn" style={{ background: "var(--accent)", color: "#000" }}>Log Set</button>
                        <button onClick={() => handleAutoFill(lift)} disabled={!subscriptionActive} className="premium-btn" style={{ background: subscriptionActive ? "#4caf50" : "#666", opacity: subscriptionActive ? 1 : 0.5 }}>⚡ Auto Fill</button>
                        <button onClick={() => handleUndoLastEntry(lift.liftName)} className="premium-btn" style={{ background: "#ff9800", color: "#fff" }}>↩ Undo Last</button>
                        <button onClick={() => fetchHistory(lift.liftName)} className="premium-btn" style={{ background: "#fff", color: "#000" }}>History</button>
                        <button onClick={() => setInputs(prev => ({ ...prev, [lift.liftName]: {} }))} className="premium-btn" style={{ background: "#444", color: "#fff" }}>Clear</button>
                      </div>

                      {/* History display */}
                      {history[lift.liftName] && history[lift.liftName].length > 0 && (
                        <div style={{ marginTop: "12px", background: "var(--bg-dark)", padding: "10px", borderRadius: "8px", fontSize: "0.8rem" }}>
                          <strong>History:</strong>
                          {history[lift.liftName].slice(0, 3).map((entry, hidx) => {
                            let metricStr = "";
                            if (entry.actualRPE) metricStr = `RPE ${entry.actualRPE}`;
                            else if (entry.actualRIR) metricStr = `RIR ${entry.actualRIR}`;
                            else if (entry.actualStability && entry.actualPain) metricStr = `Stability ${entry.actualStability} / Pain ${entry.actualPain}`;
                            const setsInfo = entry.repsPerSet && entry.repsPerSet.length ? `Sets: [${entry.repsPerSet.join(", ")}]` : `${entry.repsCompleted || 0} reps`;
                            return (
                              <div key={hidx}>
                                {new Date(entry.createdAt).toLocaleDateString()} — {entry.actualWeight ? `${entry.actualWeight}kg x ` : ""}{setsInfo} {metricStr}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </>
            );
          })()}
        </div>

        {/* Next preview */}
        {nextPreview && (
          <div className="premium-card" style={{ marginTop: "24px" }}>
            <h4>🔮 Next workout preview</h4>
            {nextPreview.map(lift => (
              <div key={lift.liftName} style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                <span>{lift.liftName}</span>
                <strong>{lift.currentWeight}kg</strong>
              </div>
            ))}
          </div>
        )}

        {/* Completion modal */}
        {showCompletionModal && workoutSummary && (
          <div className="modal-overlay">
            <div className="premium-card" style={{ maxWidth: "500px", width: "100%", borderColor: "var(--accent)" }}>
              <h2 style={{ color: "var(--accent)" }}>Workout Complete! 🎉</h2>
              <p style={{ color: "var(--text-gray)" }}>Great work today</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", margin: "20px 0" }}>
                <div className="summary-stat"><div className="stat-value">{workoutSummary.timeToComplete}</div><div>Time</div></div>
                <div className="summary-stat"><div className="stat-value">{workoutSummary.totalVolume}kg</div><div>Volume</div></div>
                <div className="summary-stat"><div className="stat-value">{workoutSummary.exercisesCompleted}</div><div>Exercises</div></div>
                <div className="summary-stat"><div className="stat-value">{workoutSummary.streak}🔥</div><div>Streak</div></div>
              </div>
              {workoutSummary.prs?.length > 0 && (
                <div><h4>🏆 Personal Records</h4>{workoutSummary.prs.map((pr,i) => <div key={i}>✓ {pr}</div>)}</div>
              )}
              <button onClick={() => { setShowCompletionModal(false); window.location.href = "/dashboard"; }} className="premium-btn" style={{ width: "100%", marginTop: "20px" }}>Go to Dashboard</button>
            </div>
          </div>
        )}

        {/* Onboarding modal */}
        {showOnboardingModal && (
          <div className="modal-overlay">
            <div className="premium-card" style={{ maxWidth: "500px", width: "100%", borderColor: "var(--accent)" }}>
              <h2 style={{ color: "var(--accent)" }}>Welcome to Apex Method!</h2>
              <p>We need your current 1RM for the following lifts to give you accurate weight recommendations.</p>
              {onboardingLifts.map(lift => (
                <div key={lift.liftName} style={{ marginBottom: "16px" }}>
                  <label>{lift.liftName} (1RM in kg)</label>
                  <input type="number" step="2.5" className="premium-input"
                    value={onboardingValues[lift.liftName] || ""}
                    onChange={e => setOnboardingValues(prev => ({ ...prev, [lift.liftName]: e.target.value }))}
                    placeholder="e.g., 140" />
                </div>
              ))}
              <button onClick={handleInitializeLifts} disabled={onboardingSubmitting} className="premium-btn" style={{ width: "100%" }}>
                {onboardingSubmitting ? "Saving..." : "Start Training"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}