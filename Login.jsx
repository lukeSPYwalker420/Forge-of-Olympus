import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [email, setEmail] = useState("");
  const navigate = useNavigate();

  const handleLogin = async () => {
  if (!email) return alert("Enter email");
  const res = await fetch("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email })
  });
  const data = await res.json();
  if (res.ok) {
    localStorage.setItem("userId", data.userId);
    localStorage.setItem("userEmail", data.email);
    localStorage.setItem("purchasedPrograms", JSON.stringify(data.purchasedPrograms));
    navigate("/dashboard");
  } else {
    alert(data.error);
  }
};

  return (
    <div style={{ height: "100vh", display: "flex", justifyContent: "center", alignItems: "center", fontFamily: "system-ui" }}>
      <div style={{ padding: 30, border: "1px solid #ccc", borderRadius: 12, width: 300 }}>
        <h2>Login</h2>
        <input placeholder="Email" style={{ width: "100%", padding: 10, marginBottom: 10 }} value={email} onChange={(e) => setEmail(e.target.value)} />
        <button onClick={handleLogin} style={{ width: "100%", padding: 10, background: "#111", color: "#fff", border: "none", borderRadius: 8 }}>Enter</button>
      </div>
    </div>
  );
}