import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Success() {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    // Refresh user data to get new purchases
    const refreshUserData = async (retries = 5) => {
  const email = localStorage.getItem("userEmail");
  if (!email) return false;
  for (let i = 0; i < retries; i++) {
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    });
    const data = await res.json();
    if (res.ok && data.purchasedPrograms && data.purchasedPrograms.length > 0) {
      localStorage.setItem("userId", data.userId);
      localStorage.setItem("purchasedPrograms", JSON.stringify(data.purchasedPrograms));
      return true;
    }
    if (i < retries - 1) await new Promise(r => setTimeout(r, 1000)); // wait 1 sec
  }
  return false;
};
    
    refreshUserData();
    
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate("/dashboard");
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [navigate]);

  return (
    <div style={{
      height: "100vh",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      textAlign: "center",
      padding: "20px"
    }}>
      <h1 style={{ color: "var(--accent)" }}>🎉 Purchase Successful!</h1>
      <p>Your program has been added to your dashboard.</p>
      <p>Redirecting to dashboard in {countdown} seconds...</p>
      <button 
        onClick={() => navigate("/dashboard")}
        style={{
          marginTop: "20px",
          padding: "10px 20px",
          background: "var(--accent)",
          border: "none",
          borderRadius: "8px",
          cursor: "pointer"
        }}
      >
        Go to Dashboard Now
      </button>
    </div>
  );
}