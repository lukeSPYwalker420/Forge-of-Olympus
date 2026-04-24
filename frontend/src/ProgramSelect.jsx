import { useNavigate } from "react-router-dom";
import "./ProgramSelect.css"; // we'll create this

export default function ProgramSelect() {
  const navigate = useNavigate();
  const purchased = JSON.parse(localStorage.getItem("purchasedPrograms") || "[]");

  const handleSelect = (programName) => {
  // For admin-assigned programs, store exactly as is
  // For Stripe programs, the name is already normalized
  localStorage.setItem("program", programName);
  localStorage.setItem("programJustSelected", "true");
  navigate("/dashboard");
};

  if (purchased.length === 0) {
    return (
      <div className="program-select-empty">
        <h1>No programs available</h1>
        <p>Please contact your coach to assign a program, or <a href="/">browse our plans</a>.</p>
        <button onClick={() => navigate("/")} className="back-home-btn">Back to Home</button>
      </div>
    );
  }

  return (
    <div className="program-select-container">
      <h1>Choose Your Weapon</h1>
      <div className="program-select-grid">
        {purchased.map(p => (
          <button
            key={p}
            onClick={() => handleSelect(p)}
            className="program-select-btn"
          >
            {p}
          </button>
        ))}
      </div>
      <button onClick={() => navigate("/dashboard")} className="back-dashboard-btn">
        ← Back to Dashboard
      </button>
    </div>
  );
}