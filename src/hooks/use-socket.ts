import { useEffect } from "react";
import { socket } from "@/lib/socket";
import { useQueryClient } from "@tanstack/react-query";
import { playNotificationSound, sendPushNotification } from "@/lib/notification";
import { Message } from "@/types";

export function useSocket(conversationId?: string, currentUserId?: string) {
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

    // 🌟 ১. রিয়েল-টাইম নতুন মেসেজ হ্যান্ডলার
    const handleReceiveMessage = (newMessage: Message) => {
      const isMyMessage = String(newMessage.senderId || newMessage.sender?.id) === String(currentUserId);

      // নিজের মেসেজ না হলেই কেবল নোটিফিকেশন ও সাউন্ড বাজবে
      if (!isMyMessage) {
        playNotificationSound();
        sendPushNotification(
          newMessage.sender?.name || "New Message",
          newMessage.body || "Sent an attachment"
        );
      }

      // TanStack Query Optimistic Update (ইনস্ট্যান্ট স্ক্রিনে মেসেজ দেখানোর জন্য)
      queryClient.setQueryData(["messages", newMessage.conversationId], (oldData: any) => {
        if (!oldData) return oldData;
        const newPages = [...oldData.pages];
        if (newPages.length > 0) {
          // ডুপ্লিকেট মেসেজ রোধ করে শীর্ষে যুক্ত করা
          const exists = newPages[0].some((m: Message) => m.id === newMessage.id);
          if (!exists) {
            newPages[0] = [newMessage, ...newPages[0]];
          }
        }
        return { ...oldData, pages: newPages };
      });

      // কনভারসেশন লিস্টের লাস্ট মেসেজ আপডেট
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    };

    // 🌟 ২. রিয়েল-টাইম রিঅ্যাকশন হ্যান্ডলার (Reaction Fix)
   // 🌟 রিয়েল-টাইম রিয়েকশন রিসিভ করার লিসেনার
const handleReceiveReaction = (data: { messageId: string; reaction: any }) => {
  queryClient.setQueryData(["messages", conversationId], (oldData: any) => {
    if (!oldData) return oldData;

    return {
      ...oldData,
      pages: oldData.pages.map((page: Message[]) =>
        page.map((msg) => {
          if (msg.id === data.messageId) {
            const currentReactions = msg.reactions || [];
            const existingIndex = currentReactions.findIndex(
              (r: any) => String(r.userId) === String(data.reaction.userId)
            );

            let updatedReactions = [...currentReactions];
            if (existingIndex > -1) {
              if (!data.reaction.emoji) {
                updatedReactions.splice(existingIndex, 1); // ইমোজি রিমুভ হলে
              } else {
                updatedReactions[existingIndex] = data.reaction; // আপডেট হলে
              }
            } else if (data.reaction.emoji) {
              updatedReactions.push(data.reaction); // নতুন রিঅ্যাকশন হলে
            }

            return { ...msg, reactions: updatedReactions };
          }
          return msg;
        })
      ),
    };
  });
};

socket.on("receive_reaction", handleReceiveReaction);

// ক্লিনআপ ফাংশনে অফ করে দেওয়া
return () => {
  socket.off("receive_reaction", handleReceiveReaction);
};

    // 🌟 ৩. মেসেজ ডিলিট হ্যান্ডলার
    const handleMessageDeleted = (data: { messageId: string; conversationId: string }) => {
      const targetConvId = data.conversationId || conversationId;
      if (!targetConvId) return;

      queryClient.setQueryData(["messages", targetConvId], (oldData: any) => {
        if (!oldData) return oldData;

        return {
          ...oldData,
          pages: oldData.pages.map((page: Message[]) =>
            page.filter((msg) => msg.id !== data.messageId)
          ),
        };
      });
    };

    // Event Listeners Attach
    socket.on("receive_message", handleReceiveMessage);
    socket.on("receive_reaction", handleReceiveReaction);
    socket.on("on_message_deleted", handleMessageDeleted);

    // Clean up Event Listeners
    return () => {
      socket.off("connect", joinRoom);
      socket.off("receive_message", handleReceiveMessage);
      socket.off("receive_reaction", handleReceiveReaction);
      socket.off("on_message_deleted", handleMessageDeleted);

      if (conversationId && socket.connected) {
        socket.emit("leave_conversation", { conversationId });
      }
    };
  }, [conversationId, currentUserId, queryClient]);

  return { socket };
}