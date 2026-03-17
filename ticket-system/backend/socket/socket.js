const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const logger = require("../middleware/logger");

const initSocket = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || "http://localhost:3000",
      methods: ["GET", "POST"],
      credentials: true,
    },
    pingTimeout: 60000,
  });

  // Optional JWT auth for socket connections
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.user = decoded;
      } catch (_) {
        // Token invalid - allow connection without user context
      }
    }
    next();
  });

  io.on("connection", (socket) => {
    const userId = socket.user?.id || "anonymous";
    logger.info(`Socket connected: ${socket.id} [user: ${userId}]`);

    // Join user-specific room for targeted events
    if (socket.user?.id) {
      socket.join(`user:${socket.user.id}`);
    }

    // Join role-based rooms
    if (socket.user?.role) {
      socket.join(`role:${socket.user.role}`);
    }

    socket.on("joinTicket", (ticketId) => {
      socket.join(`ticket:${ticketId}`);
    });

    socket.on("leaveTicket", (ticketId) => {
      socket.leave(`ticket:${ticketId}`);
    });

    socket.on("disconnect", (reason) => {
      logger.info(`Socket disconnected: ${socket.id} [reason: ${reason}]`);
    });
  });

  return io;
};

module.exports = initSocket;
