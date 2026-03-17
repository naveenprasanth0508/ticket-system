import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ToastProvider } from "./components/UI";
import { ProtectedRoute } from "./components/UI";
import Navbar from "./components/Navbar";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import AgentDashboard from "./pages/AgentDashboard";
import CreateTicket from "./pages/CreateTicket";
import TicketDetail from "./pages/TicketDetail";
import "./index.css";

const HomeRedirect = () => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === "user" ? "/dashboard" : "/agent"} replace />;
};

const AppRoutes = () => (
  <>
    <Navbar />
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route path="/dashboard" element={
        <ProtectedRoute roles={["user", "agent", "admin"]}>
          <Dashboard />
        </ProtectedRoute>
      } />

      <Route path="/agent" element={
        <ProtectedRoute roles={["agent", "admin"]}>
          <AgentDashboard />
        </ProtectedRoute>
      } />

      <Route path="/tickets/new" element={
        <ProtectedRoute roles={["user"]}>
          <CreateTicket />
        </ProtectedRoute>
      } />

      <Route path="/tickets/:id" element={
        <ProtectedRoute>
          <TicketDetail />
        </ProtectedRoute>
      } />

      <Route path="*" element={
        <div style={{ minHeight: "60vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "16px" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "4rem", color: "var(--text-3)" }}>404</div>
          <p>Page not found.</p>
          <button className="btn btn-secondary" onClick={() => window.history.back()}>Go back</button>
        </div>
      } />
    </Routes>
  </>
);

const App = () => (
  <BrowserRouter>
    <AuthProvider>
      <ToastProvider>
        <AppRoutes />
      </ToastProvider>
    </AuthProvider>
  </BrowserRouter>
);

export default App;
