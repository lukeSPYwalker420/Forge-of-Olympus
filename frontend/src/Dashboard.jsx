import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardChart from './DashboardChart';
import "./Dashboard.css";
import html2canvas from 'html2canvas';
import ProgressLog from './ProgressLog';
import CoachPrompts from './CoachPrompts';
import { useSwipeable } from 'react-swipeable';

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
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [programConfig, setProgramConfig] = useState(null);
  const [rewards, setRewards] = useState({ unlockedRewards: [], nextMilestone: null, streak: 0 });
  const [dailyQuote, setDailyQuote] = useState(null);

  // Admin states (all original)
  const [assignEmail, setAssignEmail] = useState("");
  const [assignProgram, setAssignProgram] = useState("");
  const [adminMessage, setAdminMessage] = useState("");
  const [leads, setLeads] = useState([]);
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [removeEmail, setRemoveEmail] = useState("");
  const [removeProgram, setRemoveProgram] = useState("");
  const [removeMessage, setRemoveMessage] = useState("");
  const [premiumEmail, setPremiumEmail] = useState("");
  const [premiumMessage, setPremiumMessage] = useState("");
  const [manualPremiumUsers, setManualPremiumUsers] = useState([]);
  const [loadingPremiumUsers, setLoadingPremiumUsers] = useState(false);

  const isAdmin = userEmail === "kieren2203@googlemail.com";
  const { unlockedRewards = [], nextMilestone = null } = rewards;

  // Carousel state
  const [currentCard, setCurrentCard] = useState(0);
  const nextCard = () => setCurrentCard(prev => Math.min(prev + 1, cards.length - 1));
  const prevCard = () => setCurrentCard(prev => Math.max(prev - 1, 0));
  const swipeHandlers = useSwipeable({
    onSwipedLeft: nextCard,
    onSwipedRight: prevCard,
    preventDefaultTouchmoveEvent: true,
    trackMouse: true,
  });

  // Handle program just selected
  useEffect(() => {
    if (localStorage.getItem("programJustSelected") === "true") {
      localStorage.removeItem("programJustSelected");
      setLoading(true);
      setTimeout(() => setLoading(false), 100);
    }
  }, []);

  // PWA install
  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBanner(true);
    });
  }, []);

  const handleInstallClick = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(() => {
        setDeferredPrompt(null);
        setShowInstallBanner(false);
      });
    }
  };

  // Subscription check
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
      } catch (error) {
        console.error("Subscription check error:", error);
      }
    };
    checkSubscription();
  }, [userId]);

  // Main dashboard data
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
            .catch(() => ({ estimated1RM: null }))
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

  // Program config sync
  useEffect(() => {
    if (!userId) return;
    fetch(`/api/user-program-config/${userId}`)
      .then(res => res.json())
      .then(data => {
        if (data.config) {
          setProgramConfig(data.config);
          localStorage.setItem("activeProgramConfig", JSON.stringify(data.config));
          const programName = data.config.displayTitle || data.config.programName;
          if (programName) localStorage.setItem("program", programName);
          window.dispatchEvent(new Event("authChange"));
        }
      })
      .catch(error => console.error("Failed to fetch program config:", error));
  }, [userId]);

  // Rewards
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
      .catch(error => console.error("Rewards fetch error:", error));
  }, [userId]);

  // Daily quote
  useEffect(() => {
    const streak = parseInt(localStorage.getItem("streak") || 0);
    if (streak >= 3) {
      fetch(`/api/daily-quote`)
        .then(res => res.json())
        .then(data => setDailyQuote(data))
        .catch(error => console.error("Quote fetch error:", error));
    }
  }, [rewards.streak]);

  // Admin data fetching (fetchManualPremiumUsers defined inside effect to avoid missing dependency)
  useEffect(() => {
    if (!isAdmin) return;
    const fetchManualPremiumUsers = async () => {
      setLoadingPremiumUsers(true);
      try {
        const res = await fetch("/api/admin/manual-premium-users", {
          headers: { adminEmail: userEmail }
        });
        if (res.ok) {
          const data = await res.json();
          setManualPremiumUsers(data);
        }
      } catch (error) {
        console.error("Error fetching manual premium users:", error);
      } finally {
        setLoadingPremiumUsers(false);
      }
    };
    fetchManualPremiumUsers();
  }, [isAdmin, userEmail]);

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
      console.error("Start workout error:", err);
      localStorage.setItem("nextWeek", 1);
      localStorage.setItem("nextDay", 1);
    }
    navigate("/session");
  };

  const shareProgress = async () => {
    const element = document.querySelector('.progress-share-card');
    if (!element) return;
    const canvas = await html2canvas(element);
    const link = document.createElement('a');
    link.download = 'apex-progress.png';
    link.href = canvas.toDataURL();
    link.click();
  };

  // Admin functions
  const assignProgramToUser = async () => {
    if (!assignEmail || !assignProgram) {
      setAdminMessage("Please fill in email and program");
      return;
    }
    try {
      const res = await fetch("/api/admin/assign-program", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminEmail: userEmail, userEmail: assignEmail, programName: assignProgram })
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
        body: JSON.stringify({ adminEmail: userEmail, userEmail: removeEmail, programName: removeProgram })
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

  const grantManualPremium = async () => {
    if (!premiumEmail) {
      setPremiumMessage("Please enter an email");
      return;
    }
    try {
      const res = await fetch("/api/admin/grant-premium", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminEmail: userEmail, userEmail: premiumEmail })
      });
      const data = await res.json();
      if (res.ok) {
        setPremiumMessage(`✅ ${data.message}`);
        setPremiumEmail("");
        // Refresh the list
        const refreshRes = await fetch("/api/admin/manual-premium-users", {
          headers: { adminEmail: userEmail }
        });
        if (refreshRes.ok) {
          const users = await refreshRes.json();
          setManualPremiumUsers(users);
        }
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
        body: JSON.stringify({ adminEmail: userEmail, userEmail: emailToRevoke })
      });
      const data = await res.json();
      if (res.ok) {
        setPremiumMessage(`✅ ${data.message}`);
        const refreshRes = await fetch("/api/admin/manual-premium-users", {
          headers: { adminEmail: userEmail }
        });
        if (refreshRes.ok) {
          const users = await refreshRes.json();
          setManualPremiumUsers(users);
        }
      } else {
        setPremiumMessage(`❌ ${data.error}`);
      }
    } catch (err) {
      setPremiumMessage(`❌ Error: ${err.message}`);
    }
  };

  const fetchLeads = async () => {
    if (!isAdmin) return;
    setLoadingLeads(true);
    try {
      const res = await fetch("/api/admin/leads", {
        headers: { adminEmail: userEmail }
      });
      if (res.ok) {
        const data = await res.json();
        setLeads(data);
      } else {
        setAdminMessage("❌ Failed to fetch leads");
      }
    } catch {
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
        headers: { adminEmail: userEmail }
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "apex_leads.csv";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        alert("Export failed");
      }
    } catch (err) {
      console.error(err);
      alert("Export failed");
    } finally {
      setExporting(false);
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

  if (loading) return <div className="dashboard-loading">Loading your data...</div>;

  // ----- Card definitions (original, with cleaner styling) -----
  const programCard = (
    <div className="card premium-card-style">
      <h2>Your Program</h2>
      {purchasedPrograms.length === 0 && !programConfig ? (
        <p>No programs purchased. <a href="/" style={{ color: "var(--accent)" }}>Buy now</a></p>
      ) : (
        <>
          {programConfig ? (
            <div style={{ marginBottom: "12px" }}>
              <p><strong>{programConfig.displayTitle || localStorage.getItem("program") || "Active program"}</strong></p>
              {programConfig.frequency && <p>📅 {programConfig.frequency} days/week</p>}
              {programConfig.focus && <p>🎯 Focus: {programConfig.focus.replace('_', ' ').toUpperCase()}</p>}
            </div>
          ) : (
            <p>Active: <strong>{localStorage.getItem("program") || "Not selected"}</strong></p>
          )}
          <button onClick={() => navigate("/program")} className="btn-primary">Change Program</button>
        </>
      )}
      <button onClick={handleStartWorkout} className="btn-workout">🏋️ Start Workout</button>
      <button onClick={() => navigate("/")} className="btn-secondary">Browse More Programs</button>
      {!subscriptionActive && (purchasedPrograms.length > 0 || programConfig) && (
        <div className="subscription-warning">
          <strong>⚠️ Your subscription has expired.</strong> You can still view your history, but weight recommendations are hidden. <a href="/" style={{ color: "#ffaa44" }}>Resubscribe now</a>
        </div>
      )}
      <div className="card-buttons">
        <button onClick={() => {
          const shareText = `I finally stopped guessing my weights. Apex Method calculates every set based on my actual performance. 30 days free.`;
          window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`, '_blank');
        }} className="share-twitter">🐦 Share</button>
        <button onClick={shareProgress} className="share-progress">📸 Share My Progress</button>
      </div>
    </div>
  );

  const oneRMCard = (
    <div className="card premium-card-style">
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
        <summary>View Progress Chart</summary>
        <DashboardChart userId={userId} liftName="Squat (Top Set)" />
        <DashboardChart userId={userId} liftName="Bench (Top Set)" />
        <DashboardChart userId={userId} liftName="Deadlift (Top Set)" />
      </details>
    </div>
  );

  const coachCard = <CoachPrompts userId={userId} />;
  const recentActivityCard = <ProgressLog recentSessions={recentSessions} expandedWorkout={expandedWorkout} setExpandedWorkout={setExpandedWorkout} />;
  const streakCard = (
    <div className="card premium-card-style">
      <h2>Workout Streak</h2>
      <p className="streak-value">{localStorage.getItem("streak") || 0} 🔥</p>
      <p>Consecutive workout days</p>
    </div>
  );

  const dailyQuoteCard = dailyQuote && (
    <div className="card quote-card">
      <h2>💪 Daily Motivation</h2>
      <p className="quote-text">"{dailyQuote.text}"</p>
      <p className="quote-author">— {dailyQuote.author}</p>
    </div>
  );

  const rewardsCard = (
    <div className="card premium-card-style">
      <h2>🏆 Streak Rewards</h2>
      <div className="streak-header">
        <p className="streak-big">{localStorage.getItem("streak") || 0} days 🔥</p>
        {nextMilestone && <div className="next-milestone">Next reward in {nextMilestone.daysNeeded} days</div>}
      </div>
      {nextMilestone && (
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${((parseInt(localStorage.getItem("streak") || 0) - (nextMilestone.days - nextMilestone.daysNeeded)) / nextMilestone.daysNeeded * 100)}%` }}></div>
        </div>
      )}
      <details>
        <summary>View unlocked rewards ({unlockedRewards.length})</summary>
        <div className="rewards-list">
          {unlockedRewards.map(reward => (
            <div key={reward.rewardId}><span>✅</span> <strong>{reward.days} days:</strong> {reward.name}</div>
          ))}
        </div>
      </details>
    </div>
  );

  const adminCard = isAdmin && (
    <div className="card admin-card">
      <h2>🔧 Admin Panel</h2>
      <div className="admin-form">
        <input type="email" placeholder="User Email" value={assignEmail} onChange={e => setAssignEmail(e.target.value)} className="admin-input" />
        <select value={assignProgram} onChange={e => setAssignProgram(e.target.value)} className="admin-input">
          <option value="">Select Program</option>
          <option value="Ares Protocol">Ares Protocol</option>
          <option value="Apollo Physique">Apollo Physique</option>
          <option value="Hercules Foundation">Hercules Foundation</option>
          <option value="Hephaestus Framework">Hephaestus Framework</option>
          <option value="Mark Training">Mark Training</option>
          <option value="Hercules-Foundation-Pauline-Version">Hercules Foundation - Pauline Version</option>
          <option value="6-Week Wave Powerlifting">6-Week Wave Powerlifting</option>
          <option value="High-Frequency Specificity Wave">High-Frequency Specificity Wave</option>
        </select>
        <button onClick={assignProgramToUser} className="btn-primary">Assign Program</button>
        {adminMessage && <p className="admin-message">{adminMessage}</p>}
      </div>
      <div className="admin-section">
        <h3>🗑️ Remove Program from User</h3>
        <div className="admin-form">
          <input type="email" placeholder="User Email" value={removeEmail} onChange={e => setRemoveEmail(e.target.value)} className="admin-input" />
          <select value={removeProgram} onChange={e => setRemoveProgram(e.target.value)} className="admin-input">
            <option value="">Select Program to Remove</option>
            <option value="Ares Protocol">Ares Protocol</option>
            <option value="Apollo Physique">Apollo Physique</option>
            <option value="Hercules Foundation">Hercules Foundation</option>
            <option value="Hephaestus Framework">Hephaestus Framework</option>
            <option value="6-Week Wave Powerlifting">6-Week Wave Powerlifting</option>
            <option value="High-Frequency Specificity Wave">High-Frequency Specificity Wave</option>
          </select>
          <button onClick={removeProgramFromUser} className="remove-btn">Remove Program</button>
          {removeMessage && <p className="admin-message">{removeMessage}</p>}
        </div>
      </div>
      <hr />
      <div>
        <div className="leads-header">
          <h3>📧 Captured Leads ({leads.length})</h3>
          <div>
            <button onClick={fetchLeads} className="btn-secondary">Refresh</button>
            <button onClick={exportLeads} className="btn-primary" disabled={exporting}>{exporting ? "Exporting..." : "Export CSV"}</button>
          </div>
        </div>
        {loadingLeads ? <p>Loading leads...</p> : leads.length === 0 ? <p>No leads yet.</p> : (
          <div className="leads-table">
            <table>
              <thead><tr><th>Email</th><th>Source</th><th>Date</th></tr></thead>
              <tbody>
                {leads.map((lead, idx) => (
                  <tr key={idx}>
                    <td>{lead.email}</td>
                    <td>{lead.source || "register_modal"}</td>
                    <td>{new Date(lead.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <hr />
      <div>
        <h3>👑 Manual Premium Access</h3>
        <p className="premium-note">Grant full app access to users who pay you directly</p>
        <div className="admin-form">
          <input type="email" placeholder="User Email" value={premiumEmail} onChange={e => setPremiumEmail(e.target.value)} className="admin-input" />
          <div className="premium-buttons">
            <button onClick={grantManualPremium} className="grant-btn">Grant Premium Access</button>
            <button onClick={fetchLeads} className="btn-secondary">Refresh List</button>
          </div>
          {premiumMessage && <p className="admin-message">{premiumMessage}</p>}
        </div>
        {loadingPremiumUsers ? <p>Loading premium users...</p> : manualPremiumUsers.length > 0 ? (
          <div className="premium-users-table">
            <table>
              <thead><tr><th>Email</th><th>Granted</th><th>Streak</th><th>Action</th></tr></thead>
              <tbody>
                {manualPremiumUsers.map((user, idx) => (
                  <tr key={idx}>
                    <td>{user.email}</td>
                    <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                    <td>{user.streak || 0}🔥</td>
                    <td><button onClick={() => revokeManualPremium(user.email)} className="revoke-btn">Revoke</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p>No manual premium users yet</p>}
      </div>
    </div>
  );

  const cancelCard = subscriptionActive && !isAdmin && (
    <div className="card cancel-card">
      <h2>⚠️ Cancel Subscription</h2>
      <p>Your subscription will remain active until the end of the current billing period. After that, you will lose premium features (weight recommendations, adaptive progression).</p>
      <button onClick={async () => {
        if (!confirm("Are you sure you want to cancel your subscription? You will keep access until the next billing date, then your plan will end.")) return;
        try {
          const res = await fetch("/api/cancel-subscription", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId }) });
          const data = await res.json();
          if (res.ok) {
            alert("Subscription cancelled. You will retain premium access until the end of your billing period.");
            const statusRes = await fetch(`/api/subscription-status/${userId}`);
            const statusData = await statusRes.json();
            setSubscriptionActive(statusData.active);
          } else {
            alert(data.error || "Failed to cancel subscription");
          }
        } catch (err) {
          alert("Error: " + err.message);
        }
      }} className="cancel-btn">Cancel Subscription</button>
    </div>
  );

  // Build cards array (same as original)
  let cards = [programCard, oneRMCard, coachCard, recentActivityCard, streakCard];
  if (dailyQuote) cards.push(dailyQuoteCard);
  cards.push(rewardsCard);
  if (isAdmin) cards.push(adminCard);
  if (subscriptionActive && !isAdmin) cards.push(cancelCard);
  if (currentCard >= cards.length) setCurrentCard(0);

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <span className="dashboard-logo" onClick={() => navigate("/")}>APEX METHOD</span>
        <button onClick={() => { localStorage.clear(); navigate("/"); }} className="logout-btn">Logout</button>
      </div>

      {showInstallBanner && (
        <div className="install-banner">
          <span>📲 Install Apex Method as an app</span>
          <button onClick={handleInstallClick}>Install</button>
        </div>
      )}

      <div className="carousel-container">
        <div className="carousel-header">
          <span className="carousel-counter">{currentCard + 1} / {cards.length}</span>
          <div className="carousel-nav-buttons">
            <button onClick={prevCard} disabled={currentCard === 0} className="nav-btn">◀</button>
            <button onClick={nextCard} disabled={currentCard === cards.length - 1} className="nav-btn">▶</button>
          </div>
        </div>
        <div className="carousel-card-wrapper" {...swipeHandlers}>
          <div className="carousel-card">{cards[currentCard]}</div>
        </div>
      </div>

      <div className="progress-share-card" style={{ position: 'absolute', left: '-9999px', top: 0, width: '400px', background: '#1e1e2a', padding: '20px', borderRadius: '16px' }}>
        <h3 style={{ color: 'var(--accent)' }}>My Apex Method Progress</h3>
        <p>🔥 Streak: {localStorage.getItem("streak") || 0} days</p>
        <p>🏋️ Squat 1RM: {estimates["Squat (Top Set)"] || "—"} kg</p>
        <p>💪 Bench 1RM: {estimates["Bench (Top Set)"] || "—"} kg</p>
        <p>🏆 Deadlift 1RM: {estimates["Deadlift (Top Set)"] || "—"} kg</p>
        <p>📅 Last workout: {recentSessions[0] ? new Date(recentSessions[0].createdAt).toLocaleDateString() : "—"}</p>
      </div>
    </div>
  );
}