import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import Skeleton from "./Skeleton";
import SessionReadiness from "./SessionReadiness";

export default function SessionView() {
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
  const [adjustments, setAdjustments] = useState({ rpeAdjustment: 0, rirAdjustment: 0 });

  const userId = localStorage.getItem("userId");
  const program = localStorage.getItem("program");

  useEffect(() => {
    if (!userId || !program) return;
    fetch(`/api/session-view/${week}/${day}/${userId}?program=${encodeURIComponent(program)}`)
      .then(res => {
        if (!res.ok) throw new Error("Failed to fetch");
        return res.json();
      })
      .then(setData)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [week, day, userId, program]);

  const handleReadinessComplete = (readinessData) => {
    setAdjustments(readinessData.adjustments);
    setShowReadiness(false);
  };

  const handleUndoLastEntry = async (liftName) => {
    if (!confirm("Undo the last entry for this exercise?")) return;
    
    try {
      // Get the last session
      const historyRes = await fetch(`/api/history/${userId}/${encodeURIComponent(liftName)}`);
      const hist = await historyRes.json();
      
      if (hist.length === 0) {
        alert("No entries to undo");
        return;
      }
      
      const lastEntry = hist[0];
      
      // Delete the last session
      await fetch(`/api/session-log/${lastEntry._id}`, {
        method: "DELETE"
      });
      
      // Refresh data
      await fetchHistory(liftName);
      
      // Refresh session view to update weights
      const res = await fetch(`/api/session-view/${week}/${day}/${userId}?program=${encodeURIComponent(program)}`);
      const json = await res.json();
      setData(json);
      
      alert("Last entry undone!");
    } catch (err) {
      console.error(err);
      alert("Failed to undo");
    }
  };

  const handleAutoFill = (lift) => {
    // Auto-fill all targets based on the program's target values
    const newInputs = { ...inputs };
    const liftInputs = newInputs[lift.liftName] || {};
    
    // Auto-fill RPE/RIR based on adjusted targets
    if (lift.progressionType === "strength" || data.logic === "STRENGTH_RPE") {
      let targetRPE = lift.rpeTarget;
      if (adjustments.rpeAdjustment) {
        targetRPE = Math.min(10, Math.max(1, targetRPE + adjustments.rpeAdjustment));
      }
      liftInputs.rpe = targetRPE;
    }
    
    if (data.logic === "HYPERTROPHY_VOLUME" || lift.progressionType === "volume") {
      let targetRIR = lift.rirTarget;
      if (adjustments.rirAdjustment) {
        targetRIR = Math.min(5, Math.max(0, targetRIR + adjustments.rirAdjustment));
      }
      liftInputs.rir = targetRIR;
    }
    
    // Auto-fill quality for power exercises
    if (lift.progressionType === "power" && lift.qualityTarget) {
      liftInputs.quality = lift.qualityTarget;
    }
    
    // Auto-fill ROM/Pain for mobility
    if (lift.progressionType === "mobility") {
      liftInputs.rom = lift.romTarget;
      liftInputs.pain = lift.painTarget;
    }
    
    newInputs[lift.liftName] = liftInputs;
    setInputs(newInputs);
  };

  const logSet = async (lift) => {
    const liftName = lift.liftName;
    const targetReps = lift.reps;
    const targetSets = lift.sets;
    let targetRPE = lift.rpeTarget;
    let targetRIR = lift.rirTarget;
    const targetQuality = lift.qualityTarget;
    const targetROM = lift.romTarget;
    const targetPain = lift.painTarget;
    const progressionType = lift.progressionType;
    const logic = data.logic;
    
    // Apply readiness adjustments
    if (adjustments.rpeAdjustment && (progressionType === "strength" || logic === "STRENGTH_RPE")) {
      targetRPE = Math.min(10, Math.max(1, targetRPE + adjustments.rpeAdjustment));
    }
    if (adjustments.rirAdjustment && (logic === "HYPERTROPHY_VOLUME" || progressionType === "volume")) {
      targetRIR = Math.min(5, Math.max(0, targetRIR + adjustments.rirAdjustment));
    }
    
    const streakRes = await fetch(`/api/streak/${userId}`);
    if (streakRes.ok) {
      const { streak } = await streakRes.json();
      localStorage.setItem("streak", streak);
    }

    try {
      const weight = inputs[liftName]?.weight;
      if (!weight && progressionType !== "mobility") {
        alert("Enter weight first");
        return;
      }

      let actualRPE = null;
      let actualRIR = null;
      let actualQuality = null;
      let actualROM = null;
      let actualPain = null;
      const repsPerSet = inputs[liftName]?.repsPerSet || [];

      if (progressionType === "strength" || logic === "STRENGTH_RPE") {
        actualRPE = Number(inputs[liftName]?.rpe || targetRPE);
      } else if (progressionType === "power") {
        actualQuality = Number(inputs[liftName]?.quality || targetQuality);
      } else if (progressionType === "mobility") {
        actualROM = Number(inputs[liftName]?.rom || targetROM);
        actualPain = Number(inputs[liftName]?.pain || targetPain);
      } else if (logic === "HYPERTROPHY_VOLUME" || progressionType === "volume") {
        actualRIR = Number(inputs[liftName]?.rir || targetRIR);
      }

      await fetch("/api/session-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          programName: program,
          week: data.program?.week,
          day: data.program?.day,
          liftName,
          targetReps,
          targetSets,
          repsPerSet: repsPerSet.map(r => parseInt(r) || 0),
          targetRPE,
          targetRIR,
          targetQuality,
          targetROM,
          targetPain,
          actualRPE,
          actualRIR,
          actualQuality,
          actualROM,
          actualPain,
          actualWeight: weight ? Number(weight) : null,
          completed: true,
          progressionType
        })
      });

      await new Promise(resolve => setTimeout(resolve, 500));

      await fetch("/api/progression/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, liftName, logic })
      });

      const res = await fetch(`/api/session-view/${week}/${day}/${userId}?program=${encodeURIComponent(program)}`);
      const json = await res.json();
      setData(json);

      await fetchHistory(liftName);
      
      // Clear inputs for this lift after successful log
      setInputs(prev => ({ ...prev, [liftName]: {} }));
    } catch (err) {
      console.error(err);
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
    if (pt === "mobility") return "ROM (%) / Pain (1-10)";
    if (pt === "strength" || data.logic === "STRENGTH_RPE") return "RPE";
    if (data.logic === "HYPERTROPHY_VOLUME" || pt === "volume") return "RIR";
    return "RPE";
  };

  const getTargetValue = (lift) => {
    const pt = lift.progressionType;
    let target = null;
    
    if (pt === "power") target = lift.qualityTarget;
    else if (pt === "mobility") target = `${lift.romTarget}% / Pain ≤${lift.painTarget}`;
    else if (pt === "strength" || data.logic === "STRENGTH_RPE") target = lift.rpeTarget;
    else if (data.logic === "HYPERTROPHY_VOLUME" || pt === "volume") target = lift.rirTarget;
    else target = lift.rpeTarget;
    
    // Apply adjustments
    if (adjustments.rpeAdjustment && (pt === "strength" || data.logic === "STRENGTH_RPE")) {
      const adjusted = Math.min(10, Math.max(1, target + adjustments.rpeAdjustment));
      target = `${target} → ${adjusted} (adjusted)`;
    }
    if (adjustments.rirAdjustment && (data.logic === "HYPERTROPHY_VOLUME" || pt === "volume")) {
      const adjusted = Math.min(5, Math.max(0, target + adjustments.rirAdjustment));
      target = `${target} → ${adjusted} (adjusted)`;
    }
    
    return target;
  };

  return (
    <div style={{ padding: 30, fontFamily: "system-ui", maxWidth: 900, margin: "0 auto" }}>
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
      <div style={{ display: "grid", gap: 20 }}>
        {(data.projected || []).map((lift, i) => {
          const pt = lift.progressionType;
          const currentRepsInputs = inputs[lift.liftName]?.repsPerSet || [];
          
          return (
            <div key={i} style={{ border: "1px solid #e5e5e5", borderRadius: 12, padding: 20 }}>
              <h3>{lift.liftName}</h3>
              <div style={{ display: "flex", gap: 20, marginBottom: 10 }}>
                <span>Sets: {lift.sets}</span>
                <span>Reps: {lift.reps}</span>
                <span>{getMetricLabel(lift)} Target: {getTargetValue(lift)}</span>
              </div>
              <div style={{ display: "flex", gap: 20, marginBottom: 15, fontWeight: "bold" }}>
                <span>Current: {lift.currentWeight ?? 0}</span>
                <span>Next: {lift.projectedNextWeight ?? 0}</span>
              </div>
              
              <div style={{ display: "flex", gap: 10, marginBottom: 15, flexWrap: "wrap" }}>
                {pt !== "mobility" && (
                  <input
                    placeholder="Weight (kg)"
                    style={{ padding: 8, width: "100px" }}
                    value={inputs[lift.liftName]?.weight || ""}
                    onChange={e => setInputs(prev => ({ ...prev, [lift.liftName]: { ...prev[lift.liftName], weight: e.target.value } }))}
                  />
                )}
                {pt === "power" && (
                  <input
                    placeholder="Quality (1-10)"
                    style={{ padding: 8, width: "100px" }}
                    value={inputs[lift.liftName]?.quality || ""}
                    onChange={e => setInputs(prev => ({ ...prev, [lift.liftName]: { ...prev[lift.liftName], quality: e.target.value } }))}
                  />
                )}
                {pt === "mobility" && (
                  <>
                    <input
                      placeholder="ROM (%)"
                      style={{ padding: 8, width: "100px" }}
                      value={inputs[lift.liftName]?.rom || ""}
                      onChange={e => setInputs(prev => ({ ...prev, [lift.liftName]: { ...prev[lift.liftName], rom: e.target.value } }))}
                    />
                    <input
                      placeholder="Pain (1-10)"
                      style={{ padding: 8, width: "100px" }}
                      value={inputs[lift.liftName]?.pain || ""}
                      onChange={e => setInputs(prev => ({ ...prev, [lift.liftName]: { ...prev[lift.liftName], pain: e.target.value } }))}
                    />
                  </>
                )}
                {(pt === "strength" || data.logic === "STRENGTH_RPE") && (
                  <input
                    placeholder="RPE"
                    style={{ padding: 8, width: "80px" }}
                    value={inputs[lift.liftName]?.rpe || ""}
                    onChange={e => setInputs(prev => ({ ...prev, [lift.liftName]: { ...prev[lift.liftName], rpe: e.target.value } }))}
                  />
                )}
                {(data.logic === "HYPERTROPHY_VOLUME" || pt === "volume") && (
                  <input
                    placeholder="RIR"
                    style={{ padding: 8, width: "80px" }}
                    value={inputs[lift.liftName]?.rir || ""}
                    onChange={e => setInputs(prev => ({ ...prev, [lift.liftName]: { ...prev[lift.liftName], rir: e.target.value } }))}
                  />
                )}
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 15 }}>
                <span style={{ fontWeight: "bold", minWidth: "50px" }}>Sets:</span>
                {[...Array(lift.sets)].map((_, idx) => (
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
                <button onClick={() => handleAutoFill(lift)} style={{ padding: "10px 15px", borderRadius: 8, border: "1px solid #4caf50", background: "#4caf50", color: "#fff", cursor: "pointer" }}>
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
              
              {history[lift.liftName] && (
                <div style={{ marginTop: 10, background: "#f5f5f5", padding: 10, color: "#000" }}>
                  <strong>History:</strong>
                  {history[lift.liftName].map((entry, idx) => {
                    let metricStr = "";
                    if (entry.actualRPE) metricStr = `RPE ${entry.actualRPE}`;
                    else if (entry.actualRIR) metricStr = `RIR ${entry.actualRIR}`;
                    else if (entry.actualQuality) metricStr = `Quality ${entry.actualQuality}`;
                    else if (entry.actualROM) metricStr = `ROM ${entry.actualROM}% / Pain ${entry.actualPain}`;
                    const setsInfo = entry.repsPerSet ? `Sets: [${entry.repsPerSet.join(", ")}]` : `${entry.repsCompleted} reps`;
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
    </div>
  );
}