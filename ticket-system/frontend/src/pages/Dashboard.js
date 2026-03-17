import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTickets } from "../hooks/useTickets";
import { ticketAPI } from "../services/api";
import { StatusBadge, PriorityBadge, EmptyState, Spinner } from "../components/UI";
import { useToast } from "../components/UI";

const STATUSES = ["", "open", "in-progress", "resolved", "closed"];

const Dashboard = () => {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [activeStatus, setActiveStatus] = useState("");
  const { tickets, stats, loading, error, fetchTickets } = useTickets({ status: activeStatus || undefined });

  const handleStatusFilter = (s) => {
    setActiveStatus(s);
    fetchTickets({ status: s || undefined });
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm("Delete this ticket?")) return;
    try {
      await ticketAPI.delete(id);
      toast.success("Ticket deleted.");
      fetchTickets();
    } catch {
      toast.error("Failed to delete ticket.");
    }
  };

  return (
    <div className="page">
      <div className="container main-content">
        {/* Header */}
        <div className="flex items-center justify-between" style={{ marginBottom: "28px" }}>
          <div>
            <h1 style={{ marginBottom: "4px" }}>My Tickets</h1>
            <p style={{ fontSize: "13px" }}>Welcome back, <strong style={{ color: "var(--text-0)" }}>{user?.name}</strong></p>
          </div>
          <Link to="/tickets/new">
            <button className="btn btn-primary">+ New Ticket</button>
          </Link>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid-4" style={{ marginBottom: "28px" }}>
            {[
              { label: "Total", value: stats.total, color: "var(--text-0)" },
              { label: "Open", value: stats.byStatus.open, color: "var(--blue)" },
              { label: "In Progress", value: stats.byStatus["in-progress"], color: "var(--yellow)" },
              { label: "Resolved", value: stats.byStatus.resolved, color: "var(--green)" },
            ].map(({ label, value, color }) => (
              <div key={label} className="stat-card">
                <div className="stat-number" style={{ color }}>{value}</div>
                <div className="stat-label">{label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Filters */}
        <div className="filter-bar">
          {STATUSES.map((s) => (
            <button key={s} className={`filter-pill ${activeStatus === s ? "active" : ""}`} onClick={() => handleStatusFilter(s)}>
              {s || "All"}
            </button>
          ))}
        </div>

        {/* Ticket List */}
        <div className="card" style={{ padding: 0 }}>
          {loading ? (
            <Spinner center large />
          ) : error ? (
            <div className="alert alert-error" style={{ margin: "24px" }}>{error}</div>
          ) : tickets.length === 0 ? (
            <EmptyState
              icon="🎫"
              title="No tickets yet"
              message="Create your first support ticket to get started."
              action={<Link to="/tickets/new"><button className="btn btn-primary">Create ticket</button></Link>}
            />
          ) : (
            tickets.map((ticket) => (
              <div key={ticket._id} className="ticket-row fade-in" onClick={() => navigate(`/tickets/${ticket._id}`)}>
                <div className="ticket-id">{ticket.ticketId}</div>
                <div>
                  <div style={{ fontWeight: "500", color: "var(--text-0)", fontSize: "14px", marginBottom: "4px" }}>{ticket.title}</div>
                  <div style={{ fontSize: "12px", color: "var(--text-3)" }}>
                    {new Date(ticket.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    {ticket.assignedTo && <span> · Assigned to {ticket.assignedTo.name}</span>}
                  </div>
                </div>
                <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                  <PriorityBadge priority={ticket.priority} />
                  <StatusBadge status={ticket.status} />
                </div>
                <button className="btn btn-ghost btn-sm btn-icon" onClick={(e) => handleDelete(e, ticket._id)} title="Delete" style={{ color: "var(--text-3)" }}>✕</button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
