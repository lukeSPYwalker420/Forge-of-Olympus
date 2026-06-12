import { useState } from "react";

// Master database of all program variations
// Only combinations listed here will be selectable.
const PROGRAM_DATABASE = [
  // ========== STRENGTH (4-day) ==========
  {
    id: "str_4_balanced",
    goal: "strength",
    frequency: 4,
    focus: "balanced",
    displayTitle: "Apex Strength: Core IV (Base System)",
    programName: "Ares Protocol",
    duration: "4-Week Accumulation + 1-Week Taper",
    fatigueCap: "Axial Load Budget: 45 FU / Week",
    features: ["Auto‑calculated top sets", "RPE‑based intensity management", "Dynamic wave progression"]
  },
  {
    id: "str_4_bench",
    goal: "strength",
    frequency: 4,
    focus: "bench",
    displayTitle: "Apex Strength: Core IV (Bench Specifier)",
    programName: "Ares Protocol",
    duration: "4-Week Accumulation + 1-Week Taper",
    fatigueCap: "Axial Load Budget: 40 FU / Week",
    features: ["High-frequency bench routing", "Tricep fatigue-budget isolation", "Overload tracking logic"]
  },
  {
    id: "str_4_squat",
    goal: "strength",
    frequency: 4,
    focus: "squat",
    displayTitle: "Apex Strength: Core IV (Squat Specifier)",
    programName: "Ares Protocol",
    duration: "4-Week Accumulation + 1-Week Taper",
    fatigueCap: "Axial Load Budget: 48 FU / Week",
    features: ["Squat-centric volume distribution", "Posterior chain prioritisation", "Compensatory acceleration training"]
  },
  {
    id: "str_4_deadlift",
    goal: "strength",
    frequency: 4,
    focus: "deadlift",
    displayTitle: "Apex Strength: Core IV (Deadlift Specifier)",
    programName: "Ares Protocol",
    duration: "4-Week Accumulation + 1-Week Taper",
    fatigueCap: "Axial Load Budget: 50 FU / Week",
    features: ["Deadlift-specific wave loading", "Grip and back endurance protocols", "Low-back fatigue management"]
  },

  // ========== STRENGTH (3-day) ==========
  {
    id: "str_3_balanced",
    goal: "strength",
    frequency: 3,
    focus: "balanced",
    displayTitle: "Apex Strength: Core III (Balanced)",
    programName: "Ares Protocol",
    duration: "4-Week Accumulation + 1-Week Taper",
    fatigueCap: "Axial Load Budget: 35 FU / Week",
    features: ["3‑day full body", "Slightly lower volume", "Great for recovery"]
  },
  {
    id: "str_3_squat",
    goal: "strength",
    frequency: 3,
    focus: "squat",
    displayTitle: "Apex Strength: Core III (Squat Specifier)",
    programName: "Ares Protocol",
    duration: "4-Week Accumulation + 1-Week Taper",
    fatigueCap: "Axial Load Budget: 38 FU / Week",
    features: ["Squat‑focused 3‑day split", "Posterior chain maintenance", "Lower axial fatigue than 4‑day"]
  },
  {
    id: "str_3_bench",
    goal: "strength",
    frequency: 3,
    focus: "bench",
    displayTitle: "Apex Strength: Core III (Bench Specifier)",
    programName: "Ares Protocol",
    duration: "4-Week Accumulation + 1-Week Taper",
    fatigueCap: "Axial Load Budget: 32 FU / Week",
    features: ["Bench priority each session", "Tricep and shoulder prehab", "Ideal for intermediate lifters"]
  },
  {
    id: "str_3_deadlift",
    goal: "strength",
    frequency: 3,
    focus: "deadlift",
    displayTitle: "Apex Strength: Core III (Deadlift Specifier)",
    programName: "Ares Protocol",
    duration: "4-Week Accumulation + 1-Week Taper",
    fatigueCap: "Axial Load Budget: 40 FU / Week",
    features: ["Deadlift once + variations", "Low‑back recovery focus", "Weekly wave loading"]
  },

  // ========== STRENGTH (5-day) ==========
  {
    id: "str_5_balanced",
    goal: "strength",
    frequency: 5,
    focus: "balanced",
    displayTitle: "Apex Strength: Core V (High Frequency)",
    programName: "Ares Protocol",
    duration: "4-Week Accumulation + 1-Week Taper",
    fatigueCap: "Axial Load Budget: 55 FU / Week",
    features: ["5‑day split", "Greater practice on main lifts", "Advanced recovery required"]
  },
  {
    id: "str_5_squat",
    goal: "strength",
    frequency: 5,
    focus: "squat",
    displayTitle: "Apex Strength: Core V (Squat Specifier)",
    programName: "Ares Protocol",
    duration: "4-Week Accumulation + 1-Week Taper",
    fatigueCap: "Axial Load Budget: 58 FU / Week",
    features: ["Squat or variation 3x/week", "High‑frequency quad work", "Technical refinement"]
  },
  {
    id: "str_5_bench",
    goal: "strength",
    frequency: 5,
    focus: "bench",
    displayTitle: "Apex Strength: Core V (Bench Specifier)",
    programName: "Ares Protocol",
    duration: "4-Week Accumulation + 1-Week Taper",
    fatigueCap: "Axial Load Budget: 50 FU / Week",
    features: ["Bench 4x/week", "Competition grip & paused variants", "Accumulated pressing volume"]
  },
  {
    id: "str_5_deadlift",
    goal: "strength",
    frequency: 5,
    focus: "deadlift",
    displayTitle: "Apex Strength: Core V (Deadlift Specifier)",
    programName: "Ares Protocol",
    duration: "4-Week Accumulation + 1-Week Taper",
    fatigueCap: "Axial Load Budget: 62 FU / Week",
    features: ["Deadlift 2x + RDL/snatch grip", "Posterior chain density", "Grip and core emphasis"]
  },

  // ========== HYPERTROPHY (4-day) ==========
  {
    id: "hyp_4_upper_lower",
    goal: "hypertrophy",
    frequency: 4,
    focus: "upper_lower",
    displayTitle: "Apex Hypertrophy: 4‑Day Upper/Lower",
    programName: "Apollo Physique",
    duration: "6-Week Hypertrophy Base Block",
    fatigueCap: "Volume Allocation: 65 FU / Week",
    features: ["Volume‑focused schemes", "Symmetry and proportion emphasis", "Muscle group prioritisation"]
  },
  {
    id: "hyp_4_ppl",
    goal: "hypertrophy",
    frequency: 4,
    focus: "ppl",
    displayTitle: "Apex Hypertrophy: 4‑Day Push/Pull/Legs",
    programName: "Apollo Physique",
    duration: "6-Week Hypertrophy Base Block",
    fatigueCap: "Volume Allocation: 60 FU / Week",
    features: ["Push/Pull/Legs rotation", "Higher weekly frequency per muscle", "Pump‑oriented auto‑regulation"]
  },
  {
    id: "hyp_4_plane",
    goal: "hypertrophy",
    frequency: 4,
    focus: "plane",
    displayTitle: "Apollo Physique: 4‑Day Plane Bias (Horizontal / Vertical)",
    programName: "Apollo Physique",
    duration: "6-Week Hypertrophy Base Block",
    fatigueCap: "Volume Allocation: 68 FU / Week",
    features: ["Horizontal push/pull & vertical push/pull", "Superior movement plane separation", "Higher stimulus-to-fatigue ratio"]
  },

  // ========== HYPERTROPHY (3-day) ==========
  {
    id: "hyp_3_upper_lower",
    goal: "hypertrophy",
    frequency: 3,
    focus: "upper_lower",
    displayTitle: "Apex Hypertrophy: 3‑Day Upper/Lower",
    programName: "Apollo Physique",
    duration: "6-Week Hypertrophy Base Block",
    fatigueCap: "Volume Allocation: 50 FU / Week",
    features: ["Full body / upper‑lower hybrid", "Recovery‑focused", "Great for busy schedules"]
  },
  {
    id: "hyp_3_ppl",
    goal: "hypertrophy",
    frequency: 3,
    focus: "ppl",
    displayTitle: "Apex Hypertrophy: 3‑Day Push/Pull/Legs",
    programName: "Apollo Physique",
    duration: "6-Week Hypertrophy Base Block",
    fatigueCap: "Volume Allocation: 48 FU / Week",
    features: ["Classic PPL once per week", "High intensity per session", "Minimal overlap fatigue"]
  },
  {
    id: "hyp_3_plane",
    goal: "hypertrophy",
    frequency: 3,
    focus: "plane",
    displayTitle: "Apollo Physique: 3‑Day Plane Bias (Condensed)",
    programName: "Apollo Physique",
    duration: "6-Week Hypertrophy Base Block",
    fatigueCap: "Volume Allocation: 52 FU / Week",
    features: ["Plane bias on a 3‑day schedule", "Upper horizontal + vertical + legs", "Efficient for natural lifters"]
  },

  // ========== HYPERTROPHY (5-day) ==========
  {
    id: "hyp_5_upper_lower",
    goal: "hypertrophy",
    frequency: 5,
    focus: "upper_lower",
    displayTitle: "Apex Hypertrophy: 5‑Day Upper/Lower",
    programName: "Apollo Physique",
    duration: "6-Week Hypertrophy Base Block",
    fatigueCap: "Volume Allocation: 75 FU / Week",
    features: ["5‑day higher frequency", "Specialisation options", "Advanced recovery protocols"]
  },
  {
    id: "hyp_5_ppl",
    goal: "hypertrophy",
    frequency: 5,
    focus: "ppl",
    displayTitle: "Apex Hypertrophy: 5‑Day Push/Pull/Legs",
    programName: "Apollo Physique",
    duration: "6-Week Hypertrophy Base Block",
    fatigueCap: "Volume Allocation: 70 FU / Week",
    features: ["PPL with 2x upper, 2x lower, 1x arms/accessory", "High weekly volume per muscle", "Requires sleep & nutrition focus"]
  },
  {
    id: "hyp_5_plane",
    goal: "hypertrophy",
    frequency: 5,
    focus: "plane",
    displayTitle: "Apollo Physique: 5‑Day Plane Bias (Advanced)",
    programName: "Apollo Physique",
    duration: "6-Week Hypertrophy Base Block",
    fatigueCap: "Volume Allocation: 80 FU / Week",
    features: ["Horizontal/vertical rotation 5x/week", "Maximum plane‑specific volume", "For experienced lifters only"]
  },

  // ========== MEET PREP (4-day) ==========
  {
    id: "mp_4_peaking",
    goal: "meetprep",
    frequency: 4,
    focus: "peaking",
    displayTitle: "Meet Prep: Peaking Block (4‑Day)",
    programName: "High-Frequency Specificity Wave",
    duration: "8-Week Peaking Cycle",
    fatigueCap: "Axial Load Budget: 50 FU / Week",
    features: ["Peaking wave loading", "Specificity to competition lifts", "Taper to openers"]
  },
  {
    id: "mp_4_taper",
    goal: "meetprep",
    frequency: 4,
    focus: "taper",
    displayTitle: "Meet Prep: Taper & Deload (4‑Day)",
    programName: "6-Week Wave Powerlifting",
    duration: "4-Week Taper + 2-Week Peak",
    fatigueCap: "Axial Load Budget: 45 FU / Week",
    features: ["Fatigue managed", "Openers rehearsal", "Low volume, high intensity"]
  },
  // ========== MEET PREP (3-day) ==========
  {
    id: "mp_3_peaking",
    goal: "meetprep",
    frequency: 3,
    focus: "peaking",
    displayTitle: "Meet Prep: Peaking Block (3‑Day)",
    programName: "High-Frequency Specificity Wave",
    duration: "8-Week Peaking Cycle",
    fatigueCap: "Axial Load Budget: 40 FU / Week",
    features: ["3‑day wave", "Lower fatigue accumulation", "Still peaks effectively"]
  },
  {
    id: "mp_3_taper",
    goal: "meetprep",
    frequency: 3,
    focus: "taper",
    displayTitle: "Meet Prep: Taper & Deload (3‑Day)",
    programName: "6-Week Wave Powerlifting",
    duration: "4-Week Taper + 2-Week Peak",
    fatigueCap: "Axial Load Budget: 38 FU / Week",
    features: ["3‑day schedule", "Great for advanced lifters", "Openers rehearsal"]
  },
  // ========== MEET PREP (5-day) ==========
  {
    id: "mp_5_peaking",
    goal: "meetprep",
    frequency: 5,
    focus: "peaking",
    displayTitle: "Meet Prep: Peaking Block (5‑Day)",
    programName: "High-Frequency Specificity Wave",
    duration: "8-Week Peaking Cycle",
    fatigueCap: "Axial Load Budget: 60 FU / Week",
    features: ["High frequency peaking", "Maximum specificity", "Advanced recovery required"]
  },
  {
    id: "mp_5_taper",
    goal: "meetprep",
    frequency: 5,
    focus: "taper",
    displayTitle: "Meet Prep: Taper & Deload (5‑Day)",
    programName: "6-Week Wave Powerlifting",
    duration: "4-Week Taper + 2-Week Peak",
    fatigueCap: "Axial Load Budget: 55 FU / Week",
    features: ["5‑day high frequency", "Intensity wave", "Ideal for experienced lifters"]
  }
];

export default function ProgramSelector({ onSubscribe, isAdmin = false }) {
  const [goal, setGoal] = useState("strength");
  const [frequency, setFrequency] = useState(4);
  const [focus, setFocus] = useState("balanced");

  // Auto‑correct focus when goal changes
  const handleGoalChange = (newGoal) => {
    setGoal(newGoal);
    if (newGoal === "strength") {
      setFocus("balanced");
    } else if (newGoal === "hypertrophy") {
      setFocus("upper_lower");
    } else {
      // meetprep defaults to peaking
      setFocus("peaking");
    }
  };

  // Helper: check if any program exists for the given combination
  const isComboAvailable = (g, freq, foc) => {
    return PROGRAM_DATABASE.some(p => p.goal === g && p.frequency === freq && p.focus === foc);
  };

  // Find the exact matching program
  const matchedProgram = PROGRAM_DATABASE.find(
    p => p.goal === goal && p.frequency === frequency && p.focus === focus
  );

  const handleSubscribeClick = async () => {
    if (matchedProgram && onSubscribe) {
      const jsonFile = `${matchedProgram.id}.json`;
      try {
        const response = await fetch(`/programs/${jsonFile}`);
        const programData = await response.json();
        // If admin, bypass Stripe and directly load the program
        if (isAdmin) {
          onSubscribe(matchedProgram.programName, programData, { adminBypass: true });
        } else {
          // Normal user: pass data to parent, which should trigger Stripe checkout
          onSubscribe(matchedProgram.programName, programData);
        }
      } catch (error) {
        console.error("Failed to load program:", error);
      }
    }
  };

  return (
    <div className="program-selector-container" style={{ padding: "40px 20px", maxWidth: "600px", margin: "0 auto", background: "#0d0d13", color: "#fff", borderRadius: "16px" }}>
      <h2 style={{ textAlign: "center", marginBottom: "8px", fontSize: "24px", fontWeight: "bold" }}>Choose Your Training Path</h2>
      <p style={{ textAlign: "center", color: "#8a8a93", marginBottom: "32px", fontSize: "14px" }}>
        Select your primary goal, how often you train, and your focus area. We'll build a custom plan that adapts to you.
      </p>

      {/* STEP 1: GOAL */}
      <div className="selector-group" style={{ marginBottom: "24px" }}>
        <label style={{ display: "block", fontSize: "12px", color: "var(--accent, #06b6d4)", fontWeight: "bold", marginBottom: "8px", textTransform: "uppercase" }}>1. What's your main objective?</label>
        <div style={{ display: "flex", gap: "10px", background: "#1a1a24", padding: "4px", borderRadius: "8px", flexWrap: "wrap" }}>
          <button
            onClick={() => handleGoalChange("strength")}
            style={{
              flex: 1, padding: "10px", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold",
              background: goal === "strength" ? "#2a2a3a" : "transparent",
              color: goal === "strength" ? "#fff" : "#8a8a93"
            }}
          >
            🏋️ Strength & Peaking
          </button>
          <button
            onClick={() => handleGoalChange("hypertrophy")}
            style={{
              flex: 1, padding: "10px", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold",
              background: goal === "hypertrophy" ? "#2a2a3a" : "transparent",
              color: goal === "hypertrophy" ? "#fff" : "#8a8a93"
            }}
          >
            💪 Hypertrophy (Muscle Growth)
          </button>
          <button
            onClick={() => handleGoalChange("meetprep")}
            style={{
              flex: 1, padding: "10px", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold",
              background: goal === "meetprep" ? "#2a2a3a" : "transparent",
              color: goal === "meetprep" ? "#fff" : "#8a8a93"
            }}
          >
            🎯 Meet Prep (Competition Peak)
          </button>
        </div>
      </div>

      {/* STEP 2: FREQUENCY */}
      <div className="selector-group" style={{ marginBottom: "24px" }}>
        <label style={{ display: "block", fontSize: "12px", color: "var(--accent, #06b6d4)", fontWeight: "bold", marginBottom: "8px", textTransform: "uppercase" }}>2. How many days per week can you train?</label>
        <div style={{ display: "flex", gap: "10px", background: "#1a1a24", padding: "4px", borderRadius: "8px" }}>
          {[3, 4, 5].map(dayOption => {
            const hasAnyPlan = PROGRAM_DATABASE.some(p => p.goal === goal && p.frequency === dayOption);
            return (
              <button
                key={dayOption}
                disabled={!hasAnyPlan}
                onClick={() => setFrequency(dayOption)}
                style={{
                  flex: 1, padding: "10px", border: "none", borderRadius: "6px", fontWeight: "bold",
                  cursor: hasAnyPlan ? "pointer" : "not-allowed",
                  background: frequency === dayOption ? "#2a2a3a" : "transparent",
                  color: frequency === dayOption ? "#fff" : hasAnyPlan ? "#8a8a93" : "#3a3a4a",
                  opacity: hasAnyPlan ? 1 : 0.4
                }}
              >
                {dayOption} Days/Week
              </button>
            );
          })}
        </div>
      </div>

      {/* STEP 3: FOCUS / SPLIT */}
      <div className="selector-group" style={{ marginBottom: "32px" }}>
        <label style={{ display: "block", fontSize: "12px", color: "var(--accent, #06b6d4)", fontWeight: "bold", marginBottom: "8px", textTransform: "uppercase" }}>
          {goal === "strength" ? "3. Which lift do you want to prioritise?" : goal === "hypertrophy" ? "3. How do you prefer to split your workouts?" : "3. What's your meet prep style?"}
        </label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: "10px" }}>
          {goal === "strength" ? (
            ["balanced", "squat", "bench", "deadlift"].map(foc => {
              const available = isComboAvailable(goal, frequency, foc);
              let label = foc === "balanced" ? "Balanced (All lifts)" : `${foc.charAt(0).toUpperCase() + foc.slice(1)} Focus`;
              return (
                <button
                  key={foc}
                  disabled={!available}
                  onClick={() => setFocus(foc)}
                  style={{
                    padding: "12px", border: "1px solid #2a2a3a", borderRadius: "8px", fontWeight: "bold",
                    cursor: available ? "pointer" : "not-allowed",
                    background: focus === foc ? "#2a2a3a" : "#1a1a24",
                    color: focus === foc ? "#fff" : available ? "#8a8a93" : "#3a3a4a",
                    borderColor: focus === foc ? "var(--accent, #06b6d4)" : "#2a2a3a",
                    opacity: available ? 1 : 0.4
                  }}
                >
                  {label}
                </button>
              );
            })
          ) : goal === "hypertrophy" ? (
            ["upper_lower", "ppl", "plane"].map(foc => {
              const available = isComboAvailable(goal, frequency, foc);
              let displayText = foc === "upper_lower" ? "Upper / Lower" : foc === "ppl" ? "Push / Pull / Legs" : "Plane Bias (Horizontal/Vertical)";
              return (
                <button
                  key={foc}
                  disabled={!available}
                  onClick={() => setFocus(foc)}
                  style={{
                    padding: "12px", border: "1px solid #2a2a3a", borderRadius: "8px", fontWeight: "bold",
                    cursor: available ? "pointer" : "not-allowed",
                    background: focus === foc ? "#2a2a3a" : "#1a1a24",
                    color: focus === foc ? "#fff" : available ? "#8a8a93" : "#3a3a4a",
                    borderColor: focus === foc ? "var(--accent, #06b6d4)" : "#2a2a3a",
                    opacity: available ? 1 : 0.4
                  }}
                >
                  {displayText}
                </button>
              );
            })
          ) : (
            ["peaking", "taper"].map(foc => {
              const available = isComboAvailable(goal, frequency, foc);
              let displayText = foc === "peaking" ? "Full Peaking Block (8 weeks)" : "Taper & Deload (6 weeks)";
              return (
                <button
                  key={foc}
                  disabled={!available}
                  onClick={() => setFocus(foc)}
                  style={{
                    padding: "12px", border: "1px solid #2a2a3a", borderRadius: "8px", fontWeight: "bold",
                    cursor: available ? "pointer" : "not-allowed",
                    background: focus === foc ? "#2a2a3a" : "#1a1a24",
                    color: focus === foc ? "#fff" : available ? "#8a8a93" : "#3a3a4a",
                    borderColor: focus === foc ? "var(--accent, #06b6d4)" : "#2a2a3a",
                    opacity: available ? 1 : 0.4
                  }}
                >
                  {displayText}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* DYNAMIC HERO CARD */}
      {matchedProgram ? (
        <div className="hero-program-card" style={{ background: "linear-gradient(135deg, #1e1e2f 0%, #12121a 100%)", padding: "24px", borderRadius: "12px", border: "1px solid #2a2a40", boxShadow: "0 10px 30px rgba(0,0,0,0.5)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <span style={{ fontSize: "11px", background: "#2a2a40", padding: "4px 8px", borderRadius: "4px", color: "var(--accent, #06b6d4)", fontWeight: "bold", letterSpacing: "1px" }}>YOUR MATCH</span>
            {isAdmin && <span style={{ fontSize: "11px", background: "#ffaa44", padding: "4px 8px", borderRadius: "4px", color: "#000", fontWeight: "bold" }}>ADMIN MODE – No Payment</span>}
          </div>
          <h3 style={{ fontSize: "20px", fontWeight: "bold", marginBottom: "12px", color: "#fff" }}>{matchedProgram.displayTitle}</h3>

          <div style={{ display: "flex", gap: "16px", fontSize: "12px", color: "#a0a0ab", marginBottom: "20px", borderBottom: "1px solid #2a2a3a", paddingBottom: "12px", flexWrap: "wrap" }}>
            <span>📅 {matchedProgram.duration}</span>
            <span>📊 {matchedProgram.fatigueCap}</span>
          </div>

          <ul style={{ paddingLeft: "0", listStyle: "none", marginBottom: "24px" }}>
            {matchedProgram.features.map((feat, idx) => (
              <li key={idx} style={{ fontSize: "13px", color: "#d4d4d8", marginBottom: "8px", display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ color: "var(--accent, #06b6d4)" }}>✓</span> {feat}
              </li>
            ))}
          </ul>

          <button
            onClick={handleSubscribeClick}
            style={{ display: "block", width: "100%", textAlign: "center", padding: "14px", background: "var(--accent, #06b6d4)", color: "#000", border: "none", borderRadius: "8px", fontWeight: "bold", fontSize: "15px", cursor: "pointer", transition: "background 0.2s" }}
          >
            {isAdmin ? "Initialize Program (Admin Bypass)" : "Subscribe & Initialize Training →"}
          </button>
        </div>
      ) : (
        <div style={{ textAlign: "center", padding: "20px", border: "1px dashed #3a3a4a", borderRadius: "8px", color: "#8a8a93" }}>
          Select your training parameters above – we'll find the perfect system for you.
        </div>
      )}
    </div>
  );
}