import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ticketAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { StatusBadge, PriorityBadge, Avatar, Spinner } from "../components/UI";
import { useToast } from "../components/UI";

const STATUSES = ["open", "in-progress", "resolved", "closed"];

const TicketDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);

  const fetchTicket = useCallback(async () => {
    try {
      const { data } = await ticketAPI.getOne(id);
      setTicket(data.ticket);
    } catch {
      toast.error("Failed to load ticket.");
      navigate(-1);
    } finally {
      setLoading(false);
    }
  }, [id, navigate, toast]);

  useEffect(() => { fetchTicket(); }, [fetchTicket]);

  const handleStatusChange = async (status) => {
    setStatusLoading(true);
    try {
      const { data } = await ticketAPI.update(id, { status });
      setTicket(data.ticket);
      toast.success(`Status updated to ${status}`);
    } catch {
      toast.error("Failed to update status.");
    } finally {
      setStatusLoading(false);
    }
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    setCommentLoading(true);
    try {
      const { data } = await ticketAPI.addComment(id, comment);
      setTicket(data.ticket);
      setComment("");
      toast.success("Comment added.");
    } catch {
      toast.error("Failed to add comment.");
    } finally {
      setCommentLoading(false);
    }
  };

  if (loading) return <div className="spinner-center" style={{ minHeight: "60vh" }}><div className="spinner spinner-lg" /></div>;
  if (!ticket) return null;

  const isAgent = user?.role === "agent" || user?.role === "admin";

  return (
    <div className="page">
      <div className="container main-content" style={{ maxWidth: "800px" }}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)} style={{ marginBottom: "20px" }}>← Back</button>

        {/* Ticket Header */}
        <div className="card" style={{ marginBottom: "20px" }}>
          <div className="flex items-center gap-2" style={{ marginBottom: "12px", flexWrap: "wrap" }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--text-3)" }}>{ticket.ticketId}</span>
            <StatusBadge status={ticket.status} />
            <PriorityBadge priority={ticket.priority} />
            <span className="badge" style={{ background: "var(--bg-3)", color: "var(--text-2)", border: "1px solid var(--border)" }}>{ticket.category}</span>
          </div>

          <h1 style={{ fontSize: "1.3rem", marginBottom: "16px" }}>{ticket.title}</h1>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "16px", marginBottom: "20px" }}>
            <MetaItem label="Submitted by">
              <div className="flex items-center gap-2">
                <Avatar name={ticket.user?.name || "?"} size={20} />
                <span style={{ fontSize: "13px" }}>{ticket.user?.name}</span>
              </div>
            </MetaItem>
            <MetaItem label="Assigned to">
              {ticket.assignedTo
                ? <div className="flex items-center gap-2"><Avatar name={ticket.assignedTo.name} size={20} /><span style={{ fontSize: "13px" }}>{ticket.assignedTo.name}</span></div>
                : <span style={{ fontSize: "13px", color: "var(--text-3)" }}>Unassigned</span>}
            </MetaItem>
            <MetaItem label="Created">
              <span style={{ fontSize: "13px" }}>{new Date(ticket.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</span>
            </MetaItem>
            {ticket.resolvedAt && (
              <MetaItem label="Resolved">
                <span style={{ fontSize: "13px" }}>{new Date(ticket.resolvedAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</span>
              </MetaItem>
            )}
          </div>

          <hr className="divider" />
          <p style={{ fontSize: "14px", color: "var(--text-1)", lineHeight: "1.7", whiteSpace: "pre-wrap" }}>{ticket.description}</p>
        </div>

        {/* Agent: Status Update */}
        {isAgent && (
          <div className="card" style={{ marginBottom: "20px" }}>
            <h3 style={{ marginBottom: "14px", fontSize: "14px" }}>Update Status</h3>
            <div className="flex gap-2" style={{ flexWrap: "wrap" }}>
              {STATUSES.map((s) => (
                <button
                  key={s}
                  className={`btn btn-sm ${ticket.status === s ? "btn-primary" : "btn-secondary"}`}
                  onClick={() => handleStatusChange(s)}
                  disabled={statusLoading || ticket.status === s}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Comments */}
        <div className="card">
          <h3 style={{ marginBottom: "20px", fontSize: "14px" }}>Comments ({ticket.comments?.length || 0})</h3>

          {ticket.comments?.length > 0 ? (
            <div style={{ marginBottom: "24px" }}>
              {ticket.comments.map((c, i) => (
                <div key={i} className="comment fade-in">
                  <div className="comment-meta flex items-center gap-2">
                    <Avatar name={c.author?.name || "?"} size={22} />
                    <strong style={{ color: "var(--text-1)", fontSize: "13px" }}>{c.author?.name}</strong>
                    <span className={`badge badge-${c.author?.role}`} style={{ padding: "1px 5px", fontSize: "10px" }}>{c.author?.role}</span>
                    <span>· {new Date(c.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                  <div className="comment-body" style={{ paddingLeft: "30px" }}>{c.text}</div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: "13px", color: "var(--text-3)", marginBottom: "20px" }}>No comments yet.</p>
          )}

          {/* Add comment */}
          <form onSubmit={handleComment}>
            <textarea
              className="form-textarea" placeholder="Add a comment..." value={comment}
              onChange={(e) => setComment(e.target.value)} style={{ minHeight: "80px", marginBottom: "10px" }}
            />
            <button className="btn btn-primary btn-sm" type="submit" disabled={commentLoading || !comment.trim()}>
              {commentLoading ? "Posting..." : "Post Comment"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

const MetaItem = ({ label, children }) => (
  <div>
    <div style={{ fontSize: "11px", color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "5px" }}>{label}</div>
    {children}
  </div>
);

export default TicketDetail;
