import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Home from "./Home";
import Login from "./Login";
import Dashboard from "./Dashboard";
import ProgramSelect from "./ProgramSelect";
import SessionView from "./SessionView";
import Success from "./Success";
import Cancel from "./Cancel";  // ADD THIS IMPORT

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

// Cancel component removed from here (now in its own file)