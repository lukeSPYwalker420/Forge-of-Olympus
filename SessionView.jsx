import { useEffect, useState } from "react";

export default function SessionView() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [inputs, setInputs] = useState({});
  const [week, setWeek] = useState(1);
  const [day, setDay] = useState(1);
  const [history, setHistory] = useState({});

  useEffect(() => {
    const userId = localStorage.getItem("userId");

if (!userId) {
  window.location.href = "/login";
  return;
}

    fetch(`http://localhost:5000/api/session-view/${week}/${day}/${userId}`)
      .then(async (res) => {
        if (!res.ok) {
          throw new Error("API failed with status " + res.status);
        }
        return res.json();
      })
      .then((json) => {
        console.log("API RESPONSE:", json);
        setData(json);
        setLoading(false);
      })
      .catch((err) => {
        console.error("FETCH ERROR:", err);
        setError(err.message);
        setLoading(false);
      });
  }, [week, day]);

  // ✅ SAFE STATES
  if (loading) return <div>Loading session...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!data) return <div>No data returned</div>;

  const logSet = async (liftName, targetRPE) => {
    try {
      const weight = inputs[liftName]?.weight;
      const rpe = inputs[liftName]?.rpe || targetRPE;
      const userId = localStorage.getItem("userId");

      if (!weight) {
        alert("Enter weight first");
        return;
      }

      // 1️⃣ LOG SESSION
      await fetch("http://localhost:5000/api/session-log", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          userId,
          week: data.program.week,
          day: data.program.day,
          liftName,
          targetRPE,
          actualRPE: Number(rpe),
          actualWeight: Number(weight),
          repsCompleted: Number(inputs[liftName]?.repsCompleted),
          completed: true
        })
      });

      // 2️⃣ APPLY PROGRESSION
      await fetch("http://localhost:5000/api/progression/apply", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          userId,
          liftName
        })
      });

      // 3️⃣ REFRESH SESSION DATA (NO RELOAD)
      const res = await fetch(
        `http://localhost:5000/api/session-view/${week}/${day}/${userId}`
      );
      const json = await res.json();
      setData(json);

    } catch (err) {
      console.error(err);
    }
  };

  const fetchHistory = async (liftName) => {
  const userId = localStorage.getItem("userId");

  const res = await fetch(
    `http://localhost:5000/api/history/${userId}/${encodeURIComponent(liftName)}`
  );

  const data = await res.json();

  setHistory((prev) => ({
    ...prev,
    [liftName]: data
  }));
};

  return (
  <div style={{
    padding: 30,
    fontFamily: "system-ui, sans-serif",
    maxWidth: 900,
    margin: "0 auto"
  }}>

    {/* HEADER */}
    <div style={{ marginBottom: 25 }}>
      <h1 style={{ margin: 0 }}>
        Week {data.program?.week ?? "?"} — Day {data.program?.day ?? "?"}
      </h1>
      <p style={{ opacity: 0.7, marginTop: 5 }}>
        {data.program?.focus ?? "No focus found"}
      </p>
    </div>

    {/* SELECTORS */}
    <div style={{
      marginBottom: 25,
      display: "flex",
      gap: 15,
      alignItems: "center"
    }}>
      <div>
        <label>Week</label><br />
        <select
          value={week}
          onChange={(e) => setWeek(Number(e.target.value))}
        >
          {[1, 2, 3, 4].map(w => (
            <option key={w} value={w}>Week {w}</option>
          ))}
        </select>
      </div>

      <div>
        <label>Day</label><br />
        <select
          value={day}
          onChange={(e) => setDay(Number(e.target.value))}
        >
          {[1,2,3,4,5,6,7].map(d => (
            <option key={d} value={d}>Day {d}</option>
          ))}
        </select>
      </div>
    </div>

    {/* EXERCISES */}
    <div style={{ display: "grid", gap: 20 }}>
      {(data.projected || []).map((lift, i) => (
        <div
          key={i}
          style={{
            border: "1px solid #e5e5e5",
            borderRadius: 12,
            padding: 20,
            boxShadow: "0 2px 6px rgba(0,0,0,0.05)"
          }}
        >
          <h3 style={{ marginTop: 0 }}>{lift.liftName}</h3>

          <div style={{
            display: "flex",
            gap: 20,
            flexWrap: "wrap",
            marginBottom: 10
          }}>
            <span>Sets: {lift.sets}</span>
            <span>Reps: {lift.reps}</span>
            <span>RPE: {lift.rpeTarget ?? "-"}</span>
          </div>

          <div style={{
            display: "flex",
            gap: 20,
            marginBottom: 15,
            fontWeight: "bold"
          }}>
            <span>Current: {lift.currentWeight ?? 0}</span>
            <span>Next: {lift.projectedNextWeight ?? 0}</span>
          </div>

          {/* INPUTS */}
          <div style={{
            display: "flex",
            gap: 10,
            marginBottom: 15,
            flexWrap: "wrap"
          }}>
            <input
              placeholder="Weight"
              style={{ padding: 8 }}
              value={inputs[lift.liftName]?.weight || ""}
              onChange={(e) =>
                setInputs((prev) => ({
                  ...prev,
                  [lift.liftName]: {
                    ...prev[lift.liftName],
                    weight: e.target.value
                  }
                }))
              }
            />

            <input
              placeholder="RPE"
              style={{ padding: 8 }}
              value={inputs[lift.liftName]?.rpe || ""}
              onChange={(e) =>
                setInputs((prev) => ({
                  ...prev,
                  [lift.liftName]: {
                    ...prev[lift.liftName],
                    rpe: e.target.value
                  }
                }))
              }
            />

            <input
              placeholder="Reps"
              style={{ padding: 8 }}
              value={inputs[lift.liftName]?.repsCompleted || ""}
              onChange={(e) =>
                setInputs((prev) => ({
                  ...prev,
                  [lift.liftName]: {
                    ...prev[lift.liftName],
                    repsCompleted: e.target.value
                  }
                }))
              }
            />
          </div>

          {/* BUTTON */}
          <div style={{ display: "flex", gap: 10 }}>
  <button
    onClick={() => logSet(lift.liftName, lift.rpeTarget)}
    style={{
      padding: "10px 15px",
      borderRadius: 8,
      border: "none",
      background: "#111",
      color: "#fff",
      cursor: "pointer"
    }}
  >
    Log Set
  </button>

  <button
    onClick={() => fetchHistory(lift.liftName)}
    style={{
      padding: "10px 15px",
      borderRadius: 8,
      border: "1px solid #ccc",
      background: "#fff",
      cursor: "pointer"
    }}
  >
    History
  </button>
</div>

{history[lift.liftName] && (
  <div style={{ marginTop: 10, background: "#f5f5f5", padding: 10 }}>
    <strong>History:</strong>

    {history[lift.liftName].map((entry, idx) => (
      <div key={idx} style={{ fontSize: 14 }}>
        {new Date(entry.createdAt).toLocaleDateString()} — 
        {entry.actualWeight}kg @ RPE {entry.actualRPE}
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