import React, { useEffect } from "react";

export default function Dashboard() {
  const userId = localStorage.getItem("userId");

  // Redirect if not logged in
  useEffect(() => {
    if (!userId) {
      window.location.href = "/login";
    }
  }, [userId]);

  if (!userId) {
    return null;
  }

  return (
    <div style={{ padding: 30 }}>
      <h1>Forge of Olympus</h1>

      <p>Welcome: {userId}</p>

      <div style={{ marginTop: 20 }}>
        <button
          onClick={() => {
            window.location.href = "/session";
          }}
          style={{
            padding: "10px 15px",
            borderRadius: 8,
            border: "none",
            background: "#111",
            color: "#fff",
            cursor: "pointer"
          }}
        >
          Start Workout
        </button>
      </div>
    </div>
  );
}