import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Home from "./Home";
import Login from "./Login";
import Dashboard from "./Dashboard";
import ProgramSelect from "./ProgramSelect";
import SessionView from "./SessionView";
import Success from "./Success";

export default function App() {
  const userId = localStorage.getItem("userId");
  const program = localStorage.getItem("program");

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={!userId ? <Navigate to="/login" /> : <Dashboard />} />
        <Route path="/program" element={!userId ? <Navigate to="/login" /> : <ProgramSelect />} />
        <Route path="/session" element={
          !userId ? <Navigate to="/login" /> :
          !program ? <Navigate to="/program" /> :
          <SessionView />
        } />
        <Route path="/success" element={<Success />} />
        <Route path="/cancel" element={<Cancel />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

// Simple Cancel component
function Cancel() {
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