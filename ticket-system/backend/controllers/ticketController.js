const Ticket = require("../models/Ticket");
const User = require("../models/User");
const emailService = require("../services/emailService");
const logger = require("../middleware/logger");

const populate = [
  { path: "user", select: "name email avatar" },
  { path: "assignedTo", select: "name email avatar" },
  { path: "comments.author", select: "name email avatar role" },
];

// @desc    Create ticket
// @route   POST /api/tickets
// @access  Private (user)
const createTicket = async (req, res, next) => {
  try {
    const { title, description, priority, category } = req.body;

    const ticket = await Ticket.create({
      title,
      description,
      priority: priority || "medium",
      category: category || "general",
      user: req.user._id,
    });

    const populated = await ticket.populate(populate);

    // Socket event
    if (req.io) {
      req.io.emit("ticketCreated", { ticket: populated });
    }

    // Email notification (non-blocking)
    emailService.sendTicketCreatedEmail(req.user, populated).catch((err) => {
      logger.error(`Email error on ticket create: ${err.message}`);
    });

    logger.info(`Ticket created: ${populated.ticketId} by ${req.user.email}`);

    res.status(201).json({ success: true, ticket: populated });
  } catch (err) {
    next(err);
  }
};

// @desc    Get tickets
// @route   GET /api/tickets
// @access  Private
const getTickets = async (req, res, next) => {
  try {
    const { status, priority, category, page = 1, limit = 20, search } = req.query;

    const filter = {};

    // Users only see their own tickets; agents/admins see all
    if (req.user.role === "user") {
      filter.user = req.user._id;
    }

    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (category) filter.category = category;
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { ticketId: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const total = await Ticket.countDocuments(filter);
    const tickets = await Ticket.find(filter)
      .populate(populate)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    res.json({
      success: true,
      count: tickets.length,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      tickets,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single ticket
// @route   GET /api/tickets/:id
// @access  Private
const getTicket = async (req, res, next) => {
  try {
    const ticket = await Ticket.findById(req.params.id).populate(populate);

    if (!ticket) {
      return res.status(404).json({ success: false, message: "Ticket not found." });
    }

    // Users can only see their own tickets
    if (req.user.role === "user" && ticket.user._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "Not authorized." });
    }

    res.json({ success: true, ticket });
  } catch (err) {
    next(err);
  }
};

// @desc    Update ticket
// @route   PUT /api/tickets/:id
// @access  Private
const updateTicket = async (req, res, next) => {
  try {
    const ticket = await Ticket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({ success: false, message: "Ticket not found." });
    }

    // Users can only update their own tickets (and only title/desc/priority)
    if (req.user.role === "user") {
      if (ticket.user.toString() !== req.user._id.toString()) {
        return res.status(403).json({ success: false, message: "Not authorized." });
      }
      const { title, description, priority } = req.body;
      if (title) ticket.title = title;
      if (description) ticket.description = description;
      if (priority) ticket.priority = priority;
    } else {
      // Agent/admin can update everything
      const { status, assignedTo, priority, category } = req.body;
      if (status) ticket.status = status;
      if (assignedTo !== undefined) ticket.assignedTo = assignedTo || null;
      if (priority) ticket.priority = priority;
      if (category) ticket.category = category;
    }

    await ticket.save();
    const populated = await ticket.populate(populate);

    // Socket event
    if (req.io) {
      req.io.emit("ticketUpdated", { ticket: populated });
    }

    // Email notification (non-blocking)
    emailService.sendTicketUpdatedEmail(populated).catch((err) => {
      logger.error(`Email error on ticket update: ${err.message}`);
    });

    logger.info(`Ticket updated: ${populated.ticketId} by ${req.user.email}`);

    res.json({ success: true, ticket: populated });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete ticket
// @route   DELETE /api/tickets/:id
// @access  Private (agent/admin or owner)
const deleteTicket = async (req, res, next) => {
  try {
    const ticket = await Ticket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({ success: false, message: "Ticket not found." });
    }

    if (req.user.role === "user" && ticket.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "Not authorized." });
    }

    await ticket.deleteOne();
    logger.info(`Ticket deleted: ${ticket.ticketId} by ${req.user.email}`);

    if (req.io) {
      req.io.emit("ticketDeleted", { ticketId: ticket._id });
    }

    res.json({ success: true, message: "Ticket deleted." });
  } catch (err) {
    next(err);
  }
};

// @desc    Add comment to ticket
// @route   POST /api/tickets/:id/comments
// @access  Private
const addComment = async (req, res, next) => {
  try {
    const { text } = req.body;
    if (!text?.trim()) {
      return res.status(400).json({ success: false, message: "Comment text is required." });
    }

    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ success: false, message: "Ticket not found." });
    }

    if (req.user.role === "user" && ticket.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "Not authorized." });
    }

    ticket.comments.push({ author: req.user._id, text: text.trim() });
    await ticket.save();
    const populated = await ticket.populate(populate);

    if (req.io) {
      req.io.emit("commentAdded", { ticket: populated });
    }

    res.status(201).json({ success: true, ticket: populated });
  } catch (err) {
    next(err);
  }
};

// @desc    Get ticket stats (agent/admin)
// @route   GET /api/tickets/stats
// @access  Private (agent/admin)
const getStats = async (req, res, next) => {
  try {
    const filter = req.user.role === "user" ? { user: req.user._id } : {};

    const [statusStats, priorityStats, total] = await Promise.all([
      Ticket.aggregate([
        { $match: filter },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      Ticket.aggregate([
        { $match: filter },
        { $group: { _id: "$priority", count: { $sum: 1 } } },
      ]),
      Ticket.countDocuments(filter),
    ]);

    const byStatus = { open: 0, "in-progress": 0, resolved: 0, closed: 0 };
    statusStats.forEach(({ _id, count }) => { if (_id) byStatus[_id] = count; });

    const byPriority = { low: 0, medium: 0, high: 0, urgent: 0 };
    priorityStats.forEach(({ _id, count }) => { if (_id) byPriority[_id] = count; });

    res.json({ success: true, stats: { total, byStatus, byPriority } });
  } catch (err) {
    next(err);
  }
};

module.exports = { createTicket, getTickets, getTicket, updateTicket, deleteTicket, addComment, getStats };
