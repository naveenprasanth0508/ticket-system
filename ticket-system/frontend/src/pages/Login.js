import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || null;

  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.email || !form.password) { setError("All fields are required."); return; }

    setLoading(true);
    try {
      const data = await login(form.email, form.password);
      const dest = from || (data.user.role === "user" ? "/dashboard" : "/agent");
      navigate(dest, { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px", background: "var(--bg-0)" }}>
      <div style={{ width: "100%", maxWidth: "400px" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{ fontSize: "40px", marginBottom: "12px" }}>🎫</div>
          <h1 style={{ fontFamily: "var(--font-mono)", fontSize: "1.4rem", marginBottom: "6px" }}>SupportDesk</h1>
          <p style={{ fontSize: "14px" }}>Sign in to your account</p>
        </div>

        <div className="card">
          {error && <div className="alert alert-error" style={{ marginBottom: "20px" }}>{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Email address</label>
              <input
                className="form-input" type="email" name="email"
                placeholder="you@example.com" value={form.email}
                onChange={handleChange} autoFocus autoComplete="email"
              />
            </div>
            <div className="form-group" style={{ marginBottom: "24px" }}>
              <label className="form-label">Password</label>
              <input
                className="form-input" type="password" name="password"
                placeholder="••••••••" value={form.password}
                onChange={handleChange} autoComplete="current-password"
              />
            </div>

            <button className="btn btn-primary btn-full btn-lg" type="submit" disabled={loading}>
              {loading ? <><span className="spinner" style={{ width: "16px", height: "16px", borderWidth: "2px" }} /> Signing in...</> : "Sign in"}
            </button>
          </form>
        </div>

        <p style={{ textAlign: "center", marginTop: "20px", fontSize: "14px", color: "var(--text-2)" }}>
          Don't have an account?{" "}
          <Link to="/register" style={{ color: "var(--blue)", fontWeight: "500" }}>Create one</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
