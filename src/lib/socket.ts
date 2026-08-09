import { io, Socket } from "socket.io-client";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5000";

export const socket: Socket = io(SOCKET_URL, {
  autoConnect: false,
  withCredentials: true,
});

socket.on("connect", () => {
  console.log("✅ CONNECTED");
  socket.emit("get_online_users");
});

socket.on("connect_error", (e) => {
  console.log("❌ FAILED:", e.message);
});