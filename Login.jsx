import { useState } from "react";

export default function Login() {
  const [email, setEmail] = useState("");

  const handleLogin = () => {
    if (!email) {
      alert("Enter email");
      return;
    }

    localStorage.setItem("userId", email);

    window.location.href = "/";
  };

  return (
    <div style={{
      height: "100vh",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      fontFamily: "system-ui"
    }}>
      <div style={{
        padding: 30,
        border: "1px solid #ccc",
        borderRadius: 12,
        width: 300
      }}>
        <h2>Login</h2>

        <input
          placeholder="Email"
          style={{ width: "100%", padding: 10, marginBottom: 10 }}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <button
          onClick={handleLogin}
          style={{
            width: "100%",
            padding: 10,
            background: "#111",
            color: "#fff",
            border: "none",
            borderRadius: 8
          }}
        >
          Enter
        </button>
      </div>
    </div>
  );
}