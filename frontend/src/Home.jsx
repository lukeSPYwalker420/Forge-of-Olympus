import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Home.css";

export default function Home() {
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [email, setEmail] = useState("");
  const [modalMessage, setModalMessage] = useState("");
  const userId = localStorage.getItem("userId");

  const handleRegister = () => {
    setShowModal(true);
    setModalMessage("");
    setEmail("");
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      setModalMessage("Please enter a valid email address.");
      return;
    }
    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "register_modal" })
      });
      if (response.ok) {
        await fetch("/api/send-cheatsheet", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email })
        });
        setModalMessage("Check your email for the RPE guide and free trial link.");
        setTimeout(() => {
          setShowModal(false);
          setEmail("");
          setModalMessage("");
        }, 3000);
      } else {
        setModalMessage("Something went wrong. Please try again.");
      }
    } catch (err) {
      console.error(err);
      setModalMessage("Network error. Please try again.");
    }
  };

  const handleSubscribe = async (programName) => {
    try {
      let email = localStorage.getItem("userEmail");
      if (!email) {
        email = prompt("Enter your email to start your 30‑day free trial:");
        if (!email || !email.includes("@")) {
          alert("Please enter a valid email address");
          return;
        }
        const loginRes = await fetch("/api/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email })
        });
        const userData = await loginRes.json();
        if (loginRes.ok) {
          localStorage.setItem("userId", userData.userId);
          localStorage.setItem("userEmail", userData.email);
          localStorage.setItem("purchasedPrograms", JSON.stringify(userData.purchasedPrograms));
        } else {
          alert("Error creating account. Please try again.");
          return;
        }
      }
      const response = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ programName, email })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Checkout failed");
      if (data.url) window.location.href = data.url;
      else throw new Error("No checkout URL returned");
    } catch (err) {
      console.error("Checkout error:", err);
      alert(`Error: ${err.message}. Please try again or contact support.`);
    }
  };

  const handleCoaching = (programName) => {
    const program = programs.find(p => p.originalTitle === programName);
    if (program && program.coachingLink) window.location.href = program.coachingLink;
  };

  return (
    <>
      <nav className="navbar">
        <div className="nav-container">
          <span className="logo" onClick={() => navigate("/")}>
            APEX METHOD
          </span>
          <div className="nav-links">
            {userId ? (
              <button onClick={() => navigate("/dashboard")} className="nav-btn primary">Dashboard</button>
            ) : (
              <button onClick={() => navigate("/login")} className="nav-btn">Login</button>
            )}
            <button onClick={handleRegister} className="nav-btn outline">Free RPE Guide</button>
          </div>
        </div>
      </nav>

      <section className="hero">
        <div className="hero-shapes">
          <div className="shape barbell"></div>
          <div className="shape plate plate-1"></div>
          <div className="shape plate plate-2"></div>
          <div className="shape plate plate-3"></div>
        </div>
        <div className="hero-content">
          <h1>Stop guessing your progression</h1>
          <p className="hero-sub">Apex Method adapts your training based on performance, fatigue, and real‑time feedback. No static spreadsheets.</p>
          <div className="hero-buttons">
            <button onClick={() => document.getElementById("programs")?.scrollIntoView({ behavior: "smooth" })} className="btn btn-primary">
              Explore Programs
            </button>
            <button onClick={() => document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })} className="btn btn-outline">
              How It Works
            </button>
          </div>
          <p className="hero-trust">✓ 30‑day free trial · Cancel anytime</p>
        </div>
      </section>

      <section className="how-it-works" id="how-it-works">
        <div className="container">
          <h2>How it works</h2>
          <div className="steps-grid">
            <div className="step">
              <div className="step-number">1</div>
              <h3>Choose your focus</h3>
              <p>Strength, hypertrophy, or balanced performance. Pick the system that matches your goal.</p>
            </div>
            <div className="step">
              <div className="step-number">2</div>
              <h3>Log your sets</h3>
              <p>Enter weight, reps, and effort (RPE/RIR). That's it – the app handles the rest.</p>
            </div>
            <div className="step">
              <div className="step-number">3</div>
              <h3>Adaptive progression</h3>
              <p>Your estimated 1RM updates automatically. Next session’s weights are calculated for you.</p>
            </div>
          </div>
          <div className="example-box">
            <p><strong>Example:</strong> You squat 100kg for 8 reps at RPE 7. The system estimates your 1RM as 130kg. Next week, it recommends 105kg. You log 105kg for 8 reps at RPE 8 – the engine updates again. No guessing, no stall.</p>
          </div>
        </div>
      </section>

      <section className="comparison">
        <div className="container">
          <h2>Static spreadsheets vs. Apex Method</h2>
          <div className="comparison-grid">
            <div className="comparison-col">
              <h3>📄 Static Plans</h3>
              <ul>
                <li>❌ Fixed percentages – ignore your actual performance</li>
                <li>❌ No adaptation – you stall for weeks</li>
                <li>❌ You have to do all the math</li>
                <li>❌ No recovery management</li>
              </ul>
            </div>
            <div className="comparison-col highlight">
              <h3>⚡ Apex Method</h3>
              <ul>
                <li>✅ Auto‑adjusts weights based on logged RPE/RIR</li>
                <li>✅ Never stall – always optimal load</li>
                <li>✅ All calculations are automatic</li>
                <li>✅ Fatigue budget prevents overtraining</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="programs" id="programs">
        <div className="container">
          <h2>Training systems</h2>
          <div className="program-grid">
            {programs.map((p) => (
              <div key={p.originalTitle} className="program-card">
                <div className="program-header">
                  <div className="program-badge">{p.goal}</div>
                  <h3>{p.title}</h3>
                </div>
                <ul className="program-features">
                  {p.features.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
                <div className="program-buttons">
                  <button onClick={() => handleSubscribe(p.originalTitle)} className="btn-plan">
                    Start free 30‑day trial<br />
                    <span className="small">£19.99/month after trial, cancel anytime</span>
                  </button>
                  <button onClick={() => handleCoaching(p.originalTitle)} className="btn-coaching">
                    Add live coaching · £169.99/month
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="final-cta">
        <div className="container">
          <h2>Train with a system that adapts</h2>
          <p>Built for lifters who take progression seriously.</p>
          <button onClick={() => document.getElementById("programs")?.scrollIntoView({ behavior: "smooth" })} className="btn btn-primary btn-large">
            Choose your system →
          </button>
        </div>
      </section>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Free RPE cheat sheet</h3>
            <p>Learn to rate effort accurately – plus get a 30‑day trial link sent to your inbox.</p>
            <form onSubmit={handleEmailSubmit}>
              <input type="email" placeholder="Your email address" value={email} onChange={(e) => setEmail(e.target.value)} required />
              <button type="submit">Send me the guide</button>
            </form>
            {modalMessage && <p className="modal-message">{modalMessage}</p>}
            <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
          </div>
        </div>
      )}
    </>
  );
}

// Programs renamed – no Greek gods, no images.
const programs = [
  {
    originalTitle: "Ares Protocol",
    title: "Apex Strength",
    goal: "⚡ Strength Peaking",
    coachingLink: "https://buy.stripe.com/14A28r1y63BT6WS6mV4sE0k",
    features: ["Auto‑calculated top sets", "RPE‑based intensity management", "Designed for powerlifting & strength athletes", "Weekly wave progression"]
  },
  {
    originalTitle: "Apollo Physique",
    title: "Apex Hypertrophy",
    goal: "💪 Muscle Development",
    coachingLink: "https://buy.stripe.com/8x25kD0u2fkBa947qZ4sE0i",
    features: ["Volume‑focused schemes", "Symmetry and proportion emphasis", "Muscle group prioritisation", "Long‑term muscle development"]
  },
  {
    originalTitle: "Hephaestus Framework",
    title: "Apex Foundation",
    goal: "🛡️ Joint Health & Longevity",
    coachingLink: "https://buy.stripe.com/6oU8wPa4CfkB1Cy7qZ4sE0g",
    features: ["Injury prevention protocols", "ROM & stability tracking", "Pain‑managed progression", "Designed for long‑term athleticism"]
  },
  {
    originalTitle: "Hercules Foundation",
    title: "Apex Performance",
    goal: "🏋️ General Fitness & Power",
    coachingLink: "https://buy.stripe.com/4gMdR9a4C5K1fto8v34sE0f",
    features: ["Balanced strength & conditioning", "Power development for sports", "Mobility & work capacity", "5‑week wave blocks with deload"]
  }
];