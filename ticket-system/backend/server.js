require("dotenv").config();
const express = require("express");
const http = require("http");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const connectDB = require("./config/db");
const initSocket = require("./socket/socket");
const logger = require("./middleware/logger");
const { requestLogger } = require("./middleware/logger");
const { notFound, errorHandler } = require("./middleware/errorHandler");

const authRoutes = require("./routes/authRoutes");
const ticketRoutes = require("./routes/ticketRoutes");

// ─── App Setup ────────────────────────────────────────────────
const app = express();
const httpServer = http.createServer(app);

// ─── Socket.io ───────────────────────────────────────────────
const io = initSocket(httpServer);
app.set("io", io);

// ─── Connect Database ─────────────────────────────────────────
connectDB();

// ─── Security Middleware ──────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));

app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:3000",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

// ─── Rate Limiting ────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  message: { success: false, message: "Too many requests. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/", limiter);

// ─── Body Parsing ─────────────────────────────────────────────
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ─── Request Logger ───────────────────────────────────────────
app.use(requestLogger);

// ─── Health Check ─────────────────────────────────────────────
app.get("/api/health", (req, res) => {
  const mongoose = require("mongoose");
  res.json({
    success: true,
    status: "OK",
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    database: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    version: require("./package.json").version,
  });
});

// ─── Routes ───────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/tickets", ticketRoutes);

// ─── Error Handling ───────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ─── Start Server ─────────────────────────────────────────────
const PORT = parseInt(process.env.PORT) || 5000;
httpServer.listen(PORT, "0.0.0.0", () => {
  logger.info(`Server running on port ${PORT} [${process.env.NODE_ENV || "development"}]`);
});

// ─── Graceful Shutdown ────────────────────────────────────────
const shutdown = (signal) => {
  logger.info(`${signal} received. Shutting down gracefully...`);
  httpServer.close(() => {
    logger.info("HTTP server closed.");
    process.exit(0);
  });
};
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("unhandledRejection", (err) => {
  logger.error(`Unhandled rejection: ${err.message}`);
  process.exit(1);
});

module.exports = { app, httpServer };
