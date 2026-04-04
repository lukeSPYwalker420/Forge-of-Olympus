import { useNavigate } from "react-router-dom";

export default function ProgramSelect() {
  const navigate = useNavigate();

  // Read directly from localStorage on every render (no useEffect needed)
  const purchased = JSON.parse(localStorage.getItem("purchasedPrograms") || "[]");
  const allPrograms = [
    "Ares Protocol", "Zeus Method", "Apollo Physique",
    "Hermes Engine", "Hephaestus Framework", "Poseidon Core"
  ];
  const availablePrograms = allPrograms.filter(p => purchased.includes(p));

  const handleSelect = (programName) => {
    localStorage.setItem("program", programName);
    navigate("/session");
  };

  if (availablePrograms.length === 0) {
    return (
      <div style={{ padding: 40 }}>
        <h1>No programs purchased yet</h1>
        <p>Please buy a program from our <a href="/">homepage</a> first.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 40 }}>
      <h1>Select Your Program</h1>
      {availablePrograms.map(p => (
        <button key={p} onClick={() => handleSelect(p)} style={{ display: "block", margin: 10 }}>
          {p}
        </button>
      ))}
    </div>
  );
}