import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import Home from "./Home";
import Login from "./Login";
import Dashboard from "./Dashboard";
import ProgramSelect from "./ProgramSelect";
import SessionView from "./SessionView";
import Success from "./Success";
import Cancel from "./Cancel";
import Landing from "./Landing";

export default function App() {
  // Reactive auth state – updates when localStorage changes
  const [userId, setUserId] = useState(localStorage.getItem("userId"));
  const [program, setProgram] = useState(localStorage.getItem("program"));

  useEffect(() => {
    const handleStorage = () => {
      setUserId(localStorage.getItem("userId"));
      setProgram(localStorage.getItem("program"));
    };
    // Listen for storage events (from other tabs) and custom "authChange" event
    window.addEventListener("storage", handleStorage);
    window.addEventListener("authChange", handleStorage);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("authChange", handleStorage);
    };
  }, []);

  // Helper to manually trigger auth update from within the app
  const updateAuth = () => {
    setUserId(localStorage.getItem("userId"));
    setProgram(localStorage.getItem("program"));
    window.dispatchEvent(new Event("authChange"));
  };

  // Expose updateAuth globally for convenience (used in Login/ProgramSelect)
  useEffect(() => {
    window.__updateAuth = updateAuth;
    return () => { delete window.__updateAuth; };
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/success" element={<Success />} />
        <Route path="/cancel" element={<Cancel />} />
        <Route path="/landing" element={<Landing />} />

        {/* Protected routes */}
        <Route
          path="/dashboard"
          element={userId ? <Dashboard /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/program"
          element={userId ? <ProgramSelect /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/session"
          element={
            userId ? (
              program ? (
                <SessionView />
              ) : (
                <Navigate to="/program" replace />
              )
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}