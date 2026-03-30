import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Login from "./Login";
import Dashboard from "./Dashboard";
import SessionView from "./SessionView";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Dashboard />} />
        <Route path="/session" element={<SessionView />} />
      </Routes>
    </BrowserRouter>
  );
}