import React, { createContext, useContext, useState, useCallback } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// ─── Protected Route ─────────────────────────────────────────
export const ProtectedRoute = ({ children, roles }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return (
    <div className="spinner-center" style={{ minHeight: "60vh" }}>
      <div className="spinner spinner-lg" />
    </div>
  );

  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;

  if (roles && !roles.includes(user.role)) {
    return <Navigate to={user.role === "user" ? "/dashboard" : "/agent"} replace />;
  }

  return children;
};

// ─── Toast Context ────────────────────────────────────────────
const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = "info") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }, []);

  const toast = {
    success: (msg) => addToast(msg, "success"),
    error: (msg) => addToast(msg, "error"),
    info: (msg) => addToast(msg, "info"),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="toast-container">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.type}`}>
            {t.type === "success" && "✓ "}
            {t.type === "error" && "✕ "}
            {t.type === "info" && "ℹ "}
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
};

// ─── Status/Priority Badge ────────────────────────────────────
export const StatusBadge = ({ status }) => {
  const map = { open: "open", "in-progress": "progress", resolved: "resolved", closed: "closed" };
  return <span className={`badge badge-${map[status] || "closed"}`}>{status}</span>;
};

export const PriorityBadge = ({ priority }) => (
  <span className={`badge badge-${priority}`}>{priority}</span>
);

// ─── Spinner ──────────────────────────────────────────────────
export const Spinner = ({ center, large }) => (
  <div className={center ? "spinner-center" : ""} style={{ display: "inline-flex" }}>
    <div className={`spinner${large ? " spinner-lg" : ""}`} />
  </div>
);

// ─── Empty State ──────────────────────────────────────────────
export const EmptyState = ({ icon = "📭", title, message, action }) => (
  <div className="empty-state">
    <div className="icon">{icon}</div>
    <h3>{title}</h3>
    {message && <p style={{ marginTop: "6px" }}>{message}</p>}
    {action && <div style={{ marginTop: "20px" }}>{action}</div>}
  </div>
);

// ─── Avatar ───────────────────────────────────────────────────
export const Avatar = ({ name = "?", size = 28 }) => (
  <div className="avatar" style={{ width: size, height: size, fontSize: Math.floor(size * 0.38) }}>
    {name.charAt(0).toUpperCase()}
  </div>
);
