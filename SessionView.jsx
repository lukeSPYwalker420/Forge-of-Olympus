import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";

export default function SessionView() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [inputs, setInputs] = useState({});
  const [week, setWeek] = useState(1);
  const [day, setDay] = useState(1);
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
  if (loading) return <div>Loading session...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!data) return <div>No data returned</div>;

const logSet = async (lift) => {
  const liftName = lift.liftName;
  const targetRPE = lift.rpeTarget;
  const targetReps = lift.reps;
  try {
    const weight = inputs[liftName]?.weight;
    const rpe = inputs[liftName]?.rpe || targetRPE;
    if (!weight) {
      alert("Enter weight first");
      return;
    }
    // Log session
    await fetch("/api/session-log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId, week: data.program?.week, day: data.program?.day, liftName,
        targetRPE, targetReps, actualRPE: Number(rpe), actualWeight: Number(weight),
        repsCompleted: Number(inputs[liftName]?.repsCompleted), completed: true
      })
    });
    await new Promise(resolve => setTimeout(resolve, 500));
    // Apply progression
    await fetch("/api/progression/apply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, liftName, logic: "STRENGTH_RPE" })
    });
    // Refresh data
    const res = await fetch(`/api/session-view/${week}/${day}/${userId}?program=${encodeURIComponent(program)}`);
    const json = await res.json();
    setData(json);
    // Refresh history
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

  return (
    <div style={{ padding: 30, fontFamily: "system-ui", maxWidth: 900, margin: "0 auto" }}>
      <div style={{ marginBottom: 25 }}>
        <h1>Week {data.program?.week ?? "?"} — Day {data.program?.day ?? "?"}</h1>
        <p style={{ opacity: 0.7 }}>{data.program?.focus ?? "No focus found"}</p>
      </div>
      <div style={{ marginBottom: 25, display: "flex", gap: 15 }}>
        <div><label>Week</label><br /><select value={week} onChange={e => setWeek(Number(e.target.value))}>
          {[1,2,3,4].map(w => <option key={w} value={w}>Week {w}</option>)}
        </select></div>
        <div><label>Day</label><br /><select value={day} onChange={e => setDay(Number(e.target.value))}>
          {[1,2,3,4,5,6,7].map(d => <option key={d} value={d}>Day {d}</option>)}
        </select></div>
      </div>
      <div style={{ display: "grid", gap: 20 }}>
        {(data.projected || []).map((lift, i) => (
          <div key={i} style={{ border: "1px solid #e5e5e5", borderRadius: 12, padding: 20 }}>
            <h3>{lift.liftName}</h3>
            <div style={{ display: "flex", gap: 20, marginBottom: 10 }}>
              <span>Sets: {lift.sets}</span><span>Reps: {lift.reps}</span><span>RPE: {lift.rpeTarget ?? "-"}</span>
            </div>
            <div style={{ display: "flex", gap: 20, marginBottom: 15, fontWeight: "bold" }}>
              <span>Current: {lift.currentWeight ?? 0}</span><span>Next: {lift.projectedNextWeight ?? 0}</span>
            </div>
            <div style={{ display: "flex", gap: 10, marginBottom: 15, flexWrap: "wrap" }}>
              <input placeholder="Weight" style={{ padding: 8 }} value={inputs[lift.liftName]?.weight || ""} onChange={e => setInputs(prev => ({ ...prev, [lift.liftName]: { ...prev[lift.liftName], weight: e.target.value } }))} />
              <input placeholder="RPE" style={{ padding: 8 }} value={inputs[lift.liftName]?.rpe || ""} onChange={e => setInputs(prev => ({ ...prev, [lift.liftName]: { ...prev[lift.liftName], rpe: e.target.value } }))} />
              <input placeholder="Reps" style={{ padding: 8 }} value={inputs[lift.liftName]?.repsCompleted || ""} onChange={e => setInputs(prev => ({ ...prev, [lift.liftName]: { ...prev[lift.liftName], repsCompleted: e.target.value } }))} />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => logSet(lift)} style={{ padding: "10px 15px", borderRadius: 8, border: "none", background: "#111", color: "#fff", cursor: "pointer" }}>Log Set</button>
              <button onClick={() => fetchHistory(lift.liftName)} style={{ padding: "10px 15px", borderRadius: 8, border: "1px solid #ccc", background: "#fff", cursor: "pointer" }}>History</button>
            </div>
            {history[lift.liftName] && (
              <div style={{ marginTop: 10, background: "#f5f5f5", padding: 10, color: "#000" }}>
                <strong>History:</strong>
                {history[lift.liftName].map((entry, idx) => (
                  <div key={idx} style={{ fontSize: 14 }}>
                  {new Date(entry.createdAt).toLocaleDateString()} — {entry.actualWeight}kg x {entry.repsCompleted} @ RPE {entry.actualRPE}
                </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}