const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema(
  {
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, required: true, maxlength: 2000 },
  },
  { timestamps: true }
);

const ticketSchema = new mongoose.Schema(
  {
    ticketId: {
      type: String,
      unique: true,
    },
    title: {
      type: String,
      required: [true, "Title is required."],
      trim: true,
      minlength: [5, "Title must be at least 5 characters."],
      maxlength: [120, "Title cannot exceed 120 characters."],
    },
    description: {
      type: String,
      required: [true, "Description is required."],
      minlength: [10, "Description must be at least 10 characters."],
      maxlength: [5000, "Description cannot exceed 5000 characters."],
    },
    status: {
      type: String,
      enum: ["open", "in-progress", "resolved", "closed"],
      default: "open",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },
    category: {
      type: String,
      enum: ["technical", "billing", "general", "feature-request", "bug"],
      default: "general",
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    comments: [commentSchema],
    attachments: [
      {
        filename: String,
        url: String,
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    resolvedAt: { type: Date },
    closedAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

// Auto-generate ticket ID before saving
ticketSchema.pre("save", async function (next) {
  if (!this.ticketId) {
    const count = await mongoose.model("Ticket").countDocuments();
    this.ticketId = `TKT-${String(count + 1).padStart(5, "0")}`;
  }
  if (this.isModified("status")) {
    if (this.status === "resolved") this.resolvedAt = new Date();
    if (this.status === "closed") this.closedAt = new Date();
  }
  next();
});

// Indexes for fast queries
ticketSchema.index({ user: 1, status: 1 });
ticketSchema.index({ assignedTo: 1, status: 1 });
ticketSchema.index({ status: 1, createdAt: -1 });
ticketSchema.index({ ticketId: 1 });

module.exports = mongoose.model("Ticket", ticketSchema);
