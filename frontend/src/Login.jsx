import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleEmailChange = (e) => {
    const value = e.target.value;
    setEmail(value);
    setError("");
    const adminEmail = "kieren2203@googlemail.com";
    if (value.toLowerCase() === adminEmail.toLowerCase()) {
      setShowPassword(true);
    } else {
      setShowPassword(false);
      setPassword("");
    }
  };

  const handleLogin = async () => {
    if (!email) {
      setError("Enter email");
      return;
    }
    if (showPassword && !password) {
      setError("Admin password required");
      return;
    }

    setIsLoading(true);
    setError("");

    const normalizedEmail = email.toLowerCase().trim();

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail, password }),
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem("userId", data.userId);
        localStorage.setItem("userEmail", data.email);
        localStorage.setItem("purchasedPrograms", JSON.stringify(data.purchasedPrograms));
        localStorage.setItem("hasActiveSubscription", data.hasActiveSubscription);
        localStorage.setItem("streak", data.streak || 0);
        // Notify App component about auth change
        window.dispatchEvent(new Event("authChange"));
        navigate("/dashboard");
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError("Login error: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ height: "100vh", display: "flex", justifyContent: "center", alignItems: "center", fontFamily: "system-ui", background: "#0a0c10" }}>
      <div style={{ padding: 30, border: "1px solid #333", borderRadius: 12, width: 320, background: "#1e1e2a" }}>
        <h2 style={{ color: "#d4af37", textAlign: "center", marginBottom: 20 }}>Access Your System</h2>
        <input
          placeholder="Email"
          style={{ width: "100%", padding: 12, marginBottom: 12, borderRadius: 8, border: "1px solid #333", background: "#2a2a35", color: "#fff", fontSize: 16 }}
          value={email}
          onChange={handleEmailChange}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck="false"
        />
        {showPassword && (
          <input
            type="password"
            placeholder="Admin Password"
            style={{ width: "100%", padding: 12, marginBottom: 12, borderRadius: 8, border: "1px solid #333", background: "#2a2a35", color: "#fff", fontSize: 16 }}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleLogin()}
          />
        )}
        {error && <div style={{ color: "#ff5555", fontSize: 14, marginBottom: 12, textAlign: "center" }}>{error}</div>}
        <button
          onClick={handleLogin}
          disabled={isLoading}
          style={{ width: "100%", padding: 12, background: "#d4af37", color: "#000", border: "none", borderRadius: 8, fontWeight: "bold", fontSize: 16, cursor: "pointer", opacity: isLoading ? 0.7 : 1 }}
        >
          {isLoading ? "Logging in..." : "Enter"}
        </button>
      </div>
    </div>
  );
}