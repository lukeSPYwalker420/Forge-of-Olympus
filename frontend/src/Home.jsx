import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Home.css";

export default function Home() {
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [email, setEmail] = useState("");
  const [modalMessage, setModalMessage] = useState("");

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
  } catch (err) {
    console.error(err);
    setModalMessage("Network error. Please try again.");
  }
};

const handleSubscribe = async (programName) => {
  // Get user email (if logged in)
  const email = localStorage.getItem("userEmail") || "";
  if (!email) {
    // If not logged in, ask for email first
    const userEmail = prompt("Enter your email to start your free trial:");
    if (!userEmail) return;
    localStorage.setItem("userEmail", userEmail);
  }

  try {
    const response = await fetch("/api/create-checkout-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        programName, 
        email: localStorage.getItem("userEmail") 
      })
    });
    const { url } = await response.json();
    window.location.href = url; // eslint-disable-line react-hooks/immutability
  } catch (err) {
    console.error(err);
    alert("Something went wrong. Please try again.");
  }
};

const handleCoaching = (programName) => {
  // For coaching, you can either:
  // Option 1: Keep the old Stripe link (no free trial needed)
  const program = programs.find(p => p.title === programName);
  if (program && program.coachingLink) {
    window.location.href = program.coachingLink;
  }
};

  return (
    <>
      <nav className="navbar">
        <div className="nav-container">
          <span className="logo">FORGE OF OLYMPUS</span>
          <div className="nav-links">
            <button onClick={() => navigate("/login")} className="nav-btn">
              Login
            </button>
            <button onClick={handleRegister} className="nav-btn primary">
              Register
            </button>
          </div>
        </div>
      </nav>

      <section className="hero">
        <div className="hero-content">
          <h1>Train Without Guessing. Every Weight You Lift Is Calculated.</h1>
<p>
  Adaptive training systems that adjust to your performance in real time.
  No spreadsheets. No plateaus. Just progression.
</p>
<section className="authority">
  <div className="container">
    <p>
      Most lifters don’t fail from lack of effort — they fail because their training stops adapting.
    </p>
  </div>
</section>
          <div className="hero-buttons">
            <button
              onClick={() =>
                document
                  .getElementById("programs")
                  ?.scrollIntoView({ behavior: "smooth" })
              }
              className="btn btn-gold"
            >
              Explore Programs
            </button>
            <button
  onClick={() =>
    document
      .getElementById("how-it-works")
      ?.scrollIntoView({ behavior: "smooth" })
  }
  className="btn btn-outline"
>
  How It Works
</button>
          </div>
        </div>
      </section>

      {/* ========== HOW IT WORKS (app & dashboard focused) ========== */}
      <section className="how-it-works" id="how-it-works">
        <div className="container">
          <h2>How It Works</h2>
          <div className="steps-grid">
            <div className="step">
              <div className="step-number">1</div>
              <h3>Choose Your Plan</h3>
              <p>
                Buy any program (Ares, Apollo, Hercules, etc.) – one‑time £19.99.
                You get the complete exercise library, sets, reps, and RIR targets
                delivered to your dashboard instantly.
              </p>
            </div>
            <div className="step">
              <div className="step-number">2</div>
              <h3>Your Dashboard</h3>
              <p>
                See your weekly schedule, upcoming workouts, estimated 1RMs,
                volume trends, and recovery status. The engine pre-loads your next
                session based on your last performance.
              </p>
            </div>
            <div className="step">
              <div className="step-number">3</div>
              <h3>3. Log & Adapt</h3>
              <p>
                Enter your sets, reps, and effort. The system automatically adjusts your next session.
              </p>
            </div>
            <div className="step">
              <div className="step-number">4</div>
              <h3>4. Progress Becomes Inevitable</h3>
              <p>
                No guesswork. No stalls. Every session builds on the last.
              </p>
            </div>
          </div>
          <div className="coaching-note">
            <p>
              ⚡ <strong>What makes us different?</strong> Most apps just give you
              templates. Forge of Olympus gives you{" "}
              <strong>my coaching brain in code</strong> – adaptive periodisation
              that learns from your performance. Upgrade to live coaching for form
              reviews, video calls, and direct access.
            </p>
          </div>
        </div>
      </section>

      <section className="difference">
  <div className="container">
    <h2>Coaching Logic — Built Into the App</h2>
    <p>
      Most apps give you templates. Forge of Olympus gives you decision-making.
    </p>
    <p>
      The same logic a coach uses to adjust your training — now automated.
    </p>
  </div>
</section>

      <section className="programs" id="programs">
        <div className="container">
          <h2>Premium Programs</h2>
          <div className="program-grid">
            {programs.map((p) => (
              <div key={p.title} className="program-card">
                <div
                  className="program-header"
                  style={{
                    backgroundImage: `url(${p.image})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    backgroundColor: "#1a1a2e",
                  }}
                >
                  <h3>{p.title}</h3>
                </div>
                <ul className="program-features">
                  {p.features.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
                <button 
                  onClick={() => handleSubscribe(p.title)} 
                  className="btn-plan"
                >
                  Start Free Trial – £19.99/mo after 30 days
                </button>
                <button 
                  onClick={() => handleCoaching(p.title)} 
                  className="btn-coaching"
                >
                  Get Plan + Coaching – £169.99/mo
                </button>
              </div>
            ))}
          </div>
          <div className="engine-cta">
            <p>
              Already own a plan?{" "}
              <a href="/subscribe" className="engine-link">
                Subscribe to Engine – £19.99/month
              </a>
            </p>
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
              <input
                type="email"
                placeholder="Your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <button type="submit">Sign Up</button>
            </form>
            {modalMessage && <p className="modal-message">{modalMessage}</p>}
            <button
              className="modal-close"
              onClick={() => setShowModal(false)}
            >
              ×
            </button>
          </div>
        </div>
      )}
    </>
  );
}

/* PROGRAM DATA with new links */
const programs = [
  {
    title: "Ares Protocol",
    image: "/Ares Protocol.jpg",
    oneTimeLink: "https://buy.stripe.com/bJe5kD3Gec8pchc6mV4sE0p",
    coachingLink: "https://buy.stripe.com/14A28r1y63BT6WS6mV4sE0k",
    features: [
  "Maximal strength progression system",
  "Adaptive overload based on performance",
  "Peak strength development",
  "Built for serious lifters"
]
  },
  {
    title: "Apollo Physique",
    image: "/Apollo Physique.jpg",
    oneTimeLink: "https://buy.stripe.com/aFa9ATekSegx1CydPn4sE0q",
    coachingLink: "https://buy.stripe.com/8x25kD0u2fkBa947qZ4sE0i",
    features: [
      "Bodybuilding symmetry focus",
      "Muscle definition protocols",
      "Proportion optimisation",
      "Classic physique development",
    ],
  },
  {
    title: "Hephaestus Framework",
    image: "/Hephaestus Framework.jpg",
    oneTimeLink: "https://buy.stripe.com/eVqbJ12CafkB4OKh1z4sE0s",
    coachingLink: "https://buy.stripe.com/6oU8wPa4CfkB1Cy7qZ4sE0g",
    features: [
      "Injury prevention protocols",
      "Joint health optimisation",
      "Recovery enhancement",
      "Longevity-focused training",
    ],
  },
  {
    title: "Hercules Foundation",
    image: "/Hercules Foundation.jpg",
    oneTimeLink: "https://buy.stripe.com/28E00jfoW8Wd1Cy6mV4sE0r",
    coachingLink: "https://buy.stripe.com/4gMdR9a4C5K1fto8v34sE0f",
    features: [
      "Balanced strength & conditioning",
      "Power development for everyday athletes",
      "Mobility & injury prevention",
      "Perfect for beginners & intermediates",
      "5‑week wave blocks with deload",
    ],
  },
];