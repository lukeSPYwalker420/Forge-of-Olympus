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

      <section className="programs" id="programs">
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
              <a href={p.link} className="stripe-button">Buy Now – £149</a>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

/* PROGRAM DATA */
const programs = [
  {
    title: "Ares Protocol",
    image: "/Ares Protocol.jpg",
    link: "https://buy.stripe.com/14A28r1y63BT6WS6mV4sE0k",
    features: [
      "Maximal strength development",
      "Powerlifting-focused programming",
      "Progressive overload systems",
      "Peak performance protocols"
    ]
  },
  {
    title: "Zeus Method",
    image: "/Zeus Method.jpg",
    link: "https://buy.stripe.com/6oU3cvekSa0h80WaDb4sE0j",
    features: [
      "Explosive power training",
      "Olympic lifting techniques",
      "Rate of force development",
      "Athletic performance"
    ]
  },
  {
    title: "Apollo Physique",
    image: "/Apollo Physique.jpg",
    link: "https://buy.stripe.com/8x25kD0u2fkBa947qZ4sE0i",
    features: [
      "Bodybuilding symmetry focus",
      "Muscle definition protocols",
      "Proportion optimisation",
      "Classic physique development"
    ]
  },
  {
    title: "Hermes Engine",
    image: "/Hermes Engine.jpg",
    link: "https://buy.stripe.com/8x28wPdgO3BTa94bHf4sE0h",
    features: [
      "Speed and agility training",
      "Dynamic movement patterns",
      "Coordination development",
      "Sport-specific conditioning"
    ]
  },
  {
    title: "Hephaestus Framework",
    image: "/Hephaestus Framework.jpg",
    link: "https://buy.stripe.com/6oU8wPa4CfkB1Cy7qZ4sE0g",
    features: [
      "Injury prevention protocols",
      "Joint health optimisation",
      "Recovery enhancement",
      "Longevity-focused training"
    ]
  },
  {
    title: "Poseidon Core",
    image: "/Poseidon Core.jpg",
    link: "https://buy.stripe.com/4gMdR9a4C5K1fto8v34sE0f",
    features: [
      "Advanced core stabilisation",
      "Rotational strength development",
      "Breathing pattern optimisation",
      "Full-body integration training"
    ]
  }
];