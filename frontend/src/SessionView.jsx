import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import Skeleton from "./Skeleton";

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

  if (!userId) return <Navigate to="/login" replace />;
  if (!program) return <Navigate to="/program" replace />;
  if (loading) return (
    <div className="dashboard-container">
      <Skeleton />
      <Skeleton />
      <Skeleton />
    </div>
  );
  if (error) return <div>Error: {error}</div>;
  if (!data) return <div>No data returned</div>;

  const logSet = async (lift) => {
    const liftName = lift.liftName;
    const targetReps = lift.reps;
    const targetSets = lift.sets;
    const targetRPE = lift.rpeTarget;
    const targetRIR = lift.rirTarget;
    const targetQuality = lift.qualityTarget;
    const targetROM = lift.romTarget;
    const targetPain = lift.painTarget;
    const progressionType = lift.progressionType;
    const logic = data.logic;
    // Update streak in localStorage
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

      // 1) Log session
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

      // 2) Apply progression
      await fetch("/api/progression/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, liftName, logic })
      });

      // 3) Refresh session data
      const res = await fetch(`/api/session-view/${week}/${day}/${userId}?program=${encodeURIComponent(program)}`);
      const json = await res.json();
      setData(json);

      // 4) Refresh history for this lift
      await fetchHistory(liftName);
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
    if (pt === "power") return lift.qualityTarget;
    if (pt === "mobility") return `${lift.romTarget}% / Pain ≤${lift.painTarget}`;
    if (pt === "strength" || data.logic === "STRENGTH_RPE") return lift.rpeTarget;
    if (data.logic === "HYPERTROPHY_VOLUME" || pt === "volume") return lift.rirTarget;
    return lift.rpeTarget;
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
              
              {/* Main inputs row */}
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

              {/* Per‑set reps inputs */}
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

              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => logSet(lift)} style={{ padding: "10px 15px", borderRadius: 8, border: "none", background: "#111", color: "#fff", cursor: "pointer" }}>Log Set</button>
                <button onClick={() => fetchHistory(lift.liftName)} style={{ padding: "10px 15px", borderRadius: 8, border: "1px solid #ccc", background: "#fff", cursor: "pointer" }}>History</button>
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