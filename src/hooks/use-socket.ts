import { useEffect } from "react";
import { socket } from "@/lib/socket";

export function useSocket(conversationId?: string) {
  useEffect(() => {
    // ১. সকেট কানেক্ট না থাকলে কানেক্ট করা
    if (!socket.connected) {
      socket.connect();
    }

    const joinRoom = () => {
      if (conversationId && socket.connected) {
        socket.emit("join_conversation", { conversationId });
      }
    };

    // ২. যদি অলরেডি কানেক্টেড থাকে
    if (socket.connected) {
      joinRoom();
    }

    // 🌟 ৩. ডিসকানেক্ট হয়ে আবার রি-কানেক্ট হলে যাতে অটোমেটিক রুমে জয়েন করে
    socket.on("connect", joinRoom);

    // ৪. ক্লিনআপ ফাংশন
    return () => {
      socket.off("connect", joinRoom);
      if (conversationId && socket.connected) {
        socket.emit("leave_conversation", { conversationId });
      }
    };
  }, [conversationId]);

  return { socket };
}