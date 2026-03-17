import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav style={{
      background: "var(--bg-1)",
      borderBottom: "1px solid var(--border)",
      position: "sticky", top: 0, zIndex: 100,
    }}>
      <div className="container" style={{ display: "flex", alignItems: "center", height: "56px", gap: "24px" }}>
        {/* Logo */}
        <Link to="/" style={{ display: "flex", alignItems: "center", gap: "8px", textDecoration: "none" }}>
          <span style={{ fontSize: "18px" }}>🎫</span>
          <span style={{ fontFamily: "var(--font-mono)", fontWeight: "700", fontSize: "14px", color: "var(--text-0)", letterSpacing: "-0.02em" }}>
            SupportDesk
          </span>
        </Link>

        {/* Nav links */}
        {user && (
          <div style={{ display: "flex", gap: "4px", flex: 1 }}>
            {user.role === "user" && (
              <>
                <NavLink to="/dashboard" active={isActive("/dashboard")}>Dashboard</NavLink>
                <NavLink to="/tickets/new" active={isActive("/tickets/new")}>New Ticket</NavLink>
              </>
            )}
            {(user.role === "agent" || user.role === "admin") && (
              <>
                <NavLink to="/agent" active={isActive("/agent")}>All Tickets</NavLink>
                <NavLink to="/dashboard" active={isActive("/dashboard")}>My View</NavLink>
              </>
            )}
          </div>
        )}

        {/* Right side */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginLeft: "auto" }}>
          {user ? (
            <div style={{ position: "relative" }}>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                style={{
                  display: "flex", alignItems: "center", gap: "8px",
                  background: "var(--bg-3)", border: "1px solid var(--border)",
                  borderRadius: "var(--radius)", padding: "5px 10px",
                  cursor: "pointer", color: "var(--text-1)", fontSize: "13px",
                }}
              >
                <div className="avatar" style={{ width: "22px", height: "22px", fontSize: "9px" }}>
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <span style={{ maxWidth: "100px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {user.name}
                </span>
                <span className={`badge badge-${user.role}`} style={{ padding: "1px 6px" }}>{user.role}</span>
              </button>

              {menuOpen && (
                <div
                  style={{
                    position: "absolute", right: 0, top: "calc(100% + 6px)",
                    background: "var(--bg-2)", border: "1px solid var(--border)",
                    borderRadius: "var(--radius-lg)", minWidth: "160px",
                    boxShadow: "var(--shadow-lg)", overflow: "hidden", zIndex: 200,
                  }}
                  onMouseLeave={() => setMenuOpen(false)}
                >
                  <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--border)" }}>
                    <div style={{ fontSize: "12px", color: "var(--text-0)", fontWeight: "600" }}>{user.name}</div>
                    <div style={{ fontSize: "11px", color: "var(--text-3)", marginTop: "2px" }}>{user.email}</div>
                  </div>
                  <button onClick={handleLogout} style={{
                    width: "100%", padding: "10px 14px", background: "none", border: "none",
                    color: "var(--red)", fontSize: "13px", cursor: "pointer", textAlign: "left",
                    transition: "background 0.1s",
                  }}
                    onMouseEnter={(e) => e.target.style.background = "var(--red-bg)"}
                    onMouseLeave={(e) => e.target.style.background = "none"}
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link to="/login"><button className="btn btn-ghost btn-sm">Sign in</button></Link>
              <Link to="/register"><button className="btn btn-primary btn-sm">Register</button></Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

const NavLink = ({ to, active, children }) => (
  <Link to={to} style={{ textDecoration: "none" }}>
    <button style={{
      background: active ? "var(--bg-3)" : "none",
      border: active ? "1px solid var(--border)" : "1px solid transparent",
      borderRadius: "var(--radius)", padding: "5px 10px", cursor: "pointer",
      color: active ? "var(--text-0)" : "var(--text-2)", fontSize: "13px", fontWeight: "500",
      transition: "all 0.15s",
    }}>
      {children}
    </button>
  </Link>
);

export default Navbar;
