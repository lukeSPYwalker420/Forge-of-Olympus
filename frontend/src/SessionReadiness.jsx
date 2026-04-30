import { useState, useMemo } from "react";

export default function SessionReadiness({ onComplete, programLogic }) {
  const [readiness, setReadiness] = useState({
    sleep: 5,
    soreness: 5,
    mentalClarity: 5
  });

  const adjustments = useMemo(() => {
    const avg = (readiness.sleep + (10 - readiness.soreness) + readiness.mentalClarity) / 3;

    if (programLogic === "STRENGTH_RPE") {
      let adj = 0;
      if (avg <= 4) adj = -2;
      else if (avg <= 6) adj = -1;
      else if (avg >= 9) adj = 0.5;
      return { rpeAdjustment: adj, rirAdjustment: null, painAdjustment: null, stabilityAdjustment: null };
    }

    if (programLogic === "HYPERTROPHY_VOLUME") {
      let adj = 0;
      if (avg <= 4) adj = 2;
      else if (avg <= 6) adj = 1;
      else if (avg >= 9) adj = -1;
      return { rpeAdjustment: null, rirAdjustment: adj, painAdjustment: null, stabilityAdjustment: null };
    }

    // GENERAL_FITNESS_HYBRID and any other logic
    let painAdj = 0;
    let stabilityAdj = 0;
    let intensityAdj = 0;

    if (avg <= 4) {
      painAdj = 2;
      stabilityAdj = -2;
      intensityAdj = -1;
    } else if (avg <= 6) {
      painAdj = 1;
      stabilityAdj = -1;
      intensityAdj = -0.5;
    } else if (avg >= 9) {
      painAdj = -1;
      stabilityAdj = 1;
      intensityAdj = 0.5;
    }

    return {
      rpeAdjustment: intensityAdj,
      rirAdjustment: null,
      painAdjustment: painAdj,
      stabilityAdjustment: stabilityAdj
    };
  }, [readiness, programLogic]);

  const handleSubmit = () => {
    onComplete({
      readiness,
      adjustments: {
        rpeAdjustment: adjustments.rpeAdjustment,
        rirAdjustment: adjustments.rirAdjustment,
        painAdjustment: adjustments.painAdjustment,
        stabilityAdjustment: adjustments.stabilityAdjustment,
      }
    });
  };

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: "rgba(0,0,0,0.95)",
      zIndex: 1000,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "20px"
    }}>
      <div style={{
        background: "var(--card-bg)",
        borderRadius: "24px",
        padding: "30px",
        maxWidth: "500px",
        width: "100%",
        border: "1px solid var(--accent)"
      }}>
        <h2 style={{ color: "var(--accent)", marginBottom: "20px" }}>Session Readiness</h2>
        <p style={{ marginBottom: "20px", color: "var(--text-gray)" }}>
          How are you feeling today? This helps us adjust your workout intensity.
        </p>

        <div style={{ marginBottom: "20px" }}>
          <label style={{ display: "block", marginBottom: "8px" }}>Sleep Quality (1-10)</label>
          <input
            type="range"
            min="1"
            max="10"
            value={readiness.sleep}
            onChange={e => setReadiness({ ...readiness, sleep: parseInt(e.target.value) })}
            style={{ width: "100%" }}
          />
          <span style={{ textAlign: "center", display: "block", marginTop: "5px" }}>{readiness.sleep}/10</span>
        </div>

        <div style={{ marginBottom: "20px" }}>
          <label style={{ display: "block", marginBottom: "8px" }}>Soreness (1-10, higher = more sore)</label>
          <input
            type="range"
            min="1"
            max="10"
            value={readiness.soreness}
            onChange={e => setReadiness({ ...readiness, soreness: parseInt(e.target.value) })}
            style={{ width: "100%" }}
          />
          <span style={{ textAlign: "center", display: "block", marginTop: "5px" }}>{readiness.soreness}/10</span>
        </div>

        <div style={{ marginBottom: "20px" }}>
          <label style={{ display: "block", marginBottom: "8px" }}>Mental Clarity (1-10)</label>
          <input
            type="range"
            min="1"
            max="10"
            value={readiness.mentalClarity}
            onChange={e => setReadiness({ ...readiness, mentalClarity: parseInt(e.target.value) })}
            style={{ width: "100%" }}
          />
          <span style={{ textAlign: "center", display: "block", marginTop: "5px" }}>{readiness.mentalClarity}/10</span>
        </div>

        {programLogic === "STRENGTH_RPE" && adjustments.rpeAdjustment !== null && (
          <div style={{
            background: "#2a2a35",
            padding: "15px",
            borderRadius: "12px",
            marginBottom: "20px"
          }}>
            <strong>Recommendation:</strong>
            {adjustments.rpeAdjustment < 0 && (
              <p style={{ color: "#ffaa44", marginTop: "5px" }}>
                ⚠️ Lower readiness detected. Reducing target RPE by {Math.abs(adjustments.rpeAdjustment)} point{Math.abs(adjustments.rpeAdjustment) !== 1 ? 's' : ''}.
              </p>
            )}
            {adjustments.rpeAdjustment > 0 && (
              <p style={{ color: "#44ffaa", marginTop: "5px" }}>
                💪 Great readiness! You can push a little harder today. Increasing target RPE by {adjustments.rpeAdjustment} point{adjustments.rpeAdjustment !== 1 ? 's' : ''}.
              </p>
            )}
            {adjustments.rpeAdjustment === 0 && (
              <p style={{ marginTop: "5px" }}>✅ Ready to train as planned.</p>
            )}
          </div>
        )}

        {programLogic === "HYPERTROPHY_VOLUME" && adjustments.rirAdjustment !== null && (
          <div style={{
            background: "#2a2a35",
            padding: "15px",
            borderRadius: "12px",
            marginBottom: "20px"
          }}>
            <strong>Recommendation:</strong>
            {adjustments.rirAdjustment > 0 && (
              <p style={{ color: "#ffaa44", marginTop: "5px" }}>
                ⚠️ Lower readiness detected. Increasing target RIR by {adjustments.rirAdjustment} point{adjustments.rirAdjustment !== 1 ? 's' : ''} (less intensity).
              </p>
            )}
            {adjustments.rirAdjustment < 0 && (
              <p style={{ color: "#44ffaa", marginTop: "5px" }}>
                💪 Great readiness! You can handle more volume. Decreasing target RIR by {Math.abs(adjustments.rirAdjustment)} point{Math.abs(adjustments.rirAdjustment) !== 1 ? 's' : ''}.
              </p>
            )}
            {adjustments.rirAdjustment === 0 && (
              <p style={{ marginTop: "5px" }}>✅ Ready to train as planned.</p>
            )}
          </div>
        )}

        {programLogic === "GENERAL_FITNESS_HYBRID" && adjustments.rpeAdjustment !== null && (
          <div style={{ background: "#2a2a35", padding: "15px", borderRadius: "12px", marginBottom: "20px" }}>
            <strong>Recommendation:</strong>
            {adjustments.rpeAdjustment < 0 && (
              <p style={{ color: "#ffaa44" }}>⚠️ Lower readiness detected. Reducing target RPE by {Math.abs(adjustments.rpeAdjustment)} point{Math.abs(adjustments.rpeAdjustment) !== 1 ? 's' : ''}.</p>
            )}
            {adjustments.rpeAdjustment > 0 && (
              <p style={{ color: "#44ffaa" }}>💪 Great readiness! You can push harder today. Increasing target RPE by {adjustments.rpeAdjustment} point{adjustments.rpeAdjustment !== 1 ? 's' : ''}.</p>
            )}
            {adjustments.rpeAdjustment === 0 && <p>✅ Ready to train as planned.</p>}
          </div>
        )}

        <button
          onClick={handleSubmit}
          style={{
            width: "100%",
            padding: "14px",
            background: "var(--accent)",
            color: "#000",
            border: "none",
            borderRadius: "8px",
            fontWeight: "bold",
            cursor: "pointer"
          }}
        >
          Start Workout
        </button>
      </div>
    </div>
  );
}