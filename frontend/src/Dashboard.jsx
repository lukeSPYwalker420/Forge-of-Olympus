import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardChart from './DashboardChart';
import "./Dashboard.css";

export default function Dashboard() {
  const navigate = useNavigate();
  const userId = localStorage.getItem("userId");
  const userEmail = localStorage.getItem("userEmail") || "";
  const [purchasedPrograms, setPurchasedPrograms] = useState([]);
  const [estimates, setEstimates] = useState({});
  const [recentSessions, setRecentSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Admin state
  const [assignEmail, setAssignEmail] = useState("");
  const [assignProgram, setAssignProgram] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminMessage, setAdminMessage] = useState("");
  const [leads, setLeads] = useState([]);
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [exporting, setExporting] = useState(false);

  const isAdmin = userEmail === "kieren2203@googlemail.com";

  useEffect(() => {
  if (!userId) {
    navigate("/login");
    return;
  }

  const fetchData = async () => {
    try {
      const programs = JSON.parse(localStorage.getItem("purchasedPrograms") || "[]");
      setPurchasedPrograms(programs);

      const mainLifts = ["Squat (Top Set)", "Bench (Top Set)", "Deadlift (Top Set)"];
      
      // Fetch all 1RMs in parallel
      const estPromises = mainLifts.map(lift =>
        fetch(`/api/estimate-1rm/${userId}/${encodeURIComponent(lift)}`)
          .then(res => res.json())
          .catch(err => ({ estimated1RM: null, error: err }))
      );
      const estResults = await Promise.all(estPromises);
      
      // Build the estimates object
      const estMap = {};
      mainLifts.forEach((lift, idx) => {
        estMap[lift] = estResults[idx].estimated1RM || 0;
      });
      setEstimates(estMap);

      const historyRes = await fetch(`/api/recent-sessions/${userId}`);
      if (historyRes.ok) {
        const sessions = await historyRes.json();
        setRecentSessions(sessions.slice(0, 5));
      }
    } catch (err) {
      console.error("Dashboard fetch error:", err);
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
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((a, b, i) => a + b * y[i], 0);
    const sumX2 = x.reduce((a, b) => a + b * b, 0);
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    const nextX = recent.length;
    return Math.round(slope * nextX + intercept);
  }

  const fetchLeads = async () => {
    if (!isAdmin) return;
    setLoadingLeads(true);
    try {
      const res = await fetch("/api/admin/leads", {
        headers: {
          adminEmail: userEmail,
          adminPassword: adminPassword || ""
        }
      });
      if (res.ok) {
        const data = await res.json();
        setLeads(data);
      } else {
        console.error("Failed to fetch leads");
        setAdminMessage("❌ Failed to fetch leads – check admin password");
      }
    } catch (err) {
      console.error(err);
      setAdminMessage("❌ Network error fetching leads");
    } finally {
      setLoadingLeads(false);
    }
  };

  const exportLeads = async () => {
    if (!isAdmin) return;
    setExporting(true);
    try {
      const res = await fetch("/api/admin/leads/export", {
        headers: {
          adminEmail: userEmail,
          adminPassword: adminPassword || ""
        }
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "forge_leads.csv";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        alert("Export failed – check admin password");
      }
    } catch (err) {
      console.error(err);
      alert("Export failed");
    } finally {
      setExporting(false);
    }
  };

  if (loading) return <div className="dashboard-loading">Loading your data...</div>;

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>⚡ Forge of Olympus</h1>
        <button onClick={() => { localStorage.clear(); navigate("/"); }} className="logout-btn">Logout</button>
      </div>

      <div className="dashboard-grid">
        {/* Your Program Card */}
        <div className="card">
          <h2>Your Program</h2>
          {purchasedPrograms.length === 0 ? (
            <p>No programs purchased. <a href="/" style={{ color: "var(--accent)" }}>Buy now</a></p>
          ) : (
            <>
              <p>Active: <strong>{localStorage.getItem("program") || "Not selected"}</strong></p>
              <button onClick={() => navigate("/program")} className="btn-primary">Change Program</button>
            </>
          )}
          <button onClick={handleStartWorkout} className="btn-workout">🏋️ Start Workout</button>
          <button onClick={() => navigate("/")} className="btn-secondary">Browse More Programs</button>
        </div>

        {/* Estimated 1RM Card */}
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
          <details>
            <summary style={{ cursor: "pointer", marginTop: "16px", color: "var(--accent)" }}>View Progress Chart</summary>
            <DashboardChart userId={userId} liftName="Squat (Top set)" />
            <DashboardChart userId={userId} liftName="Bench (Top set)" />
            <DashboardChart userId={userId} liftName="Deadlift (Top set)" />
          </details>
        </div>

        {/* Recent Activity Card */}
        <div className="card">
  <h2>Recent Activity</h2>
  {recentSessions.length === 0 ? (
    <p>No sessions logged yet.</p>
  ) : (
    (() => {
      // Group sessions by date
      const grouped = recentSessions.reduce((acc, session) => {
        const date = new Date(session.createdAt).toLocaleDateString(undefined, {
          weekday: 'short',
          month: 'short',
          day: 'numeric'
        });
        if (!acc[date]) acc[date] = [];
        acc[date].push(session);
        return acc;
      }, {});
      
      return Object.entries(grouped).map(([date, sessions]) => (
        <div key={date} style={{ marginBottom: 16, borderBottom: "1px solid var(--border)", paddingBottom: 12 }}>
          <h3 style={{ color: "var(--accent)", marginBottom: 8, fontSize: "1rem" }}>{date}</h3>
          {sessions.map((s, idx) => (
            <div key={idx} style={{ fontSize: "0.85rem", paddingLeft: 8, marginBottom: 4 }}>
              <strong>{s.liftName}</strong> – {s.setsCompleted || 1} sets × {s.repsCompleted} reps
              {s.actualWeight && <span> @ {s.actualWeight}kg</span>}
              {s.actualRPE && <span> (RPE {s.actualRPE})</span>}
              {s.actualRIR && <span> (RIR {s.actualRIR})</span>}
            </div>
          ))}
        </div>
      ));
    })()
  )}
</div>

        {/* Workout Streak Card */}
        <div className="card">
          <h2>Workout Streak</h2>
          <p style={{ fontSize: "2rem", fontWeight: "bold", color: "var(--accent)" }}>
            {localStorage.getItem("streak") || 0} 🔥
          </p>
          <p>Consecutive workout days</p>
        </div>

        {/* Admin Panel – only visible to admin */}
        {isAdmin && (
          <div className="card admin-card">
            <h2>🔧 Admin Panel</h2>
            {/* Assign Program Section */}
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

            <hr style={{ margin: "20px 0", borderColor: "#333" }} />

            {/* Leads Section */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                <h3>📧 Captured Leads ({leads.length})</h3>
                <div>
                  <button onClick={fetchLeads} className="btn-secondary" style={{ marginRight: "10px" }}>
                    Refresh
                  </button>
                  <button onClick={exportLeads} className="btn-primary" disabled={exporting}>
                    {exporting ? "Exporting..." : "Export CSV"}
                  </button>
                </div>
              </div>
              {loadingLeads ? (
                <p>Loading leads...</p>
              ) : leads.length === 0 ? (
                <p>No leads yet. Ask users to register on the homepage.</p>
              ) : (
                <div style={{ maxHeight: "300px", overflowY: "auto", marginTop: "10px" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
                    <thead>
                      <tr>
                        <th>Email</th>
                        <th>Source</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leads.map((lead, idx) => (
                        <tr key={idx} style={{ borderTop: "1px solid #333" }}>
                          <td style={{ padding: "8px 4px" }}>{lead.email}</td>
                          <td style={{ padding: "8px 4px" }}>{lead.source || "register_modal"}</td>
                          <td style={{ padding: "8px 4px" }}>{new Date(lead.createdAt).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}