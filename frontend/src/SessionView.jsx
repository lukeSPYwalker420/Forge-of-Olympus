import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import Skeleton from "./Skeleton";
import SessionReadiness from "./SessionReadiness";
import "./Dashboard.css"; // Reuse our premium typography and card styling layout tokens

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

  // Onboarding tracking context for baseline configuration
  const [onboardingLifts, setOnboardingLifts] = useState([]);
  const [onboardingValues, setOnboardingValues] = useState({});
  const [onboardingSubmitting, setOnboardingSubmitting] = useState(false);

  const userId = localStorage.getItem("userId");
  const program = localStorage.getItem("program");

  useEffect(() => {
    if (!userId) return;
    fetch(`/api/user-status/${userId}`)
      .then(res => res.json())
      .then(statusData => {
        if (statusData.subscriptionActive !== undefined) {
          setSubscriptionActive(statusData.subscriptionActive);
        }
        setCheckingStatus(false);
      })
      .catch(() => setCheckingStatus(false));
  }, [userId]);

  useEffect(() => {
    if (!userId || !program || !subscriptionActive) return;
    setLoading(true);
    fetch(`/api/program-session?programName=${encodeURIComponent(program)}&week=${week}&day=${day}&userId=${userId}`)
      .then(res => {
        if (!res.ok) return res.json().then(err => { throw new Error(err.error || "Failed to load engine profiles"); });
        return res.json();
      })
      .then(json => {
        if (json.needsOnboarding) {
          setOnboardingLifts(json.lifts);
          const initialVals = {};
          json.lifts.forEach(l => { initialVals[l.liftName] = ""; });
          setOnboardingValues(initialVals);
          setData({ onboarding: true });
        } else {
          setData(json);
          if (json.history) setHistory(json.history);
          const initialInputs = {};
          json.exercises.forEach((ex, exIdx) => {
            ex.sets.forEach((set, setIdx) => {
              const keyBase = `${exIdx}_${setIdx}`;
              initialInputs[`${keyBase}_weight`] = set.weight || "";
              initialInputs[`${keyBase}_reps`] = set.reps || "";
              initialInputs[`${keyBase}_rpe`] = set.rpe || "";
            });
          });
          setInputs(initialInputs);
        }
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [userId, program, week, day, subscriptionActive]);

  const handleInputChange = (exIdx, setIdx, field, val) => {
    setInputs(prev => ({ ...prev, [`${exIdx}_${setIdx}_${field}`]: val }));
  };

  const handleInitializeLifts = async () => {
    const missing = onboardingLifts.filter(l => !onboardingValues[l.liftName]);
    if (missing.length > 0) {
      alert("Please provide valid absolute numbers for all structural movements.");
      return;
    }
    setOnboardingSubmitting(true);
    try {
      const res = await fetch("/api/initialize-1rm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, lifts: onboardingValues })
      });
      if (!res.ok) throw new Error("Failed to write baseline calculations.");
      window.location.reload();
    } catch (err) {
      alert(err.message);
      setOnboardingSubmitting(false);
    }
  };

  const handleSubmitWorkout = async () => {
    const payloadExercises = data.exercises.map((ex, exIdx) => {
      const payloadSets = ex.sets.map((set, setIdx) => {
        const keyBase = `${exIdx}_${setIdx}`;
        return {
          setIndex: setIdx,
          weight: parseFloat(inputs[`${keyBase}_weight`]) || 0,
          reps: parseInt(inputs[`${keyBase}_reps`]) || 0,
          rpe: parseFloat(inputs[`${keyBase}_rpe`]) || 0,
          isTopSet: set.isTopSet || false,
          isBackOff: set.isBackOff || false,
          tag: set.tag || "hypertrophy"
        };
      });
      return { liftName: ex.liftName, sets: payloadSets };
    });

    try {
      const response = await fetch("/api/submit-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          programName: program,
          week,
          day,
          exercises: payloadExercises,
          readinessAdjustments: adjustments
        })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Submission rejected");
      
      setWorkoutSummary(result.summary);
      setShowCompletionModal(true);

      if (result.nextWeek && result.nextDay) {
        localStorage.setItem("nextWeek", result.nextWeek);
        localStorage.setItem("nextDay", result.nextDay);
        setWeek(result.nextWeek);
        setDay(result.nextDay);
      }
    } catch (err) {
      alert(`Submission Fault: ${err.message}`);
    }
  };

  if (!userId) return <Navigate to="/login" replace />;
  if (!program) return <Navigate to="/select-program" replace />;
  if (checkingStatus) return <div className="dashboard-loading">Validating security context...</div>;
  if (!subscriptionActive) return <Navigate to="/dashboard" replace />;

  if (loading) return <div className="dashboard-container"><div className="dashboard-wrapper"><Skeleton /></div></div>;
  if (error) return <div className="dashboard-container"><div className="premium-card" style={{ borderColor: "#ef4444" }}>Error initialized: {error}</div></div>;

  // Onboarding Layout State
  if (data?.onboarding) {
    return (
      <div className="dashboard-container" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="premium-card" style={{ maxWidth: "500px", width: "100%" }}>
          <h2 className="card-title" style={{ color: "var(--accent)" }}>System Initialization Baseline</h2>
          <p style={{ color: "var(--text-gray)", fontSize: "0.9rem", marginBottom: "24px" }}>Provide current absolute 1RM metrics to seed the training tracking engines accurately.</p>
          {onboardingLifts.map(lift => (
            <div key={lift.liftName} style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", marginBottom: "6px", fontSize: "0.85rem", fontWeight: "600" }}>{lift.liftName} (1RM in kg)</label>
              <input
                type="number"
                step="2.5"
                value={onboardingValues[lift.liftName] || ""}
                onChange={e => setOnboardingValues(prev => ({ ...prev, [lift.liftName]: e.target.value }))}
                className="premium-input"
                placeholder="e.g., 140"
              />
            </div>
          ))}
          <button onClick={handleInitializeLifts} disabled={onboardingSubmitting} className="premium-btn" style={{ width: "100%", marginTop: "16px" }}>
            {onboardingSubmitting ? "Writing Vectors..." : "Compute Training Profiles"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-wrapper" style={{ maxWidth: "800px" }}>
        
        <header className="dashboard-header">
          <div>
            <div className="dashboard-logo" onClick={() => (window.location.href = "/dashboard")}>← Framework Dashboard</div>
            <h1 style={{ fontSize: "1.6rem", fontWeight: "700", marginTop: "8px" }}>{data.workoutName || `Week ${week}, Day ${day}`}</h1>
          </div>
          <span style={{ fontSize: "0.8rem", color: "var(--accent)", background: "rgba(6, 182, 212, 0.1)", padding: "6px 12px", borderRadius: "20px", fontWeight: "600", letterSpacing: "0.05em" }}>
            {program} Engine
          </span>
        </header>

        {showReadiness && (
          <div className="premium-card" style={{ marginBottom: "32px" }}>
            <h3 className="card-title">🔬 Pre-Workout Readiness Profiler</h3>
            <SessionReadiness adjustments={adjustments} setAdjustments={setAdjustments} onComplete={() => setShowReadiness(false)} />
          </div>
        )}

        {/* Exercises Form Module */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {data.exercises.map((ex, exIdx) => {
            const lastPerformed = history[ex.liftName];
            return (
              <div key={exIdx} className="premium-card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "16px", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "16px" }}>
                  <div>
                    <h3 style={{ fontSize: "1.2rem", fontWeight: "600" }}>{ex.liftName}</h3>
                    <p style={{ color: "var(--text-gray)", fontSize: "0.85rem", marginTop: "2px" }}>{ex.notes || "Standard execution speed balance."}</p>
                  </div>
                  {lastPerformed && (
                    <div style={{ textAlign: "right", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                      <div>Prior Session Record:</div>
                      <span style={{ color: "var(--text-light)" }}>{lastPerformed.weight}kg x {lastPerformed.reps} @ RPE {lastPerformed.rpe}</span>
                    </div>
                  )}
                </div>

                {/* Table Layout Framework */}
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.9rem" }}>
                    <thead>
                      <tr style={{ color: "var(--text-muted)", borderBottom: "1px solid var(--border-subtle)" }}>
                        <th style={{ padding: "8px" }}>Set Order</th>
                        <th style={{ padding: "8px" }}>Targets Matrix</th>
                        <th style={{ padding: "8px" }}>Weight (kg)</th>
                        <th style={{ padding: "8px" }}>Reps Completed</th>
                        <th style={{ padding: "8px" }}>Target RPE</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ex.sets.map((set, setIdx) => {
                        const keyBase = `${exIdx}_${setIdx}`;
                        const setTypeLabel = set.isTopSet ? "🔥 Top Set" : set.isBackOff ? "📉 Back-Off" : "⚙️ Working";
                        return (
                          <tr key={setIdx} style={{ borderBottom: "1px solid rgba(255,255,255,0.02)" }}>
                            <td style={{ padding: "12px 8px", fontWeight: "600", color: set.isTopSet ? "var(--accent)" : "inherit" }}>{setTypeLabel}</td>
                            <td style={{ padding: "12px 8px", color: "var(--text-gray)", fontSize: "0.85rem" }}>{set.targetDescription}</td>
                            <td style={{ padding: "6px" }}>
                              <input type="number" step="2.5" placeholder="00.0" value={inputs[`${keyBase}_weight`]} onChange={e => handleInputChange(exIdx, setIdx, "weight", e.target.value)} className="premium-input" style={{ padding: "8px" }} />
                            </td>
                            <td style={{ padding: "6px" }}>
                              <input type="number" placeholder="0" value={inputs[`${keyBase}_reps`]} onChange={e => handleInputChange(exIdx, setIdx, "reps", e.target.value)} className="premium-input" style={{ padding: "8px" }} />
                            </td>
                            <td style={{ padding: "6px" }}>
                              <input type="number" step="0.5" placeholder="RPE" value={inputs[`${keyBase}_rpe`]} onChange={e => handleInputChange(exIdx, setIdx, "rpe", e.target.value)} className="premium-input" style={{ padding: "8px" }} />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>

        <button onClick={handleSubmitWorkout} className="premium-btn" style={{ width: "100%", marginTop: "32px", fontSize: "1.05rem" }}>
          Commit Workout Session Ledger →
        </button>

        {/* Success Analytics Modal Overlay */}
        {showCompletionModal && workoutSummary && (
          <div className="modal-overlay" style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" }}>
            <div className="premium-card" style={{ maxWidth: "500px", width: "100%", borderColor: "var(--accent)" }}>
              <h2 style={{ fontSize: "1.5rem", fontWeight: "700", color: "var(--accent)", marginBottom: "12px" }}>Session Fully Processed</h2>
              <p style={{ color: "var(--text-gray)", fontSize: "0.95rem", marginBottom: "20px" }}>The analysis engine has registered and saved your volume allocations.</p>
              
              <div style={{ background: "var(--bg-dark)", padding: "16px", borderRadius: "8px", display: "flex", flexDirection: "column", gap: "8px", fontSize: "0.9rem", marginBottom: "24px" }}>
                <div>⏱️ <strong>Completed sets counted:</strong> {workoutSummary.exercisesCompleted}</div>
                <div>🔥 <strong>New Performance Records:</strong> {workoutSummary.prs?.length || 0} PR vectors written</div>
                <div>📉 <strong>System Fatigue Generated:</strong> {workoutSummary.timeToComplete || "Validated"}</div>
              </div>

              <button onClick={() => { setShowCompletionModal(false); window.location.href = "/dashboard"; }} className="premium-btn" style={{ width: "100%" }}>
                Return to Command Center
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}