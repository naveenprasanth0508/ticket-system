const express = require("express");
const router = express.Router();
const {
  createTicket,
  getTickets,
  getTicket,
  updateTicket,
  deleteTicket,
  addComment,
  getStats,
} = require("../controllers/ticketController");
const { protect, authorize } = require("../middleware/auth");

// Inject io into req
router.use((req, res, next) => {
  req.io = req.app.get("io");
  next();
});

router.get("/stats", protect, getStats);
router.route("/").get(protect, getTickets).post(protect, authorize("user"), createTicket);
router.route("/:id").get(protect, getTicket).put(protect, updateTicket).delete(protect, deleteTicket);
router.post("/:id/comments", protect, addComment);

module.exports = router;
