import { io } from "socket.io-client";

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || "";

let socket = null;

export const getSocket = () => {
  if (!socket) {
    const token = localStorage.getItem("token");
    socket = io(SOCKET_URL, {
      auth: { token },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socket.on("connect", () => console.log("Socket connected:", socket.id));
    socket.on("disconnect", (reason) => console.log("Socket disconnected:", reason));
    socket.on("connect_error", (err) => console.error("Socket error:", err.message));
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
