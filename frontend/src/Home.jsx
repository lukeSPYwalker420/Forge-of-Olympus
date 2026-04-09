```jsx
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
        setModalMessage("You're in. Watch this space.");
        setTimeout(() => {
          setShowModal(false);
          setEmail("");
          setModalMessage("");
        }, 2000);
      } else {
        setModalMessage("Something went wrong.");
      }
    } catch (err) {
      console.error(err);
      setModalMessage("Network error.");
    }
  };

  return (
    <>
      {/* NAV */}
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

      {/* HERO */}
      <section className="hero">
        <div className="hero-content">
          <h1>
            Train Without Guessing.<br />
            Every Weight You Lift Is Calculated.
          </h1>
          <p>
            Adaptive training systems that adjust to your performance in real time.
            No spreadsheets. No plateaus. Just progression.
          </p>

          <div className="hero-buttons">
            <button
              onClick={() =>
                document.getElementById("programs")?.scrollIntoView({ behavior: "smooth" })
              }
              className="btn btn-gold"
            >
              Get Your Program
            </button>

            <button
              onClick={() =>
                document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })
              }
              className="btn btn-outline"
            >
              See How It Works
            </button>
          </div>
        </div>
      </section>

      {/* AUTHORITY STRIP */}
      <section className="authority">
        <div className="container">
          <p>
            Most lifters don’t fail from lack of effort — they fail because their training stops adapting.
          </p>
        </div>
      </section>

      {/* PROBLEM */}
      <section className="problem">
        <div className="container">
          <h2>Why Your Training Stops Working</h2>
          <ul>
            <li>You guess when to increase weight</li>
            <li>You repeat the same sessions with no progression</li>
            <li>You don’t know if you're pushing hard enough</li>
            <li>Your program doesn’t adapt when you do</li>
          </ul>
          <p className="problem-summary">
            Progress stalls — not because you’ve peaked, but because your system has.
          </p>
        </div>
      </section>

      {/* SOLUTION */}
      <section className="solution">
        <div className="container">
          <h2>This Isn’t a Program. It’s a System.</h2>
          <p>
            Every set you log feeds into the engine. Your next session is calculated automatically.
          </p>

          <div className="solution-grid">
            <div>Tracks RPE, RIR, reps & performance</div>
            <div>Calculates strength in real time</div>
            <div>Adjusts loads automatically</div>
            <div>Builds progression from your data</div>
          </div>

          <p className="solution-highlight">
            You don’t guess. The system decides.
          </p>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="how-it-works" id="how-it-works">
        <div className="container">
          <h2>How It Works</h2>

          <div className="steps-grid">
            <div>
              <h3>1. Choose Your System</h3>
              <p>Strength, hypertrophy, performance, or longevity.</p>
            </div>
            <div>
              <h3>2. Log Your Training</h3>
              <p>Enter sets, reps, and effort in seconds.</p>
            </div>
            <div>
              <h3>3. The Engine Adapts</h3>
              <p>Your next session updates automatically.</p>
            </div>
            <div>
              <h3>4. Progress Becomes Inevitable</h3>
              <p>No guesswork. No stalls.</p>
            </div>
          </div>
        </div>
      </section>

      {/* DIFFERENTIATOR */}
      <section className="difference">
        <div className="container">
          <h2>Coaching Logic — Built Into the App</h2>
          <p>
            Most apps give you templates. Forge gives you decision-making.
          </p>
          <p className="difference-highlight">
            This is autoregulated training — without the complexity.
          </p>
        </div>
      </section>

      {/* PROGRAMS */}
      <section className="programs" id="programs">
        <div className="container">
          <h2>Choose Your System</h2>

          <div className="program-grid">
            {programs.map((p) => (
              <div key={p.title} className="program-card">
                <div className="program-header">
                  <h3>{p.title}</h3>
                </div>

                <p className="program-description">{p.description}</p>

                <div className="program-buttons">
                  <a href={p.oneTimeLink} className="btn-plan">
                    Get Plan + Engine – £19.99
                  </a>
                  <a href={p.coachingLink} className="btn-coaching">
                    Coaching – £169.99/mo
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="final-cta">
        <div className="container">
          <h2>Stop Guessing Your Training</h2>
          <p>Start progressing with a system that adapts to you.</p>
          <button
            onClick={() =>
              document.getElementById("programs")?.scrollIntoView({ behavior: "smooth" })
            }
            className="btn btn-gold"
          >
            Get Started
          </button>
        </div>
      </section>

      {/* MODAL */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Join the Forge</h3>
            <p>Get early access, insights, and exclusive offers.</p>

            <form onSubmit={handleEmailSubmit}>
              <input
                type="email"
                placeholder="Your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <button type="submit">Join</button>
            </form>

            {modalMessage && <p>{modalMessage}</p>}

            <button onClick={() => setShowModal(false)}>×</button>
          </div>
        </div>
      )}
    </>
  );
}

/* PROGRAM DATA */
const programs = [
  {
    title: "Ares Protocol",
    description: "Maximal strength. Heavy lifts. Relentless progression.",
    oneTimeLink: "https://buy.stripe.com/bJe5kD3Gec8pchc6mV4sE0p",
    coachingLink: "https://buy.stripe.com/14A28r1y63BT6WS6mV4sE0k"
  },
  {
    title: "Apollo Physique",
    description: "Build size, symmetry, and aesthetic dominance.",
    oneTimeLink: "https://buy.stripe.com/aFa9ATekSegx1CydPn4sE0q",
    coachingLink: "https://buy.stripe.com/8x25kD0u2fkBa947qZ4sE0i"
  },
  {
    title: "Hephaestus Framework",
    description: "Fix weaknesses. Improve movement. Train pain-free.",
    oneTimeLink: "https://buy.stripe.com/eVqbJ12CafkB4OKh1z4sE0s",
    coachingLink: "https://buy.stripe.com/6oU8wPa4CfkB1Cy7qZ4sE0g"
  },
  {
    title: "Hercules Foundation",
    description: "Strength, conditioning, and real-world performance.",
    oneTimeLink: "https://buy.stripe.com/28E00jfoW8Wd1Cy6mV4sE0r",
    coachingLink: "https://buy.stripe.com/4gMdR9a4C5K1fto8v34sE0f"
  }
];
```