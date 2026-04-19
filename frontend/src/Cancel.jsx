export default function Cancel() {
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
      <h1 style={{ color: "#ffaa44" }}>Payment Cancelled</h1>
      <p>Your payment was not completed. No charges were made.</p>
      <button 
        onClick={() => window.location.href = "/"}
        style={{
          marginTop: "20px",
          padding: "10px 20px",
          background: "var(--accent)",
          border: "none",
          borderRadius: "8px",
          cursor: "pointer"
        }}
      >
        Return to Home
      </button>
    </div>
  );
}