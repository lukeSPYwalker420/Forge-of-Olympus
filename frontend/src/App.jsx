import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Home from "./Home";
import Login from "./Login";
import Dashboard from "./Dashboard";
import ProgramSelect from "./ProgramSelect";
import SessionView from "./SessionView";

export default function App() {
  const userId = localStorage.getItem("userId");
  const program = localStorage.getItem("program");

  return (
    <BrowserRouter>
    <ErrorBoundary>
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
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
      </ErrorBoundary>
    </BrowserRouter>
  );
}