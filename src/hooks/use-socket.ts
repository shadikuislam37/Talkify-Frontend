import { useEffect } from "react";
import { socket } from "@/lib/socket";

export function useSocket(conversationId?: string) {
  useEffect(() => {
    if (!socket.connected) {
      socket.connect();
    }

    const joinRoom = () => {
      if (conversationId) {
        socket.emit("join_conversation", { conversationId });
      }
    };

    // সকেট অলরেডি কানেক্টেড থাকলে সাথে সাথে জয়েন করবে, 
    // অন্যথায় কানেক্ট হওয়া মাত্রই জয়েন করবে
    if (socket.connected) {
      joinRoom();
    } else {
      socket.once("connect", joinRoom);
    }

    return () => {
      socket.off("connect", joinRoom);
      if (conversationId && socket.connected) {
        socket.emit("leave_conversation", { conversationId });
      }
    };
  }, [conversationId]);

  return { socket };
}