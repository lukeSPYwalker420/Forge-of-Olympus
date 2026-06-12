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
    features: [
      "Auto‑calculated top sets",
      "RPE‑based intensity management",
      "Dynamic wave progression"
    ]
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
    features: [
      "High-frequency bench routing",
      "Tricep fatigue-budget isolation",
      "Overload tracking logic"
    ]
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
    features: [
      "Squat-centric volume distribution",
      "Posterior chain prioritisation",
      "Compensatory acceleration training"
    ]
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
    features: [
      "Deadlift-specific wave loading",
      "Grip and back endurance protocols",
      "Low-back fatigue management"
    ]
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
  }
];

export default function ProgramSelector({ onSubscribe }) {
  const [goal, setGoal] = useState("strength");
  const [frequency, setFrequency] = useState(4);
  const [focus, setFocus] = useState("balanced");

  // Auto‑correct focus when goal changes
  const handleGoalChange = (newGoal) => {
    setGoal(newGoal);
    if (newGoal === "strength") {
      setFocus("balanced");
    } else {
      setFocus("upper_lower");
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

  const handleSubscribeClick = () => {
    if (matchedProgram && onSubscribe) {
      onSubscribe(matchedProgram.programName, {
        programId: matchedProgram.id,
        displayTitle: matchedProgram.displayTitle,
        frequency: matchedProgram.frequency,
        focus: matchedProgram.focus
      });
    } else if (matchedProgram) {
      console.error("No onSubscribe handler provided");
    }
  };

  return (
    <div className="program-selector-container" style={{ padding: "40px 20px", maxWidth: "600px", margin: "0 auto", background: "#0d0d13", color: "#fff", borderRadius: "16px" }}>
      <h2 style={{ textAlign: "center", marginBottom: "8px", fontSize: "24px", fontWeight: "bold" }}>Configure Your System</h2>
      <p style={{ textAlign: "center", color: "#8a8a93", marginBottom: "32px", fontSize: "14px" }}>
        Select your performance metrics to initialize your training block.
      </p>

      {/* STEP 1: GOAL */}
      <div className="selector-group" style={{ marginBottom: "24px" }}>
        <label style={{ display: "block", fontSize: "12px", color: "var(--accent, #06b6d4)", fontWeight: "bold", marginBottom: "8px", textTransform: "uppercase" }}>1. Primary Modality</label>
        <div style={{ display: "flex", gap: "10px", background: "#1a1a24", padding: "4px", borderRadius: "8px" }}>
          <button
            onClick={() => handleGoalChange("strength")}
            style={{
              flex: 1, padding: "10px", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold",
              background: goal === "strength" ? "#2a2a3a" : "transparent",
              color: goal === "strength" ? "#fff" : "#8a8a93"
            }}
          >
            ⚡ Strength & Peaking
          </button>
          <button
            onClick={() => handleGoalChange("hypertrophy")}
            style={{
              flex: 1, padding: "10px", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold",
              background: goal === "hypertrophy" ? "#2a2a3a" : "transparent",
              color: goal === "hypertrophy" ? "#fff" : "#8a8a93"
            }}
          >
            💪 Hypertrophy Base
          </button>
        </div>
      </div>

      {/* STEP 2: FREQUENCY */}
      <div className="selector-group" style={{ marginBottom: "24px" }}>
        <label style={{ display: "block", fontSize: "12px", color: "var(--accent, #06b6d4)", fontWeight: "bold", marginBottom: "8px", textTransform: "uppercase" }}>2. Weekly Frequency</label>
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
                {dayOption} Days
              </button>
            );
          })}
        </div>
      </div>

      {/* STEP 3: FOCUS / SPLIT */}
      <div className="selector-group" style={{ marginBottom: "32px" }}>
        <label style={{ display: "block", fontSize: "12px", color: "var(--accent, #06b6d4)", fontWeight: "bold", marginBottom: "8px", textTransform: "uppercase" }}>
          {goal === "strength" ? "3. Vector Focus" : "3. Split Architecture"}
        </label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
          {goal === "strength" ? (
            ["balanced", "squat", "bench", "deadlift"].map(foc => {
              const available = isComboAvailable(goal, frequency, foc);
              return (
                <button
                  key={foc}
                  disabled={!available}
                  onClick={() => setFocus(foc)}
                  style={{
                    padding: "12px", border: "1px solid #2a2a3a", borderRadius: "8px", fontWeight: "bold", textTransform: "capitalize",
                    cursor: available ? "pointer" : "not-allowed",
                    background: focus === foc ? "#2a2a3a" : "#1a1a24",
                    color: focus === foc ? "#fff" : available ? "#8a8a93" : "#3a3a4a",
                    borderColor: focus === foc ? "var(--accent, #06b6d4)" : "#2a2a3a",
                    opacity: available ? 1 : 0.4
                  }}
                >
                  {foc === "balanced" ? "🎯 Balanced Base" : `🏋️ ${foc.charAt(0).toUpperCase() + foc.slice(1)} Focus`}
                </button>
              );
            })
          ) : (
            ["upper_lower", "ppl"].map(foc => {
              const available = isComboAvailable(goal, frequency, foc);
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
                  {foc === "upper_lower" ? "🧱 Upper / Lower" : "☠️ Push / Pull / Legs"}
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
            <span style={{ fontSize: "11px", background: "#2a2a40", padding: "4px 8px", borderRadius: "4px", color: "var(--accent, #06b6d4)", fontWeight: "bold", letterSpacing: "1px" }}>SYSTEM MATCH</span>
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
            Initialize Training Block Engine →
          </button>
        </div>
      ) : (
        <div style={{ textAlign: "center", padding: "20px", border: "1px dashed #3a3a4a", borderRadius: "8px", color: "#8a8a93" }}>
          Select parameters to calculate allocation matrix.
        </div>
      )}
    </div>
  );
}