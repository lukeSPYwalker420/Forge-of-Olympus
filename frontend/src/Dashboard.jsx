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

  const [assignEmail, setAssignEmail] = useState("");
  const [assignProgram, setAssignProgram] = useState("");
  const [adminMessage, setAdminMessage] = useState("");
  const [leads, setLeads] = useState([]);

  const isAdmin = userEmail.toLowerCase() === "admin@apex.com" || userEmail.toLowerCase() === "coach@apex.com";

  useEffect(() => {
    if (!userId) {
      navigate("/login");
      return;
    }

    // Pull configuration profiles securely downstream
    fetch(`/api/user-program-config/${userId}`)
      .then(res => res.json())
      .then(data => {
        if (data.config) {
          setProgramConfig(data.config);
          localStorage.setItem("activeProgramConfig", JSON.stringify(data.config));
          localStorage.setItem("program", data.config.displayTitle || data.config.programName);
          window.dispatchEvent(new Event("authChange"));
        }
      })
      .catch(console.error);

    Promise.all([
      fetch(`/api/user-status/${userId}`).then(res => res.json()),
      fetch(`/api/estimated-1rm/${userId}`).then(res => res.json()),
      fetch(`/api/recent-sessions/${userId}`).then(res => res.json()),
      fetch(`/api/rewards/${userId}`).then(res => res.json()),
      fetch('/api/daily-quote').then(res => res.json())
    ])
      .then(([statusData, estData, sessionsData, rewardsData, quoteData]) => {
        if (statusData.purchasedPrograms) setPurchasedPrograms(statusData.purchasedPrograms);
        if (statusData.subscriptionActive !== undefined) setSubscriptionActive(statusData.subscriptionActive);
        if (estData.estimates) setEstimates(estData.estimates);
        if (sessionsData.sessions) setRecentSessions(sessionsData.sessions);
        if (rewardsData) setRewards(rewardsData);
        if (quoteData && quoteData.quote) setDailyQuote(quoteData.quote);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error loading dashboard metrics:", err);
        setLoading(false);
      });

    if (isAdmin) {
      fetch("/api/leads")
        .then(res => res.json())
        .then(data => { if (data.leads) setLeads(data.leads); })
        .catch(console.error);
    }
  }, [userId, navigate, isAdmin]);

  // PWA Installation Handlers
  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBanner(true);
    };
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowInstallBanner(false);
      setDeferredPrompt(null);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    window.dispatchEvent(new Event("authChange"));
    navigate("/");
  };

  const handleAssignProgram = async (e) => {
    e.preventDefault();
    if (!assignEmail || !assignProgram) return;
    try {
      const res = await fetch("/api/admin/assign-program", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: assignEmail, programName: assignProgram })
      });
      const data = await res.json();
      setAdminMessage(res.ok ? "Program assigned successfully!" : `Error: ${data.error}`);
    } catch {
      setAdminMessage("Server communication error.");
    }
  };

  const shareProgress = async () => {
    const target = document.querySelector(".progress-share-card");
    if (!target) return;
    target.style.position = "static";
    target.style.left = "0";
    try {
      const canvas = await html2canvas(target);
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      target.style.position = "absolute";
      target.style.left = "-9999px";

      if (navigator.canShare && navigator.canShare({ files: [new File([blob], 'progress.png', { type: 'image/png' })] })) {
        await navigator.share({
          files: [new File([blob], 'progress.png', { type: 'image/png' })],
          title: 'My Apex Method Progress',
          text: 'Crushing my training blocks on Apex Method!'
        });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'apex-progress.png';
        a.click();
      }
    } catch (err) {
      console.error("Sharing failed:", err);
      target.style.position = "absolute";
      target.style.left = "-9999px";
    }
  };

  // Carousel Configuration
  const [currentCard, setCurrentCard] = useState(0);
  const cards = [
    <div key="quote" className="carousel-inner-content">
      <h4 style={{ color: "var(--accent)", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>Daily Mindset Archetype</h4>
      <p style={{ fontStyle: "italic", fontSize: "1.05rem", color: "var(--text-light)", lineHeight: "1.6" }}>"{dailyQuote || 'The platform rewards absolute precision. Commit to your warm-up tracking metrics.'}"</p>
    </div>,
    <div key="rewards" className="carousel-inner-content">
      <h4 style={{ color: "var(--accent)", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>System Milestones & Streaks</h4>
      <p style={{ fontSize: "1rem", color: "var(--text-light)" }}>🔥 Current Streak: <strong style={{ color: "var(--accent)" }}>{rewards.streak || 0} Days Balance</strong></p>
      {rewards.nextMilestone && (
        <p style={{ fontSize: "0.9rem", color: "var(--text-gray)", marginTop: "4px" }}>🎯 Next structural milestone: {rewards.nextMilestone}</p>
      )}
    </div>
  ];

  const nextCard = () => setCurrentCard(prev => Math.min(prev + 1, cards.length - 1));
  const prevCard = () => setCurrentCard(prev => Math.max(prev - 1, 0));
  const swipeHandlers = useSwipeable({ onSwipedLeft: nextCard, onSwipedRight: prevCard, preventDefaultTouchmoveEvent: true, trackMouse: true });

  if (loading) {
    return <div className="dashboard-loading"><div className="spinner">Initializing Dashboard Context...</div></div>;
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-wrapper">
        
        <header className="dashboard-header">
          <div className="dashboard-logo" onClick={() => navigate("/")}>Apex Framework</div>
          <button onClick={handleLogout} className="logout-btn">Terminate Session</button>
        </header>

        {!subscriptionActive && (
          <div style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid #ef4444", padding: "16px", borderRadius: "8px", marginBottom: "32px", fontSize: "0.95rem" }}>
            ⚠️ <strong>Subscription Status Warning:</strong> Your access plan is currently inactive. Please check your billing settings to prevent metric locking.
          </div>
        )}

        {/* Info Carousel Section */}
        <div className="carousel-container" {...swipeHandlers}>
          <div className="carousel-header">
            <span className="carousel-counter">METRIC MATRIX {currentCard + 1} / {cards.length}</span>
            <div className="carousel-nav-buttons">
              <button onClick={prevCard} disabled={currentCard === 0} className="nav-btn">◀</button>
              <button onClick={nextCard} disabled={currentCard === cards.length - 1} className="nav-btn">▶</button>
            </div>
          </div>
          <div className="carousel-card-wrapper">{cards[currentCard]}</div>
        </div>

        {/* Master Asymmetric Layout Block */}
        <main className="dashboard-grid">
          
          {/* Main Action and Analytics Column */}
          <section style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
            
            <div className="premium-card">
              <h2 className="card-title">🚀 Active Performance Systems</h2>
              {purchasedPrograms.length === 0 ? (
                <div>
                  <p style={{ color: "var(--text-gray)", marginBottom: "20px" }}>No active training block engines initialized.</p>
                  <button onClick={() => navigate("/select-program")} className="premium-btn">Configure Training Block</button>
                </div>
              ) : (
                <div style={{ display: "flex", justifyContent: "between", alignItems: "center", flexWrap: "wrap", gap: "20px" }}>
                  <div>
                    <h3 style={{ fontSize: "1.4rem", fontWeight: "700", color: "var(--accent)" }}>
                      {programConfig?.displayTitle || purchasedPrograms[0]}
                    </h3>
                    <p style={{ color: "var(--text-gray)", fontSize: "0.9rem", marginTop: "4px" }}>
                      Engine Status: Operational • {programConfig?.fatigueCap || "Fatigue Budget Active"}
                    </p>
                  </div>
                  <button onClick={() => navigate("/session")} className="premium-btn" style={{ marginLeft: "auto" }}>
                    Launch Next Session →
                  </button>
                </div>
              )}
            </div>

            <div className="premium-card">
              <h2 className="card-title">📊 Strategic Absolute Strength Profiles (1RM)</h2>
              <div className="estimates-grid">
                <div className="metric-pill">
                  <div className="metric-label">Squat Profile</div>
                  <div className="metric-value">{estimates["Squat (Top Set)"] ? `${estimates["Squat (Top Set)"]}kg` : "—"}</div>
                </div>
                <div className="metric-pill">
                  <div className="metric-label">Bench Profile</div>
                  <div className="metric-value">{estimates["Bench (Top Set)"] ? `${estimates["Bench (Top Set)"]}kg` : "—"}</div>
                </div>
                <div className="metric-pill">
                  <div className="metric-label">Deadlift Profile</div>
                  <div className="metric-value">{estimates["Deadlift (Top Set)"] ? `${estimates["Deadlift (Top Set)"]}kg` : "—"}</div>
                </div>
              </div>
              <div style={{ marginTop: "32px" }}>
                <DashboardChart userId={userId} />
              </div>
              <button onClick={shareProgress} className="logout-btn" style={{ marginTop: "24px", width: "100%", display: "block" }}>
                Export Metric Card Profile
              </button>
            </div>

            <div className="premium-card">
              <h2 className="card-title">🧠 Real-Time AI Coaching Insights</h2>
              <CoachPrompts userId={userId} />
            </div>

          </section>

          {/* Right Sidebar Column - History & Utilities */}
          <section style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
            
            <div className="premium-card">
              <h2 className="card-title">⏱️ Session Ledger History</h2>
              <ProgressLog recentSessions={recentSessions} expandedWorkout={expandedWorkout} setExpandedWorkout={setExpandedWorkout} />
            </div>

            {/* Hidden Share Card Module */}
            <div className="progress-share-card" style={{ position: 'absolute', left: '-9999px', top: 0, width: '400px', background: '#070a13', padding: '24px', borderRadius: '12px', border: '1px solid var(--accent)' }}>
              <h3 style={{ color: 'var(--accent)', fontSize: '1.2rem', marginBottom: '16px', letterSpacing: '-0.02em' }}>Apex Method Profile</h3>
              <p style={{ marginBottom: '8px', color: '#fff' }}>🔥 Dynamic Balance Streak: {rewards.streak || 0} Days</p>
              <p style={{ marginBottom: '8px', color: '#fff' }}>🏋️ Squat Absolute: {estimates["Squat (Top Set)"] || "—"} kg</p>
              <p style={{ marginBottom: '8px', color: '#fff' }}>💪 Bench Absolute: {estimates["Bench (Top Set)"] || "—"} kg</p>
              <p style={{ color: '#fff' }}>⚡ Deadlift Absolute: {estimates["Deadlift (Top Set)"] || "—"} kg</p>
            </div>

            {/* PWA Installation Drawer */}
            {showInstallBanner && (
              <div className="premium-card" style={{ borderColor: "var(--accent)" }}>
                <h3 style={{ fontSize: "1rem", fontWeight: "600", marginBottom: "8px" }}>Sync to Local Machine</h3>
                <p style={{ color: "var(--text-gray)", fontSize: "0.85rem", marginBottom: "16px" }}>Install the native Apex environment directly into your taskbar framework.</p>
                <button onClick={handleInstallClick} className="premium-btn" style={{ width: "100%", padding: "10px" }}>Install Native Engine</button>
              </div>
            )}

            {/* Control Panel (Coach Privileges) */}
            {isAdmin && (
              <div className="premium-card" style={{ borderColor: "#f59e0b" }}>
                <h2 className="card-title" style={{ color: "#f59e0b" }}>🛡️ Control Panel</h2>
                <form onSubmit={handleAssignProgram} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <input type="email" placeholder="Client email pointer" value={assignEmail} onChange={e => setAssignEmail(e.target.value)} className="premium-input" />
                  <input type="text" placeholder="Engine ID (e.g., Ares Protocol)" value={assignProgram} onChange={e => setAssignProgram(e.target.value)} className="premium-input" />
                  <button type="submit" className="premium-btn" style={{ background: "#f59e0b" }}>Force Assign System</button>
                </form>
                {adminMessage && <p style={{ fontSize: "0.85rem", marginTop: "12px", color: "#f59e0b" }}>{adminMessage}</p>}
                
                <div style={{ marginTop: "24px", paddingTop: "24px", borderTop: "1px solid var(--border-subtle)" }}>
                  <h4 style={{ fontSize: "0.9rem", marginBottom: "12px" }}>Inbound Funnel Leads ({leads.length})</h4>
                  <div style={{ maxHeight: "150px", overflowY: "auto", fontSize: "0.8rem", color: "var(--text-gray)" }}>
                    {leads.map((l, idx) => <div key={idx} style={{ padding: "4px 0" }}>• {l.email}</div>)}
                  </div>
                </div>
              </div>
            )}

          </section>
        </main>
      </div>
    </div>
  );
}