import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Dashboard.css";

export default function Dashboard() {
  const navigate = useNavigate();
  const userId = localStorage.getItem("userId");
  const [purchasedPrograms, setPurchasedPrograms] = useState([]);
  const [estimates, setEstimates] = useState({});
  const [recentSessions, setRecentSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      navigate("/login");
      return;
    }

    const fetchData = async () => {
      try {
        const programs = JSON.parse(localStorage.getItem("purchasedPrograms") || "[]");
        setPurchasedPrograms(programs);

        const mainLifts = ["Squat (Top set)", "Bench (Top set)", "Deadlift (Top set)"];
        const estPromises = mainLifts.map(lift =>
          fetch(`/api/estimate-1rm/${userId}/${encodeURIComponent(lift)}`).then(res => res.json())
        );
        const estResults = await Promise.all(estPromises);
        const estMap = {};
        mainLifts.forEach((lift, idx) => {
          estMap[lift] = estResults[idx].estimated1RM || 0;
        });
        setEstimates(estMap);

        const historyRes = await fetch(`/api/recent-sessions/${userId}`);
        if (historyRes.ok) {
          const sessions = await historyRes.json();
          setRecentSessions(sessions.slice(0,5));
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [userId, navigate]);

  const handleStartWorkout = () => {
    const program = localStorage.getItem("program");
    program ? navigate("/session") : navigate("/program");
  };

  if (loading) return <div className="dashboard-loading">Loading your data...</div>;

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>⚡ Forge of Olympus</h1>
        <button onClick={() => { localStorage.clear(); navigate("/"); }} className="logout-btn">Logout</button>
      </div>

      <div className="dashboard-grid">
        <div className="card">
          <h2>Your Program</h2>
          {purchasedPrograms.length === 0 ? (
            <p>No programs purchased. <a href="/" style={{color:"var(--accent)"}}>Buy now</a></p>
          ) : (
            <>
              <p>Active: <strong>{localStorage.getItem("program") || "Not selected"}</strong></p>
              <button onClick={() => navigate("/program")} className="btn-primary">Change Program</button>
            </>
          )}
          <button onClick={handleStartWorkout} className="btn-workout">🏋️ Start Workout</button>
        </div>

        <div className="card">
          <h2>Estimated 1RM</h2>
          <div className="estimates-list">
            <div className="estimate-item"><span>Squat</span><strong>{estimates["Squat (Top set)"] || "—"} kg</strong></div>
            <div className="estimate-item"><span>Bench</span><strong>{estimates["Bench (Top set)"] || "—"} kg</strong></div>
            <div className="estimate-item"><span>Deadlift</span><strong>{estimates["Deadlift (Top set)"] || "—"} kg</strong></div>
          </div>
        </div>

        <div className="card">
          <h2>Recent Activity</h2>
          {recentSessions.length === 0 ? (
            <p>No sessions logged yet.</p>
          ) : (
            <ul className="session-list">
              {recentSessions.map((s, idx) => (
                <li key={idx}>
                  {new Date(s.createdAt).toLocaleDateString()} – {s.liftName}: {s.actualWeight}kg x {s.repsCompleted} @ RPE {s.actualRPE}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}