import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardChart from './DashboardChart';
import "./Dashboard.css";

export default function Dashboard() {
  const navigate = useNavigate();
  const userId = localStorage.getItem("userId");
  const userEmail = localStorage.getItem("userEmail") || ""; // store email on login
  const [purchasedPrograms, setPurchasedPrograms] = useState([]);
  const [estimates, setEstimates] = useState({});
  const [recentSessions, setRecentSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  
  
  // Admin state
  const [assignEmail, setAssignEmail] = useState("");
  const [assignProgram, setAssignProgram] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminMessage, setAdminMessage] = useState("");
  
  const isAdmin = userEmail === "kieren2203@googlemail.com"; // your admin email

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

  const handleStartWorkout = async () => {
  const program = localStorage.getItem("program");
  if (!program) {
    navigate("/program");
    return;
  }

  try {
    const res = await fetch(`/api/next-session/${userId}?program=${encodeURIComponent(program)}`);
    if (res.ok) {
      const { week, day } = await res.json();
      localStorage.setItem("nextWeek", week);
      localStorage.setItem("nextDay", day);
    } else {
      localStorage.setItem("nextWeek", 1);
      localStorage.setItem("nextDay", 1);
    }
  } catch (err) {
    console.error(err);
    localStorage.setItem("nextWeek", 1);
    localStorage.setItem("nextDay", 1);
  }
  navigate("/session");
};

  const assignProgramToUser = async () => {
    if (!assignEmail || !assignProgram) {
      setAdminMessage("Please fill in email and program");
      return;
    }
    try {
      const res = await fetch("/api/admin/assign-program", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminEmail: userEmail,
          adminPassword,
          userEmail: assignEmail,
          programName: assignProgram
        })
      });
      const data = await res.json();
      if (res.ok) {
        setAdminMessage(`✅ ${data.message}`);
        setAssignEmail("");
        setAssignProgram("");
        setAdminPassword("");
      } else {
        setAdminMessage(`❌ ${data.error}`);
      }
    } catch (err) {
      setAdminMessage(`❌ Error: ${err.message}`);
    }
  };

  function predictPR(history) {
  if (history.length < 2) return null;
  const recent = history.slice(-4);
  const x = recent.map((_, i) => i);
  const y = recent.map(h => h.estimated1RM);
  const n = x.length;
  const sumX = x.reduce((a,b)=>a+b,0);
  const sumY = y.reduce((a,b)=>a+b,0);
  const sumXY = x.reduce((a,b,i)=>a + b*y[i],0);
  const sumX2 = x.reduce((a,b)=>a + b*b,0);
  const slope = (n*sumXY - sumX*sumY) / (n*sumX2 - sumX*sumX);
  const intercept = (sumY - slope*sumX) / n;
  const nextX = recent.length;
  return Math.round(slope * nextX + intercept);
}

  if (loading) return <div className="dashboard-loading">Loading your data...</div>;

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>⚡ Forge of Olympus</h1>
        <button onClick={() => { localStorage.clear(); navigate("/"); }} className="logout-btn">Logout</button>
      </div>

      <div className="dashboard-grid">
        {/* Existing cards */}
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
          <button onClick={() => navigate("/")} className="btn-secondary">Browse More Programs</button>
        </div>

        <div className="card">
  <h2>Estimated 1RM</h2>
  <div className="estimates-list">
    <div className="estimate-item"><span>Squat</span><strong>{estimates["Squat (Top set)"] || "—"} kg</strong></div>
    <div className="estimate-item"><span>Bench</span><strong>{estimates["Bench (Top set)"] || "—"} kg</strong></div>
    <div className="estimate-item"><span>Deadlift</span><strong>{estimates["Deadlift (Top set)"] || "—"} kg</strong></div>
  </div>
  <div className="estimate-item">
  <span>Squat (4‑week PR)</span>
  <strong>{predictPR || estimates["Squat (Top set)"]} kg</strong>
</div>
  {/* Add chart for each lift – you can use a dropdown or just show one at a time */}
  <details>
    <summary style={{cursor:"pointer", marginTop:"16px", color:"var(--accent)"}}>View Progress Chart</summary>
    <DashboardChart userId={userId} liftName="Squat (Top set)" />
    <DashboardChart userId={userId} liftName="Bench (Top set)" />
    <DashboardChart userId={userId} liftName="Deadlift (Top set)" />
  </details>
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

        <div className="card">
  <h2>Workout Streak</h2>
  <p style={{fontSize:"2rem", fontWeight:"bold", color:"var(--accent)"}}>
    {localStorage.getItem("streak") || 0} 🔥
  </p>
  <p>Consecutive workout days</p>
</div>

        {/* Admin Panel – only visible to admin */}
        {isAdmin && (
          <div className="card admin-card">
            <h2>🔧 Admin: Assign Program</h2>
            <div className="admin-form">
              <input
                type="email"
                placeholder="User Email"
                value={assignEmail}
                onChange={e => setAssignEmail(e.target.value)}
                className="admin-input"
              />
              <select
                value={assignProgram}
                onChange={e => setAssignProgram(e.target.value)}
                className="admin-input"
              >
                <option value="">Select Program</option>
                <option value="Ares Protocol">Ares Protocol</option>
                <option value="Apollo Physique">Apollo Physique</option>
                <option value="Hercules Foundation">Hercules Foundation</option>
                <option value="Hephaestus Framework">Hephaestus Framework</option>
                <option value="Mark Training">Mark Training</option>
              </select>
              <input
                type="password"
                placeholder="Admin Password (if set)"
                value={adminPassword}
                onChange={e => setAdminPassword(e.target.value)}
                className="admin-input"
              />
              <button onClick={assignProgramToUser} className="btn-primary">Assign Program</button>
              {adminMessage && <p className="admin-message">{adminMessage}</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}