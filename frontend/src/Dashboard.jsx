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

  // Admin state (restored original admin detection)
  const [assignEmail, setAssignEmail] = useState("");
  const [assignProgram, setAssignProgram] = useState("");
  const [adminMessage, setAdminMessage] = useState("");
  const [leads, setLeads] = useState([]);

  const ADMIN_EMAIL = "kieren2203@googlemail.com";
  const isAdmin = userEmail === ADMIN_EMAIL;

  useEffect(() => {
    if (!userId) {
      navigate("/login");
      return;
    }

    // Fetch program configuration (from backend)
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

    // Fetch all dashboard data in parallel
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
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error("Sharing failed:", err);
      target.style.position = "absolute";
      target.style.left = "-9999px";
    }
  };

  // Carousel Configuration (polished)
  const [currentCard, setCurrentCard] = useState(0);
  const cards = [
    <div key="quote" className="carousel-inner-content">
      <h4 style={{ color: "var(--accent)", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>Daily Mindset</h4>
      <p style={{ fontStyle: "italic", fontSize: "1.05rem", color: "var(--text-light)", lineHeight: "1.6" }}>“{dailyQuote || 'The platform rewards absolute precision. Commit to your warm-up tracking metrics.'}”</p>
    </div>,
    <div key="rewards" className="carousel-inner-content">
      <h4 style={{ color: "var(--accent)", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>System Milestones</h4>
      <p style={{ fontSize: "1rem", color: "var(--text-light)" }}>🔥 Current Streak: <strong style={{ color: "var(--accent)" }}>{rewards.streak || 0} days</strong></p>
      {rewards.nextMilestone && (
        <p style={{ fontSize: "0.9rem", color: "var(--text-gray)", marginTop: "4px" }}>🎯 Next milestone: {rewards.nextMilestone}</p>
      )}
    </div>
  ];

  const nextCard = () => setCurrentCard(prev => Math.min(prev + 1, cards.length - 1));
  const prevCard = () => setCurrentCard(prev => Math.max(prev - 1, 0));
  const swipeHandlers = useSwipeable({ onSwipedLeft: nextCard, onSwipedRight: prevCard, preventDefaultTouchmoveEvent: true, trackMouse: true });

  if (loading) {
    return <div className="dashboard-loading"><div className="spinner">Loading dashboard...</div></div>;
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-wrapper">
        
        <header className="dashboard-header">
          <div className="dashboard-logo" onClick={() => navigate("/")}>APEX METHOD</div>
          <button onClick={handleLogout} className="logout-btn">Logout</button>
        </header>

        {!subscriptionActive && (
          <div style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid #ef4444", padding: "16px", borderRadius: "8px", marginBottom: "32px", fontSize: "0.95rem" }}>
            ⚠️ <strong>Subscription inactive</strong> – weight recommendations are hidden. <a href="/" style={{ color: "var(--accent)" }}>Resubscribe</a> to unlock full guidance.
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

        {/* Main Layout */}
        <main className="dashboard-grid">
          
          {/* Left Column */}
          <section style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
            
            <div className="premium-card">
              <h2 className="card-title">🚀 Active Training System</h2>
              {purchasedPrograms.length === 0 ? (
                <div>
                  <p style={{ color: "var(--text-gray)", marginBottom: "20px" }}>No active program found.</p>
                  <button onClick={() => navigate("/select-program")} className="premium-btn">Configure Program →</button>
                </div>
              ) : (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "20px" }}>
                  <div>
                    <h3 style={{ fontSize: "1.4rem", fontWeight: "700", color: "var(--accent)" }}>
                      {programConfig?.displayTitle || purchasedPrograms[0]}
                    </h3>
                    <p style={{ color: "var(--text-gray)", fontSize: "0.9rem", marginTop: "4px" }}>
                      {programConfig?.frequency && `📅 ${programConfig.frequency} days/week`}
                      {programConfig?.focus && ` • 🎯 Focus: ${programConfig.focus.replace('_', ' ').toUpperCase()}`}
                      {!programConfig && "Fatigue budget active"}
                    </p>
                  </div>
                  <button onClick={() => navigate("/session")} className="premium-btn" style={{ marginLeft: "auto" }}>
                    Start Workout →
                  </button>
                </div>
              )}
            </div>

            <div className="premium-card">
              <h2 className="card-title">📊 Estimated 1RM</h2>
              <div className="estimates-grid">
                <div className="metric-pill">
                  <div className="metric-label">Squat</div>
                  <div className="metric-value">{estimates["Squat (Top Set)"] ? `${estimates["Squat (Top Set)"]} kg` : "—"}</div>
                </div>
                <div className="metric-pill">
                  <div className="metric-label">Bench</div>
                  <div className="metric-value">{estimates["Bench (Top Set)"] ? `${estimates["Bench (Top Set)"]} kg` : "—"}</div>
                </div>
                <div className="metric-pill">
                  <div className="metric-label">Deadlift</div>
                  <div className="metric-value">{estimates["Deadlift (Top Set)"] ? `${estimates["Deadlift (Top Set)"]} kg` : "—"}</div>
                </div>
              </div>
              <div style={{ marginTop: "32px" }}>
                <DashboardChart userId={userId} />
              </div>
              <button onClick={shareProgress} className="logout-btn" style={{ marginTop: "24px", width: "100%" }}>
                Export Progress Card
              </button>
            </div>

            <div className="premium-card">
              <h2 className="card-title">🧠 AI Coaching Insights</h2>
              <CoachPrompts userId={userId} />
            </div>

          </section>

          {/* Right Column */}
          <section style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
            
            <div className="premium-card">
              <h2 className="card-title">⏱️ Recent Sessions</h2>
              <ProgressLog recentSessions={recentSessions} expandedWorkout={expandedWorkout} setExpandedWorkout={setExpandedWorkout} />
            </div>

            {/* Hidden share card */}
            <div className="progress-share-card" style={{ position: 'absolute', left: '-9999px', top: 0, width: '400px', background: '#070a13', padding: '24px', borderRadius: '12px', border: '1px solid var(--accent)' }}>
              <h3 style={{ color: 'var(--accent)', fontSize: '1.2rem', marginBottom: '16px' }}>Apex Method Progress</h3>
              <p style={{ marginBottom: '8px', color: '#fff' }}>🔥 Streak: {rewards.streak || 0} days</p>
              <p style={{ marginBottom: '8px', color: '#fff' }}>🏋️ Squat 1RM: {estimates["Squat (Top Set)"] || "—"} kg</p>
              <p style={{ marginBottom: '8px', color: '#fff' }}>💪 Bench 1RM: {estimates["Bench (Top Set)"] || "—"} kg</p>
              <p style={{ color: '#fff' }}>⚡ Deadlift 1RM: {estimates["Deadlift (Top Set)"] || "—"} kg</p>
            </div>

            {/* PWA Install Banner */}
            {showInstallBanner && (
              <div className="premium-card" style={{ borderColor: "var(--accent)" }}>
                <h3 style={{ fontSize: "1rem", fontWeight: "600", marginBottom: "8px" }}>Install as App</h3>
                <p style={{ color: "var(--text-gray)", fontSize: "0.85rem", marginBottom: "16px" }}>Add Apex Method to your home screen for faster access.</p>
                <button onClick={handleInstallClick} className="premium-btn" style={{ width: "100%", padding: "10px" }}>Install</button>
              </div>
            )}

            {/* Admin Panel (restored original admin detection) */}
            {isAdmin && (
              <div className="premium-card" style={{ borderColor: "#f59e0b" }}>
                <h2 className="card-title" style={{ color: "#f59e0b" }}>🔧 Admin Panel</h2>
                <form onSubmit={handleAssignProgram} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <input type="email" placeholder="User email" value={assignEmail} onChange={e => setAssignEmail(e.target.value)} className="premium-input" />
                  <input type="text" placeholder="Program name (e.g., Ares Protocol)" value={assignProgram} onChange={e => setAssignProgram(e.target.value)} className="premium-input" />
                  <button type="submit" className="premium-btn" style={{ background: "#f59e0b" }}>Assign Program</button>
                </form>
                {adminMessage && <p style={{ fontSize: "0.85rem", marginTop: "12px", color: "#f59e0b" }}>{adminMessage}</p>}
                
                <div style={{ marginTop: "24px", paddingTop: "24px", borderTop: "1px solid var(--border-subtle)" }}>
                  <h4 style={{ fontSize: "0.9rem", marginBottom: "12px" }}>Captured Leads ({leads.length})</h4>
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