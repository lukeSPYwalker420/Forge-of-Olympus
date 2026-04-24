import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Home.css";
/* global gtag */

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
        setModalMessage("Thanks! You're on the list. We'll be in touch.");
        setTimeout(() => {
          setShowModal(false);
          setEmail("");
          setModalMessage("");
        }, 2000);
      } else {
        setModalMessage("Something went wrong. Please try again.");
      }
      if (response.ok) {
  await fetch("/api/send-cheatsheet", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email })
  });
  setModalMessage("Thanks! Check your email for the RPE cheat sheet and free trial link.");
}
    } catch (err) {
      console.error(err);
      setModalMessage("Network error. Please try again.");
    }
  };

  const handleSubscribe = async (programName) => {
  try {
    let email = localStorage.getItem("userEmail");
    
    // If no email stored, ask for it AND create account
    if (!email) {
      email = prompt("Enter your email to start your free trial:");
      if (!email || !email.includes("@")) {
        alert("Please enter a valid email address");
        return;
      }
      
      // Create/verify user account BEFORE checkout
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
      body: JSON.stringify({ 
        programName, 
        email: email
      })
    });
    
    const data = await response.json();

    // Inside handleSubscribe, after getting the session URL but before redirect:
if (window.gtag) {
  gtag('event', 'conversion', { 'send_to': 'AW-XXXXXXXX/XXXXXXX' });
}
window.location.href = data.url;
    
    if (!response.ok) {
      throw new Error(data.error || "Checkout failed");
    }
    
    if (data.url) {
      window.location.href = data.url;
    } else {
      throw new Error("No checkout URL returned");
    }
  } catch (err) {
    console.error("Checkout error:", err);
    alert(`Error: ${err.message}. Please try again or contact support.`);
  }
};

  const handleCoaching = (programName) => {
    const program = programs.find(p => p.title === programName);
    if (program && program.coachingLink) {
      window.location.href = program.coachingLink;
    }
  };

  return (
    <>
      <nav className="navbar">
        <div className="nav-container">
          <span className="logo" onClick={() => navigate("/")} style={{ cursor: "pointer" }}>
            FORGE OF OLYMPUS
          </span>
          <div className="nav-links">
            {userId ? (
            <button onClick={() => navigate("/dashboard")} className="nav-btn primary">Your Training System</button>
          ) : (
            <button onClick={() => navigate("/login")} className="nav-btn">Get Access</button>
          )}
            <button onClick={handleRegister} className="nav-btn primary">Join the Forge</button>
          </div>
        </div>
      </nav>

      <section className="hero">
        <div className="hero-content">
          <h1>Stop Guessing Your Working Weights.<br />Your Program Adjusts When You Do.</h1>
          <p>Adaptive periodisation that learns from every rep. No spreadsheets. No plateaus.</p>
          <div className="hero-buttons">
            <button onClick={() => document.getElementById("programs")?.scrollIntoView({ behavior: "smooth" })} className="btn btn-gold">
              Explore Programs
            </button>
            <button onClick={() => document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })} className="btn btn-outline">
              How It Works
            </button>
          </div>
        </div>
      </section>

      {/* Rest of your sections remain the same... */}
      <section className="how-it-works" id="how-it-works">
        <div className="container">
          <h2>How It Works</h2>
          <div className="steps-grid">
            <div className="step">
              <div className="step-number">1</div>
              <h3>Choose Your Plan</h3>
              <p>Subscribe to any program – first month free. You get the complete exercise library, sets, reps, and targets delivered to your dashboard instantly.</p>
            </div>
            <div className="step">
              <div className="step-number">2</div>
              <h3>Your Dashboard</h3>
              <p>See your weekly schedule, upcoming workouts, estimated 1RMs, and recovery status. The engine pre-loads your next session based on your last performance.</p>
            </div>
            <div className="step">
              <div className="step-number">3</div>
              <h3>Log & Adapt</h3>
              <p>Enter your sets, reps, and effort. The system automatically adjusts your next session.</p>
            </div>
            <div className="step">
              <div className="step-number">4</div>
              <h3>Progress Becomes Inevitable</h3>
              <p>No guesswork. No stalls. Every session builds on the last.</p>
            </div>
          </div>
          <div className="coaching-note">
            <p>⚡ <strong>What makes us different?</strong> Most apps just give you templates. Forge of Olympus gives you <strong>my coaching brain in code</strong> – adaptive periodisation that learns from your performance. Upgrade to live coaching for form reviews, video calls, and direct access.</p>
          </div>
        </div>
      </section>

      <section className="programs" id="programs">
        <div className="container">
          <h2>Premium Programs</h2>
          <div className="program-grid">
            {programs.map((p) => (
              <div key={p.title} className="program-card">
                <div className="program-header" style={{ backgroundImage: `url(${p.image})` }}>
                  <h3>{p.title}</h3>
                </div>
                <ul className="program-features">
                  {p.features.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
                <div className="program-buttons">
                  <button onClick={(e) => { e.preventDefault(); handleSubscribe(p.title); }} className="btn-plan">
                    Start Free Trial – £19.99/mo after 30 days
                  </button>
                  <button onClick={() => handleCoaching(p.title)} className="btn-coaching">
                    Get Plan + Coaching – £169.99/mo
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Registration Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Join the Forge</h3>
            <p>Get early access, training tips, and exclusive offers.</p>
            <form onSubmit={handleEmailSubmit}>
              <input type="email" placeholder="Your email address" value={email} onChange={(e) => setEmail(e.target.value)} required />
              <button type="submit">Sign Up</button>
            </form>
            {modalMessage && <p className="modal-message">{modalMessage}</p>}
            <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
          </div>
        </div>
      )}
    </>
  );
}

const programs = [
  {
    title: "Ares Protocol",
    image: "/Ares Protocol.jpg",
    coachingLink: "https://buy.stripe.com/14A28r1y63BT6WS6mV4sE0k",
    features: ["No more RPE math", "Auto‑calculated top sets", "Never stall from bad load selection again", "Peak strength development", "Built for serious lifters"]
  },
  {
    title: "Apollo Physique",
    image: "/Apollo Physique.jpg",
    coachingLink: "https://buy.stripe.com/8x25kD0u2fkBa947qZ4sE0i",
    features: ["Bodybuilding symmetry focus", "Muscle definition protocols", "Proportion optimisation", "Classic physique development"]
  },
  {
    title: "Hephaestus Framework",
    image: "/Hephaestus Framework.jpg",
    coachingLink: "https://buy.stripe.com/6oU8wPa4CfkB1Cy7qZ4sE0g",
    features: ["Injury prevention protocols", "Joint health optimisation", "Recovery enhancement", "Longevity-focused training"]
  },
  {
    title: "Hercules Foundation",
    image: "/Hercules Foundation.jpg",
    coachingLink: "https://buy.stripe.com/4gMdR9a4C5K1fto8v34sE0f",
    features: ["Balanced strength & conditioning", "Power development for everyday athletes", "Mobility & injury prevention", "5‑week wave blocks with deload"]
  }
];