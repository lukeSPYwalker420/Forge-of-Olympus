import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import Home from "./Home";
import Login from "./Login";
import Dashboard from "./Dashboard";
import ProgramSelect from "./ProgramSelect";
import ProgramSelector from "./ProgramSelector";
import SessionView from "./SessionView";
import Success from "./Success";
import Cancel from "./Cancel";
import Landing from "./Landing";

export default function App() {
  // Reactive auth state – updates when localStorage changes
  const [userId, setUserId] = useState(localStorage.getItem("userId"));
  const [program, setProgram] = useState(localStorage.getItem("program"));
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const handleStorage = () => {
      const email = localStorage.getItem("userEmail");
      setUserId(localStorage.getItem("userId"));
      setProgram(localStorage.getItem("program"));
      setIsAdmin(email === "kieren2203@googlemail.com");
    };
    handleStorage(); // initial
    window.addEventListener("storage", handleStorage);
    window.addEventListener("authChange", handleStorage);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("authChange", handleStorage);
    };
  }, []);

  const updateAuth = () => {
    setUserId(localStorage.getItem("userId"));
    setProgram(localStorage.getItem("program"));
    window.dispatchEvent(new Event("authChange"));
  };

  useEffect(() => {
    window.__updateAuth = updateAuth;
    return () => { delete window.__updateAuth; };
  }, []);

  // Shared subscribe handler – used by both Home.jsx and ProgramSelector
  // In App.jsx, replace the existing handleSubscribe with:

const handleSubscribe = async (programName, programData, options = {}) => {
  const { adminBypass = false } = options;
  const userEmail = localStorage.getItem("userEmail");
  const isCurrentAdmin = userEmail === "kieren2203@googlemail.com";

  // Admin bypass: directly assign program with the full programData
  if (adminBypass && isCurrentAdmin) {
    try {
      const res = await fetch("/api/admin/assign-program", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminEmail: userEmail,
          userEmail: userEmail,
          programName: programName,
          programData: programData   // <-- send the full JSON
        })
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem("program", programName);
        localStorage.setItem("programJustSelected", "true");
        // Also store the program config metadata if needed
        if (programData && programData.name) {
          localStorage.setItem("activeProgramConfig", JSON.stringify({
            displayTitle: programData.name,
            programId: programName,
            // you can extract frequency/focus from programData if available
          }));
        }
        window.location.href = "/dashboard";
      } else {
        alert("Admin assignment failed: " + data.error);
      }
    } catch (err) {
      alert("Error: " + err.message);
    }
    return;
  }

  // Normal Stripe flow
  try {
    let email = localStorage.getItem("userEmail");
    if (!email) {
      email = prompt("Enter your email to start your 30‑day free trial:");
      if (!email || !email.includes("@")) {
        alert("Please enter a valid email address");
        return;
      }
      const loginRes = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      const userData = await loginRes.json();
      if (loginRes.ok) {
        localStorage.setItem("userId", userData.userId);
        localStorage.setItem("userEmail", userData.email);
        localStorage.setItem("purchasedPrograms", JSON.stringify(userData.purchasedPrograms));
      } else {
        alert("Error creating account. Please try again.");
        return;
      }
    }

    const response = await fetch("/api/create-checkout-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        programName,
        email,
        programData,                     // <-- send the full JSON
        customMetadata: {
          programId: programData?.name || programName,
          displayTitle: programData?.name || programName,
          // Extract frequency/focus from programData if needed
          frequency: programData?.frequency || null,
          focus: programData?.focus || null
        }
      })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Checkout failed");
    if (data.url) window.location.href = data.url;
    else throw new Error("No checkout URL returned");
  } catch (err) {
    console.error("Checkout error:", err);
    alert(`Error: ${err.message}. Please try again or contact support.`);
  }
};

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home onSubscribe={handleSubscribe} />} />
        <Route path="/login" element={<Login />} />
        <Route path="/success" element={<Success />} />
        <Route path="/cancel" element={<Cancel />} />
        <Route path="/landing" element={<Landing />} />

        {/* Program selection routes */}
        <Route
          path="/program"
          element={userId ? <ProgramSelect /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/select-program"
          element={userId ? <ProgramSelector onSubscribe={handleSubscribe} isAdmin={isAdmin} /> : <Navigate to="/login" replace />}
        />

        {/* Protected routes */}
        <Route
          path="/dashboard"
          element={userId ? <Dashboard /> : <Navigate to="/login" replace />}
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