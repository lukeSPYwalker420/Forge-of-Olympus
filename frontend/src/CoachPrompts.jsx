import { useEffect, useState } from "react";

export default function CoachPrompts({ userId }) {
  const [prompts, setPrompts] = useState([]);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (!userId) return;
    fetch(`/api/coaching-prompt/${userId}`)
      .then(res => res.json())
      .then(data => setPrompts(data))
      .catch(err => console.error("Coach prompts error:", err));
  }, [userId]);

  if (!visible || prompts.length === 0) return null;

  const typeColors = {
    stall_regression: "#ff5555",
    rpe_overshoot: "#ffaa44",
    grinding: "#ffaa44",
    progress_easy: "#4caf50",
    perfect: "#4caf50",
    general: "#a1a1aa"
  };

  return (
    <div className="card" style={{ borderLeft: "4px solid var(--accent)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2>🧠 Coach’s Notes</h2>
        <button onClick={() => setVisible(false)} style={{ background: "none", border: "none", color: "var(--text-gray)", cursor: "pointer", fontSize: "1.2rem" }}>×</button>
      </div>
      {prompts.map((p, i) => (
        <div key={i} style={{
          padding: "10px",
          marginBottom: "10px",
          borderRadius: "8px",
          background: "#2a2a35",
          borderLeft: `3px solid ${typeColors[p.type] || "#888"}`
        }}>
          <div style={{ fontSize: "0.85rem", fontWeight: "bold", marginBottom: "4px", color: typeColors[p.type] }}>
            {p.lift}
          </div>
          <div style={{ fontSize: "0.8rem", color: "var(--text-gray)" }}>
            {p.message}
          </div>
        </div>
      ))}
      <div style={{ fontSize: "0.65rem", color: "#555", marginTop: "8px", textAlign: "right" }}>
        based on your last 4 weeks of data
      </div>
    </div>
  );
}