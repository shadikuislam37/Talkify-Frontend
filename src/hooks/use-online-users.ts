import { useEffect, useState } from "react";
import { socket } from "@/lib/socket";

export function useOnlineUsers() {
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());

  useEffect(() => {
    // 🌟 ১. সকেট কানেকশন হ্যান্ডলিং
    if (!socket.connected) {
      socket.connect();
    }

    const fetchUsers = () => {
      socket.emit("get_online_users");
    };

    if (socket.connected) {
      fetchUsers();
    } else {
      socket.on("connect", fetchUsers);
    }

    // 🌟 ২. সকেট লিসেনারস
    const handleInitialOnlineUsers = (users: string[]) => {
      if (Array.isArray(users)) {
        setOnlineUsers(new Set(users));
      }
    };

    const handleUserOnline = (data: { userId: string } | string) => {
      const id = typeof data === "string" ? data : data?.userId;
      if (id) {
        setOnlineUsers((prev) => new Set(prev).add(id));
      }
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