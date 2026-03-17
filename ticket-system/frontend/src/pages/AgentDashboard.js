import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTickets } from "../hooks/useTickets";
import { ticketAPI } from "../services/api";
import { StatusBadge, PriorityBadge, EmptyState, Spinner, Avatar } from "../components/UI";
import { useToast } from "../components/UI";

const STATUSES = ["open", "in-progress", "resolved", "closed"];
const PRIORITIES = ["urgent", "high", "medium", "low"];

const AgentDashboard = () => {
  const toast = useToast();
  const navigate = useNavigate();
  const [filters, setFilters] = useState({ status: "", priority: "", search: "" });
  const { tickets, stats, loading, fetchTickets } = useTickets({});

  const handleFilter = (key, val) => {
    const updated = { ...filters, [key]: val };
    setFilters(updated);
    fetchTickets({
      status: updated.status || undefined,
      priority: updated.priority || undefined,
      search: updated.search || undefined,
    });
  };

  const handleStatusChange = async (e, ticketId) => {
    e.stopPropagation();
    const status = e.target.value;
    try {
      await ticketAPI.update(ticketId, { status });
      toast.success(`Status updated to ${status}`);
    } catch {
      toast.error("Failed to update status.");
    }
  };

  return (
    <div className="page">
      <div className="container main-content">
        {/* Header */}
        <div className="flex items-center justify-between" style={{ marginBottom: "28px" }}>
          <div>
            <h1 style={{ marginBottom: "4px" }}>Agent Dashboard</h1>
            <p style={{ fontSize: "13px" }}>Manage and resolve all support tickets</p>
          </div>
          <div style={{ display: "flex", gap: "8px", fontSize: "12px", color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>
            <span>LIVE</span>
            <span style={{ color: "var(--green)", animation: "pulse 2s infinite" }}>●</span>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid-4" style={{ marginBottom: "28px" }}>
            <div className="stat-card"><div className="stat-number">{stats.total}</div><div className="stat-label">Total</div></div>
            <div className="stat-card"><div className="stat-number" style={{ color: "var(--blue)" }}>{stats.byStatus.open}</div><div className="stat-label">Open</div></div>
            <div className="stat-card"><div className="stat-number" style={{ color: "var(--yellow)" }}>{stats.byStatus["in-progress"]}</div><div className="stat-label">In Progress</div></div>
            <div className="stat-card"><div className="stat-number" style={{ color: "var(--red)" }}>{stats.byPriority.urgent}</div><div className="stat-label">Urgent</div></div>
          </div>
        )}

        {/* Filters */}
        <div className="flex gap-3" style={{ marginBottom: "20px", flexWrap: "wrap" }}>
          <input
            className="form-input" placeholder="🔍 Search tickets..."
            style={{ flex: 1, minWidth: "200px", maxWidth: "320px" }}
            value={filters.search}
            onChange={(e) => handleFilter("search", e.target.value)}
          />
          <select className="form-select" style={{ width: "150px" }} value={filters.status} onChange={(e) => handleFilter("status", e.target.value)}>
            <option value="">All statuses</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select className="form-select" style={{ width: "150px" }} value={filters.priority} onChange={(e) => handleFilter("priority", e.target.value)}>
            <option value="">All priorities</option>
            {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>

        {/* Table */}
        {loading ? (
          <Spinner center large />
        ) : tickets.length === 0 ? (
          <EmptyState icon="✅" title="No tickets found" message="Try adjusting your filters." />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Ticket ID</th>
                  <th>Title</th>
                  <th>User</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Update Status</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((ticket) => (
                  <tr key={ticket._id} style={{ cursor: "pointer" }}>
                    <td onClick={() => navigate(`/tickets/${ticket._id}`)}>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--text-3)" }}>{ticket.ticketId}</span>
                    </td>
                    <td onClick={() => navigate(`/tickets/${ticket._id}`)}>
                      <div style={{ fontWeight: "500", color: "var(--text-0)", maxWidth: "260px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {ticket.title}
                      </div>
                      <div style={{ fontSize: "11px", color: "var(--text-3)", marginTop: "2px" }}>{ticket.category}</div>
                    </td>
                    <td onClick={() => navigate(`/tickets/${ticket._id}`)}>
                      {ticket.user && (
                        <div className="flex items-center gap-2">
                          <Avatar name={ticket.user.name} size={24} />
                          <span style={{ fontSize: "13px" }}>{ticket.user.name}</span>
                        </div>
                      )}
                    </td>
                    <td onClick={() => navigate(`/tickets/${ticket._id}`)}>
                      <PriorityBadge priority={ticket.priority} />
                    </td>
                    <td onClick={() => navigate(`/tickets/${ticket._id}`)}>
                      <StatusBadge status={ticket.status} />
                    </td>
                    <td onClick={() => navigate(`/tickets/${ticket._id}`)} style={{ fontSize: "12px", color: "var(--text-3)", whiteSpace: "nowrap" }}>
                      {new Date(ticket.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    </td>
                    <td>
                      <select
                        className="form-select" style={{ padding: "5px 8px", fontSize: "12px", width: "130px" }}
                        value={ticket.status}
                        onChange={(e) => handleStatusChange(e, ticket._id)}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AgentDashboard;
