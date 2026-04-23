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
  const [expandedWorkout, setExpandedWorkout] = useState(null);
  const [subscriptionActive, setSubscriptionActive] = useState(true);
  
  // Rewards state
  const [rewards, setRewards] = useState({ unlockedRewards: [], nextMilestone: null, streak: 0 });
  const [dailyQuote, setDailyQuote] = useState(null);

  // Admin state
  const [assignEmail, setAssignEmail] = useState("");
  const [assignProgram, setAssignProgram] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminMessage, setAdminMessage] = useState("");
  const [leads, setLeads] = useState([]);
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [exporting, setExporting] = useState(false);
  
  // Remove program state
  const [removeEmail, setRemoveEmail] = useState("");
  const [removeProgram, setRemoveProgram] = useState("");
  const [removeMessage, setRemoveMessage] = useState("");

  // Manual premium state
  const [premiumEmail, setPremiumEmail] = useState("");
  const [premiumMessage, setPremiumMessage] = useState("");
  const [manualPremiumUsers, setManualPremiumUsers] = useState([]);
  const [loadingPremiumUsers, setLoadingPremiumUsers] = useState(false);

  const isAdmin = userEmail === "kieren2203@googlemail.com";
  
  const { unlockedRewards = [], nextMilestone = null } = rewards;

  // Handle program just selected (fixes the infinite loop)
  useEffect(() => {
    if (localStorage.getItem("programJustSelected") === "true") {
      localStorage.removeItem("programJustSelected");
      setLoading(true);
      setTimeout(() => setLoading(false), 100);
    }
  }, []);

  useEffect(() => {
    const checkSubscription = async () => {
      if (!userId) return;
      
      const userEmail = localStorage.getItem("userEmail");
      const isAdmin = userEmail === "kieren2203@googlemail.com";
      
      if (isAdmin) {
        setSubscriptionActive(true);
        return;
      }
      
      try {
        const res = await fetch(`/api/subscription-status/${userId}`);
        const data = await res.json();
        setSubscriptionActive(data.active);
      } catch (err) {
        console.error(err);
      }
    };
    checkSubscription();
  }, [userId]);

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
        
        const estPromises = mainLifts.map(lift =>
          fetch(`/api/estimate-1rm/${userId}/${encodeURIComponent(lift)}`)
            .then(res => res.json())
            .catch(err => ({ estimated1RM: null, error: err }))
        );
        const estResults = await Promise.all(estPromises);
        
        const estMap = {};
        mainLifts.forEach((lift, idx) => {
          estMap[lift] = estResults[idx].estimated1RM || 0;
        });
        setEstimates(estMap);

        const historyRes = await fetch(`/api/recent-sessions/${userId}?limit=50`);
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

  // Fetch streak rewards
  useEffect(() => {
    if (!userId) return;
    fetch(`/api/user-rewards/${userId}`)
      .then(res => res.json())
      .then(data => {
        setRewards(data);
        if (data.streak !== parseInt(localStorage.getItem("streak") || 0)) {
          localStorage.setItem("streak", data.streak);
        }
      })
      .catch(err => console.error(err));
  }, [userId]);

  // Fetch daily quote if streak >= 3
  useEffect(() => {
    const streak = parseInt(localStorage.getItem("streak") || 0);
    if (streak >= 3) {
      fetch(`/api/daily-quote`)
        .then(res => res.json())
        .then(data => setDailyQuote(data))
        .catch(err => console.error(err));
    }
  }, [rewards.streak]);

  // Fetch manual premium users if admin
  useEffect(() => {
    if (isAdmin) {
      fetchManualPremiumUsers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

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
          userEmail: assignEmail,
          programName: assignProgram
        })
      });
      const data = await res.json();
      if (res.ok) {
        setAdminMessage(`✅ ${data.message}`);
        
        if (assignEmail === userEmail) {
          const loginRes = await fetch("/api/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: userEmail })
          });
          const loginData = await loginRes.json();
          if (loginRes.ok) {
            localStorage.setItem("purchasedPrograms", JSON.stringify(loginData.purchasedPrograms));
            setPurchasedPrograms(loginData.purchasedPrograms);
          }
        }
        
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

  const removeProgramFromUser = async () => {
    if (!removeEmail || !removeProgram) {
      setRemoveMessage("Please fill in email and program");
      return;
    }
    try {
      const res = await fetch("/api/admin/remove-program", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminEmail: userEmail,
          userEmail: removeEmail,
          programName: removeProgram
        })
      });
      const data = await res.json();
      if (res.ok) {
        setRemoveMessage(`✅ ${data.message}`);
        setRemoveEmail("");
        setRemoveProgram("");
      } else {
        setRemoveMessage(`❌ ${data.error}`);
      }
    } catch (err) {
      setRemoveMessage(`❌ Error: ${err.message}`);
    }
  };

  // Manual premium functions
  const grantManualPremium = async () => {
    if (!premiumEmail) {
      setPremiumMessage("Please enter an email");
      return;
    }
    try {
      const res = await fetch("/api/admin/grant-premium", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminEmail: userEmail,
          userEmail: premiumEmail
        })
      });
      const data = await res.json();
      if (res.ok) {
        setPremiumMessage(`✅ ${data.message}`);
        setPremiumEmail("");
        fetchManualPremiumUsers();
      } else {
        setPremiumMessage(`❌ ${data.error}`);
      }
    } catch (err) {
      setPremiumMessage(`❌ Error: ${err.message}`);
    }
  };

  const revokeManualPremium = async (emailToRevoke) => {
    if (!confirm(`Remove premium access from ${emailToRevoke}?`)) return;
    try {
      const res = await fetch("/api/admin/revoke-premium", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminEmail: userEmail,
          userEmail: emailToRevoke
        })
      });
      const data = await res.json();
      if (res.ok) {
        setPremiumMessage(`✅ ${data.message}`);
        fetchManualPremiumUsers();
      } else {
        setPremiumMessage(`❌ ${data.error}`);
      }
    } catch (err) {
      setPremiumMessage(`❌ Error: ${err.message}`);
    }
  };

  const fetchManualPremiumUsers = async () => {
    if (!isAdmin) return;
    setLoadingPremiumUsers(true);
    try {
      const res = await fetch("/api/admin/manual-premium-users", {
        headers: {
          adminEmail: userEmail
        }
      });
      if (res.ok) {
        const data = await res.json();
        setManualPremiumUsers(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingPremiumUsers(false);
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
        <span className="dashboard-logo" onClick={() => navigate("/")} style={{ cursor: "pointer" }}>
          ⚡ FORGE OF OLYMPUS
        </span>
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
          {!subscriptionActive && purchasedPrograms.length > 0 && (
            <div style={{ 
              background: "#ffaa4422", 
              padding: "12px", 
              borderRadius: "8px", 
              marginBottom: "12px",
              textAlign: "center"
            }}>
              <strong>⚠️ Your subscription has expired.</strong> You can still view your history,
              but weight recommendations are hidden. <a href="/" style={{ color: "#ffaa44" }}>Resubscribe now</a>
            </div>
          )}
          <button 
            onClick={() => {
              const shareText = `I'm training with Forge of Olympus! 🔥 Join me: forge-of-olympus.onrender.com`;
              window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`, '_blank');
            }}
            style={{ background: "#1da1f2", color: "#fff", border: "none", padding: "8px 16px", borderRadius: "20px", cursor: "pointer" }}
          >
            🐦 Share
          </button>
        </div>

        {/* Estimated 1RM Card */}
        <div className="card">
          <h2>Estimated 1RM</h2>
          <div className="estimates-list">
            <div className="estimate-item"><span>Squat</span><strong>{estimates["Squat (Top Set)"] || "—"} kg</strong></div>
            <div className="estimate-item"><span>Bench</span><strong>{estimates["Bench (Top Set)"] || "—"} kg</strong></div>
            <div className="estimate-item"><span>Deadlift</span><strong>{estimates["Deadlift (Top Set)"] || "—"} kg</strong></div>
          </div>
          <div className="estimate-item">
            <span>Squat (4‑week PR)</span>
            <strong>{predictPR || estimates["Squat (Top Set)"]} kg</strong>
          </div>
          <details>
            <summary style={{ cursor: "pointer", marginTop: "16px", color: "var(--accent)" }}>View Progress Chart</summary>
            <DashboardChart userId={userId} liftName="Squat (Top Set)" />
            <DashboardChart userId={userId} liftName="Bench (Top Set)" />
            <DashboardChart userId={userId} liftName="Deadlift (Top Set)" />
          </details>
        </div>

        {/* Recent Activity Card */}
        <div className="card">
          <h2>Recent Activity</h2>
          {recentSessions.length === 0 ? (
            <p>No sessions logged yet.</p>
          ) : (
            (() => {
              const workoutMap = new Map();
              
              recentSessions.forEach(session => {
                const date = new Date(session.createdAt);
                const dateKey = date.toDateString();
                const workoutKey = `${dateKey}_w${session.week}_d${session.day}`;
                
                if (!workoutMap.has(workoutKey)) {
                  workoutMap.set(workoutKey, {
                    id: workoutKey,
                    date: session.createdAt,
                    week: session.week,
                    day: session.day,
                    focus: session.programName || "Workout",
                    exercises: [],
                    isExpanded: false
                  });
                }
                workoutMap.get(workoutKey).exercises.push(session);
              });
              
              const workouts = Array.from(workoutMap.values())
                .sort((a, b) => new Date(b.date) - new Date(a.date))
                .slice(0, 4);
              
              const getWorkoutSummary = (exercises) => {
                let qualityCount = 0;
                let struggleCount = 0;
                
                exercises.forEach(ex => {
                  if (ex.actualRPE && ex.targetRPE && ex.actualRPE <= ex.targetRPE + 0.5) {
                    qualityCount++;
                  }
                  if (ex.actualRIR && ex.targetRIR && ex.actualRIR <= ex.targetRIR) {
                    qualityCount++;
                  }
                  if (ex.actualStability && ex.targetStability && ex.actualStability >= ex.targetStability) {
                    qualityCount++;
                  }
                  if (ex.actualQuality && ex.targetQuality && ex.actualQuality >= ex.targetQuality) {
                    qualityCount++;
                  }
                  
                  if (ex.actualRPE && ex.targetRPE && ex.actualRPE > ex.targetRPE + 1) {
                    struggleCount++;
                  }
                  if (ex.actualRIR && ex.targetRIR && ex.actualRIR < ex.targetRIR - 1) {
                    struggleCount++;
                  }
                  if (ex.actualStability && ex.targetStability && ex.actualStability < ex.targetStability - 1) {
                    struggleCount++;
                  }
                });
                
                const successRate = exercises.length > 0 ? Math.round((qualityCount / exercises.length) * 100) : 0;
                return { successRate, struggleCount };
              };
              
              return workouts.map((workout) => {
                const isExpanded = expandedWorkout === workout.id;
                const workoutDate = new Date(workout.date);
                const today = new Date();
                const yesterday = new Date(today);
                yesterday.setDate(yesterday.getDate() - 1);
                
                let dateDisplay = workoutDate.toLocaleDateString(undefined, {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric'
                });
                
                if (workoutDate.toDateString() === today.toDateString()) {
                  dateDisplay = "Today";
                } else if (workoutDate.toDateString() === yesterday.toDateString()) {
                  dateDisplay = "Yesterday";
                }
                
                const { successRate, struggleCount } = getWorkoutSummary(workout.exercises);
                
                let statusEmoji = "✅";
                let statusColor = "var(--accent)";
                if (successRate >= 80) {
                  statusEmoji = "🔥";
                  statusColor = "#4caf50";
                } else if (successRate >= 60) {
                  statusEmoji = "💪";
                  statusColor = "var(--accent)";
                } else if (successRate >= 40) {
                  statusEmoji = "⚠️";
                  statusColor = "#ffaa44";
                } else {
                  statusEmoji = "😓";
                  statusColor = "#ff5555";
                }
                
                return (
                  <div key={workout.id} style={{ marginBottom: 16, borderBottom: "1px solid var(--border)", paddingBottom: 12 }}>
                    <div 
                      onClick={() => setExpandedWorkout(isExpanded ? null : workout.id)}
                      style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", padding: "8px", borderRadius: "8px", background: isExpanded ? "var(--card-hover)" : "transparent" }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: 4 }}>
                          <span style={{ fontSize: "1.2rem" }}>{statusEmoji}</span>
                          <h3 style={{ color: statusColor, margin: 0, fontSize: "1rem" }}>
                            {dateDisplay} - Week {workout.week}, Day {workout.day}
                          </h3>
                        </div>
                        <div style={{ display: "flex", gap: "12px", fontSize: "0.75rem", color: "var(--text-gray)" }}>
                          <span>📋 {workout.exercises.length} exercises</span>
                          <span>⭐ {successRate}% quality</span>
                          {struggleCount > 0 && <span>⚠️ {struggleCount} struggled</span>}
                        </div>
                      </div>
                      <span style={{ fontSize: "1.2rem" }}>{isExpanded ? "▲" : "▼"}</span>
                    </div>
                    
                    {isExpanded && (
                      <div style={{ marginTop: 12, paddingLeft: 8 }}>
                        {workout.exercises.map((s, idx) => {
                          let exerciseEmoji = "✓";
                          let exerciseColor = "#888";
                          
                          if (s.actualRPE && s.targetRPE) {
                            if (s.actualRPE <= s.targetRPE + 0.5) {
                              exerciseEmoji = "✅";
                              exerciseColor = "#4caf50";
                            } else if (s.actualRPE > s.targetRPE + 1) {
                              exerciseEmoji = "⚠️";
                              exerciseColor = "#ffaa44";
                            }
                          }
                          if (s.actualRIR && s.targetRIR) {
                            if (s.actualRIR <= s.targetRIR) {
                              exerciseEmoji = "✅";
                              exerciseColor = "#4caf50";
                            } else if (s.actualRIR > s.targetRIR + 1) {
                              exerciseEmoji = "⚠️";
                              exerciseColor = "#ffaa44";
                            }
                          }
                          
                          return (
                            <div key={idx} style={{ fontSize: "0.85rem", marginBottom: 8, padding: "4px 8px", borderRadius: "6px", background: "var(--bg-light)" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <span style={{ color: exerciseColor }}>{exerciseEmoji}</span>
                                <strong>{s.liftName}</strong>
                                <span style={{ color: "var(--text-gray)", fontSize: "0.75rem" }}>
                                  {s.repsPerSet && s.repsPerSet.length > 0 
                                    ? `Sets: [${s.repsPerSet.join(", ")}]`
                                    : `${s.setsCompleted || 1} × ${s.repsCompleted} reps`
                                  }
                                  {s.actualWeight && ` @ ${s.actualWeight}kg`}
                                </span>
                              </div>
                              <div style={{ fontSize: "0.7rem", color: "var(--text-gray)", paddingLeft: "24px" }}>
                                {s.actualRPE && <span>Target RPE: {s.targetRPE} → Actual: {s.actualRPE}</span>}
                                {s.actualRIR && <span>Target RIR: {s.targetRIR} → Actual: {s.actualRIR}</span>}
                                {s.actualStability && <span>Stability: {s.actualStability}/10</span>}
                                {s.actualPain && <span>Pain: {s.actualPain}/10</span>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              });
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

        {/* Daily Motivation Quote - shows at streak 3+ */}
        {dailyQuote && (
          <div className="card" style={{ textAlign: "center" }}>
            <h2>💪 Daily Motivation</h2>
            <p style={{ fontStyle: "italic", fontSize: "1.1rem", marginBottom: "8px" }}>"{dailyQuote.text}"</p>
            <p style={{ color: "var(--text-gray)", fontSize: "0.85rem" }}>— {dailyQuote.author}</p>
          </div>
        )}

        {/* Streak Rewards Card */}
        <div className="card">
          <h2>🏆 Streak Rewards</h2>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
            <p style={{ fontSize: "2rem", fontWeight: "bold", color: "var(--accent)", margin: 0 }}>
              {localStorage.getItem("streak") || 0} days 🔥
            </p>
            {nextMilestone && (
              <div style={{ textAlign: "right" }}>
                <span style={{ fontSize: "12px", color: "var(--text-gray)" }}>Next reward in</span>
                <div style={{ fontWeight: "bold", color: "var(--accent)" }}>{nextMilestone.daysNeeded} days</div>
              </div>
            )}
          </div>
          
          {/* Progress bar to next milestone */}
          {nextMilestone && (
            <div style={{ marginBottom: "16px" }}>
              <div style={{ background: "var(--bg-light)", borderRadius: "10px", height: "8px", overflow: "hidden" }}>
                <div style={{ 
                  width: `${((parseInt(localStorage.getItem("streak") || 0) - (nextMilestone.days - nextMilestone.daysNeeded)) / nextMilestone.daysNeeded * 100)}%`, 
                  background: "var(--accent)", 
                  height: "100%" 
                }} />
              </div>
              <div style={{ fontSize: "12px", color: "var(--text-gray)", marginTop: "4px" }}>
                {nextMilestone.daysNeeded} days until {nextMilestone.reward}
              </div>
            </div>
          )}
          
          {/* Unlocked rewards */}
          <details>
            <summary style={{ cursor: "pointer", color: "var(--accent)", fontSize: "14px" }}>View unlocked rewards ({unlockedRewards.length})</summary>
            <div style={{ marginTop: "12px" }}>
              {unlockedRewards.map(reward => (
                <div key={reward.rewardId} style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px", fontSize: "13px" }}>
                  <span>✅</span>
                  <span><strong>{reward.days} days:</strong> {reward.name}</span>
                </div>
              ))}
            </div>
          </details>
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
                <option value="Hercules-Foundation-Pauline-Version">Hercules Foundation - Pauline Version</option>
              </select>
              <button onClick={assignProgramToUser} className="btn-primary">Assign Program</button>
              {adminMessage && <p className="admin-message">{adminMessage}</p>}
            </div>

            {/* Remove Program Section */}
            <div style={{ marginTop: "20px", borderTop: "1px solid #333", paddingTop: "20px" }}>
              <h3>🗑️ Remove Program from User</h3>
              <div className="admin-form">
                <input
                  type="email"
                  placeholder="User Email"
                  value={removeEmail}
                  onChange={e => setRemoveEmail(e.target.value)}
                  className="admin-input"
                />
                <select
                  value={removeProgram}
                  onChange={e => setRemoveProgram(e.target.value)}
                  className="admin-input"
                >
                  <option value="">Select Program to Remove</option>
                  <option value="Ares Protocol">Ares Protocol</option>
                  <option value="Apollo Physique">Apollo Physique</option>
                  <option value="Hercules Foundation">Hercules Foundation</option>
                  <option value="Hephaestus Framework">Hephaestus Framework</option>
                </select>
                <button onClick={removeProgramFromUser} style={{ background: "#dc2626", color: "#fff", border: "none", padding: "10px", borderRadius: "6px", cursor: "pointer" }}>
                  Remove Program
                </button>
                {removeMessage && <p className="admin-message">{removeMessage}</p>}
              </div>
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

            <hr style={{ margin: "20px 0", borderColor: "#333" }} />

            {/* Manual Premium Access Section */}
            <div>
              <h3>👑 Manual Premium Access</h3>
              <p style={{ fontSize: "12px", color: "var(--text-gray)", marginBottom: "10px" }}>
                Grant full app access to users who pay you directly (offline/paired sessions)
              </p>
              <div className="admin-form">
                <input
                  type="email"
                  placeholder="User Email"
                  value={premiumEmail}
                  onChange={e => setPremiumEmail(e.target.value)}
                  className="admin-input"
                />
                <div style={{ display: "flex", gap: "10px" }}>
                  <button onClick={grantManualPremium} style={{ background: "#10b981", color: "#fff", border: "none", padding: "10px", borderRadius: "6px", cursor: "pointer", flex: 1 }}>
                    Grant Premium Access
                  </button>
                  <button onClick={fetchManualPremiumUsers} className="btn-secondary" style={{ flex: 0.5 }}>
                    Refresh List
                  </button>
                </div>
                {premiumMessage && <p className="admin-message">{premiumMessage}</p>}
              </div>
              
              {loadingPremiumUsers ? (
                <p>Loading premium users...</p>
              ) : manualPremiumUsers.length > 0 ? (
                <div style={{ marginTop: "15px", maxHeight: "200px", overflowY: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                    <thead>
                      <tr>
                        <th>Email</th>
                        <th>Granted</th>
                        <th>Streak</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {manualPremiumUsers.map((user, idx) => (
                        <tr key={idx} style={{ borderTop: "1px solid #333" }}>
                          <td style={{ padding: "8px 4px" }}>{user.email}</td>
                          <td style={{ padding: "8px 4px" }}>{new Date(user.createdAt).toLocaleDateString()}</td>
                          <td style={{ padding: "8px 4px" }}>{user.streak || 0}🔥</td>
                          <td style={{ padding: "8px 4px" }}>
                            <button 
                              onClick={() => revokeManualPremium(user.email)}
                              style={{ background: "#dc2626", color: "#fff", border: "none", padding: "4px 8px", borderRadius: "4px", cursor: "pointer", fontSize: "11px" }}
                            >
                              Revoke
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p style={{ fontSize: "12px", color: "var(--text-gray)", marginTop: "10px" }}>No manual premium users yet</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}