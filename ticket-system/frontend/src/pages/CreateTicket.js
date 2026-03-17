import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ticketAPI } from "../services/api";
import { useToast } from "../components/UI";

const CATEGORIES = ["general", "technical", "billing", "feature-request", "bug"];
const PRIORITIES = ["low", "medium", "high", "urgent"];

const CreateTicket = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [form, setForm] = useState({ title: "", description: "", priority: "medium", category: "general" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.title.trim() || !form.description.trim()) { setError("Title and description are required."); return; }
    if (form.title.length < 5) { setError("Title must be at least 5 characters."); return; }
    if (form.description.length < 10) { setError("Description must be at least 10 characters."); return; }

    setLoading(true);
    try {
      const { data } = await ticketAPI.create(form);
      toast.success(`Ticket ${data.ticket.ticketId} created!`);
      navigate(`/tickets/${data.ticket._id}`);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create ticket.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="container main-content" style={{ maxWidth: "680px" }}>
        <div style={{ marginBottom: "24px" }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)} style={{ marginBottom: "16px" }}>← Back</button>
          <h1 style={{ marginBottom: "4px" }}>Create Support Ticket</h1>
          <p style={{ fontSize: "14px" }}>Describe your issue in detail so our team can help you faster.</p>
        </div>

        <div className="card">
          {error && <div className="alert alert-error" style={{ marginBottom: "20px" }}>{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Title <span style={{ color: "var(--red)" }}>*</span></label>
              <input className="form-input" name="title" placeholder="Brief summary of your issue" value={form.title} onChange={handleChange} maxLength={120} autoFocus />
              <span className="form-hint">{form.title.length}/120 characters</span>
            </div>

            <div className="grid-2" style={{ gap: "12px" }}>
              <div className="form-group">
                <label className="form-label">Category</label>
                <select className="form-select" name="category" value={form.category} onChange={handleChange}>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1).replace("-", " ")}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Priority</label>
                <select className="form-select" name="priority" value={form.priority} onChange={handleChange}>
                  {PRIORITIES.map((p) => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                </select>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: "24px" }}>
              <label className="form-label">Description <span style={{ color: "var(--red)" }}>*</span></label>
              <textarea
                className="form-textarea" name="description"
                placeholder="Describe your issue in detail. Include steps to reproduce, expected behavior, error messages, etc."
                value={form.description} onChange={handleChange}
                maxLength={5000} style={{ minHeight: "160px" }}
              />
              <span className="form-hint">{form.description.length}/5000 characters</span>
            </div>

            <div className="flex gap-3">
              <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
                {loading ? <><span className="spinner" style={{ width: "16px", height: "16px", borderWidth: "2px" }} /> Submitting...</> : "Submit Ticket"}
              </button>
              <button type="button" className="btn btn-secondary btn-lg" onClick={() => navigate(-1)}>Cancel</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateTicket;
