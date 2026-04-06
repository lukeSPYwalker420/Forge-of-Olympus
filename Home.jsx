import { useNavigate } from "react-router-dom";
import "./Home.css";

export default function Home() {
  const navigate = useNavigate();

  return (
    <>
      <nav className="navbar">
        <div className="nav-container">
          <span className="logo">FORGE OF OLYMPUS</span>
          <div className="nav-links">
            <button onClick={() => navigate("/login")} className="nav-btn">Login</button>
            <button onClick={() => document.getElementById("programs")?.scrollIntoView({ behavior: "smooth" })} className="nav-btn primary">Programs</button>
          </div>
        </div>
      </nav>

      <section className="hero">
        <div className="hero-content">
          <h1>Build Strength, Power & Aesthetic Dominance</h1>
          <p>Elite‑level training systems for serious lifters</p>
          <div className="hero-buttons">
            <button onClick={() => document.getElementById("programs")?.scrollIntoView({ behavior: "smooth" })} className="btn btn-gold">Explore Programs</button>
            <button onClick={() => navigate("/login")} className="btn btn-outline">Start Free Trial</button>
          </div>
        </div>
      </section>

      {/* ========== HOW IT WORKS (combined app + coaching) ========== */}
      <section className="how-it-works">
        <div className="container">
          <h2>How It Works</h2>
          <div className="steps-grid">
            <div className="step">
              <div className="step-number">1</div>
              <h3>Buy a Plan</h3>
              <p>Choose your program (Ares, Apollo, Hercules, etc.) – one‑time £19.99. You own the exercises, sets, reps, and RIR targets forever.</p>
            </div>
            <div className="step">
              <div className="step-number">2</div>
              <h3>Get Adaptive Engine</h3>
              <p>First month free. Then £19.99/month. The app auto‑regulates your progression: RPE/RIR, wave blocks, 1RM updates, deloads – no guesswork.</p>
            </div>
            <div className="step">
              <div className="step-number">3</div>
              <h3>Track & Improve</h3>
              <p>Log your sets, watch your estimated 1RM climb, see rep ranges expand, and let the engine adjust your future workouts.</p>
            </div>
            <div className="step">
              <div className="step-number">4</div>
              <h3>Add Coaching (Optional)</h3>
              <p>Upgrade to £169.99/month total. You get everything above plus personalised form reviews, video calls, and direct access to me – the same coaching I give my in‑person clients.</p>
            </div>
          </div>
          <div className="coaching-note">
            <p>⚡ <strong>What makes us different?</strong> Most apps just give you templates. Forge of Olympus gives you <strong>my coaching brain in code</strong> – adaptive periodisation that learns from your performance. Add live coaching for the full experience.</p>
          </div>
        </div>
      </section>

      <section className="programs" id="programs">
        <div className="container">
          <h2>Premium Programs</h2>
          <div className="program-grid">
            {programs.map(p => (
              <div key={p.title} className="program-card">
                <div className="program-header" style={{ backgroundImage: `url(${p.image})` }}>
                  <h3>{p.title}</h3>
                </div>
                <ul className="program-features">
                  {p.features.map(f => <li key={f}>{f}</li>)}
                </ul>
                <div className="program-buttons">
                  <a href={p.oneTimeLink} className="btn-plan">Get Plan + Engine – £19.99</a>
                  <a href={p.coachingLink} className="btn-coaching">Get Plan + Coaching – £169.99/mo</a>
                </div>
              </div>
            ))}
          </div>
          <div className="engine-cta">
            <p>Already own a plan? <a href="/subscribe" className="engine-link">Subscribe to Engine – £19.99/month</a></p>
          </div>
        </div>
      </section>
    </>
  );
}

/* PROGRAM DATA with new links */
const programs = [
  {
    title: "Ares Protocol",
    image: "/Ares Protocol.jpg",
    oneTimeLink: "https://buy.stripe.com/bJe5kD3Gec8pchc6mV4sE0p",
    coachingLink: "https://buy.stripe.com/14A28r1y63BT6WS6mV4sE0k", // existing coaching link
    features: [
      "Maximal strength development",
      "Powerlifting-focused programming",
      "Progressive overload systems",
      "Peak performance protocols"
    ]
  },
  /*
  {
    title: "Zeus Method",
    image: "/Zeus Method.jpg",
    oneTimeLink: "#",
    coachingLink: "https://buy.stripe.com/6oU3cvekSa0h80WaDb4sE0j",
    features: [
      "Explosive power training",
      "Olympic lifting techniques",
      "Rate of force development",
      "Athletic performance"
    ]
  },
 */
  {
    title: "Apollo Physique",
    image: "/Apollo Physique.jpg",
    oneTimeLink: "https://buy.stripe.com/aFa9ATekSegx1CydPn4sE0q",
    coachingLink: "https://buy.stripe.com/8x25kD0u2fkBa947qZ4sE0i",
    features: [
      "Bodybuilding symmetry focus",
      "Muscle definition protocols",
      "Proportion optimisation",
      "Classic physique development"
    ]
  },
  /*
  {
    title: "Hermes Engine",
    image: "/Hermes Engine.jpg",
    oneTimeLink: "#",
    coachingLink: "https://buy.stripe.com/8x28wPdgO3BTa94bHf4sE0h",
    features: [
      "Speed and agility training",
      "Dynamic movement patterns",
      "Coordination development",
      "Sport-specific conditioning"
    ]
  },
  */
  {
    title: "Hephaestus Framework",
    image: "/Hephaestus Framework.jpg",
    oneTimeLink: "https://buy.stripe.com/eVqbJ12CafkB4OKh1z4sE0s",
    coachingLink: "https://buy.stripe.com/6oU8wPa4CfkB1Cy7qZ4sE0g",
    features: [
      "Injury prevention protocols",
      "Joint health optimisation",
      "Recovery enhancement",
      "Longevity-focused training"
    ]
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
      "5‑week wave blocks with deload"
    ]
  }
];