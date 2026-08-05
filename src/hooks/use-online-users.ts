import { useEffect, useState } from "react";
import { socket } from "@/lib/socket";

export function useOnlineUsers() {
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());

useEffect(() => {
  if (!socket.connected) {
    socket.connect();
  }

  const fetchUsers = () => {
    socket.emit("get_online_users");
  };

  // 🌟 ফিক্স: প্রথম connect আর প্রতিটা reconnect - দুটোতেই যেন resync হয়
  socket.on("connect", fetchUsers);
  if (socket.connected) {
    fetchUsers(); // প্রথমবার mount-এ যদি আগে থেকেই connected থাকে
  }

  const handleInitialOnlineUsers = (users: string[]) => {
    if (Array.isArray(users)) {
      setOnlineUsers(new Set(users));
    }
  };

  const handleUserOnline = (data: { userId: string } | string) => {
    const id = typeof data === "string" ? data : data?.userId;
    if (id) setOnlineUsers((prev) => new Set(prev).add(id));
  };

  const handleUserOffline = (data: { userId: string } | string) => {
    const id = typeof data === "string" ? data : data?.userId;
    if (id) {
      setOnlineUsers((prev) => {
        const updated = new Set(prev);
        updated.delete(id);
        return updated;
      });
    }
  };

  socket.on("get_online_users", handleInitialOnlineUsers);
  socket.on("user_online", handleUserOnline);
  socket.on("user_offline", handleUserOffline);

  return () => {
    socket.off("connect", fetchUsers);
    socket.off("get_online_users", handleInitialOnlineUsers);
    socket.off("user_online", handleUserOnline);
    socket.off("user_offline", handleUserOffline);
  };
}, []);

  return onlineUsers;
}