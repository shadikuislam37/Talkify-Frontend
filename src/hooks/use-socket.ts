import { useEffect } from "react";
import { socket } from "@/lib/socket";
import { useQueryClient } from "@tanstack/react-query";
import { playNotificationSound, sendPushNotification } from "@/lib/notification";

export function useSocket(conversationId?: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!socket.connected) {
      socket.connect();
    }

    const joinRoom = () => {
      if (conversationId && socket.connected) {
        socket.emit("join_conversation", { conversationId });
      }
    };

    if (socket.connected) {
      joinRoom();
    }

    socket.on("connect", joinRoom);

    // 🌟 রিয়েল-টাইম মেসেজ হ্যান্ডলার
    const handleReceiveMessage = (message: any) => {
      // মেসেজ আসার সাথে সাথে সাউন্ড ও নোটিফিকেশন বাজাবে
      playNotificationSound();
      sendPushNotification(
        message.sender?.name || "New Message",
        message.body || "Sent an attachment"
      );

      // TanStack Query Cache আপডেট
      queryClient.invalidateQueries({
        queryKey: ["messages", message.conversationId],
      });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    };

    // 🌟 রিঅ্যাকশন বা ডিলিট হলে ক্যাস ইনভ্যালিডেট
    const handleReaction = () => {
      queryClient.invalidateQueries({ queryKey: ["messages"] });
    };

    socket.on("receive_message", handleReceiveMessage);
    socket.on("receive_reaction", handleReaction);
    socket.on("on_message_deleted", handleReaction);

    return () => {
      socket.off("connect", joinRoom);
      socket.off("receive_message", handleReceiveMessage);
      socket.off("receive_reaction", handleReaction);
      socket.off("on_message_deleted", handleReaction);

      if (conversationId && socket.connected) {
        socket.emit("leave_conversation", { conversationId });
      }
    };
  }, [conversationId, queryClient]);

  return { socket };
}