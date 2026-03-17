import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Register = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "user" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.name || !form.email || !form.password) { setError("All fields are required."); return; }
    if (form.password.length < 6) { setError("Password must be at least 6 characters."); return; }

    setLoading(true);
    try {
      const data = await register(form);
      navigate(data.user.role === "user" ? "/dashboard" : "/agent", { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px", background: "var(--bg-0)" }}>
      <div style={{ width: "100%", maxWidth: "420px" }}>
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{ fontSize: "40px", marginBottom: "12px" }}>🎫</div>
          <h1 style={{ fontFamily: "var(--font-mono)", fontSize: "1.4rem", marginBottom: "6px" }}>SupportDesk</h1>
          <p style={{ fontSize: "14px" }}>Create your account</p>
        </div>

        <div className="card">
          {error && <div className="alert alert-error" style={{ marginBottom: "20px" }}>{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Full name</label>
              <input className="form-input" type="text" name="name" placeholder="John Doe" value={form.name} onChange={handleChange} autoFocus />
            </div>
            <div className="form-group">
              <label className="form-label">Email address</label>
              <input className="form-input" type="email" name="email" placeholder="you@example.com" value={form.email} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input className="form-input" type="password" name="password" placeholder="Min. 6 characters" value={form.password} onChange={handleChange} />
            </div>
            <div className="form-group" style={{ marginBottom: "24px" }}>
              <label className="form-label">Role</label>
              <select className="form-select" name="role" value={form.role} onChange={handleChange}>
                <option value="user">User — submit support tickets</option>
                <option value="agent">Agent — manage and resolve tickets</option>
              </select>
            </div>

            <button className="btn btn-primary btn-full btn-lg" type="submit" disabled={loading}>
              {loading ? <><span className="spinner" style={{ width: "16px", height: "16px", borderWidth: "2px" }} /> Creating account...</> : "Create account"}
            </button>
          </form>
        </div>

        <p style={{ textAlign: "center", marginTop: "20px", fontSize: "14px", color: "var(--text-2)" }}>
          Already have an account?{" "}
          <Link to="/login" style={{ color: "var(--blue)", fontWeight: "500" }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
