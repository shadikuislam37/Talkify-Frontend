import { useEffect } from "react";
import { socket } from "@/lib/socket";
import { useQueryClient } from "@tanstack/react-query";
import { playNotificationSound, sendPushNotification } from "@/lib/notification";
import { Message } from "@/types";

export function useSocket(
  conversationId?: string,
  currentUserId?: string,
  // Call Callbacks
  onCallOffer?: (data: { from: string; name: string; sdp: any; isVideo?: boolean }) => void,
  onCallAnswer?: (data: { from: string; sdp: any }) => void,
  onIceCandidate?: (data: { from: string; candidate: any }) => void,
  onEndCall?: (data: { from: string }) => void,
  // Extra Callbacks (Typing, Status, Group, Online)
  onTypingStart?: (data: { conversationId: string; userId: string; senderName: string }) => void,
  onTypingStop?: (data: { conversationId: string; userId: string }) => void,
  onMessageStatusChange?: (data: { messageId: string; conversationId: string; status: string; userId: string }) => void,
  onGroupUpdated?: (data: { conversationId: string; type: string; payload: any }) => void,
  onUserOnline?: (data: { userId: string }) => void,
  onUserOffline?: (data: { userId: string; lastSeen: Date }) => void
) {
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

  if (!isMyMessage) {
    playNotificationSound();
    // 🌟 ফিক্স: keys আর currentUserId পাস করা হলো, যাতে sendPushNotification
    // ভেতরে decryptMessage() ঠিকভাবে চালাতে পারে এবং আসল টেক্সট দেখাতে পারে
    sendPushNotification(
      newMessage.sender?.name || "New Message",
      newMessage.body || "Sent an attachment",
      newMessage.keys ?? undefined,
      currentUserId
    );

    if (conversationId && newMessage.conversationId === conversationId) {
      socket.emit("mark_message_as_read", {
        messageId: newMessage.id,
        conversationId: newMessage.conversationId,
      });
    }
  }

   queryClient.setQueryData(["messages", newMessage.conversationId], (oldData: any) => {
  // 🌟 যদি আগে কোনো মেসেজ না থাকে (Empty Chat), তবে নতুন অ্যারে তৈরি করে দিন
  if (!oldData || !oldData.pages || oldData.pages.length === 0) {
    return {
      pages: [[newMessage]],
      pageParams: [null],
    };
  }

  const newPages = [...oldData.pages];
  if (newPages.length > 0) {
    const exists = newPages[0].some((m: Message) => m.id === newMessage.id);
    if (!exists) {
      newPages[0] = [newMessage, ...newPages[0]];
    }
  }
  return { ...oldData, pages: newPages };
});

      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    };

    // 🌟 ২. রিয়েল-টাইম রিঅ্যাকশন হ্যান্ডলার
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

                const updatedReactions = [...currentReactions];
                if (existingIndex > -1) {
                  if (!data.reaction.emoji) {
                    updatedReactions.splice(existingIndex, 1);
                  } else {
                    updatedReactions[existingIndex] = data.reaction;
                  }
                } else if (data.reaction.emoji) {
                  updatedReactions.push(data.reaction);
                }

                return { ...msg, reactions: updatedReactions };
              }
              return msg;
            })
          ),
        };
      });
    };

    // 🌟 ৩. মেসেজ ডিলিট (Everyone) হ্যান্ডলার
    const handleMessageDeleted = (data: { messageId: string; conversationId: string }) => {
      const targetConvId = data.conversationId || conversationId;
      if (!targetConvId) return;

      queryClient.setQueryData(["messages", targetConvId], (oldData: any) => {
        if (!oldData) return oldData;

        return {
          ...oldData,
          pages: oldData.pages.map((page: Message[]) =>
            page.map((msg) =>
              msg.id === data.messageId
                ? { ...msg, body: null, image: null, fileUrl: null, fileName: null, fileType: null }
                : msg
            )
          ),
        };
      });
    };

    // 🌟 ৩.১ মেসেজ ডিলিট (For Me) হ্যান্ডলার
    const handleMessageDeletedForMe = (data: { messageId: string; userId: string }) => {
      if (data.userId !== currentUserId) return;
      if (!conversationId) return;

      queryClient.setQueryData(["messages", conversationId], (oldData: any) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          pages: oldData.pages.map((page: Message[]) =>
            page.filter((msg) => msg.id !== data.messageId)
          ),
        };
      });
    };

    // 🌟 ৩.২ মেসেজ এডিট হ্যান্ডলার
    const handleMessageEdited = (updatedMessage: Message) => {
      const targetConvId = updatedMessage.conversationId || conversationId;
      if (!targetConvId) return;

      queryClient.setQueryData(["messages", targetConvId], (oldData: any) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          pages: oldData.pages.map((page: Message[]) =>
            page.map((msg) => (msg.id === updatedMessage.id ? updatedMessage : msg))
          ),
        };
      });
    };

    // 🌟 ৪. WebRTC Call Event Handlers
    const handleReceiveCallOffer = (data: any) => { if (onCallOffer) onCallOffer(data); };
    const handleReceiveCallAnswer = (data: any) => { if (onCallAnswer) onCallAnswer(data); };
    const handleReceiveIceCandidate = (data: any) => { if (onIceCandidate) onIceCandidate(data); };
    const handleReceiveEndCall = (data: any) => { if (onEndCall) onEndCall(data); };

    // 🌟 ৫. Typing, Status, Group & Presence Handlers
    const handleTypingStart = (data: any) => { if (onTypingStart) onTypingStart(data); };
    const handleTypingStop = (data: any) => { if (onTypingStop) onTypingStop(data); };
    
    const handleMessageStatusChange = (data: any) => {
      if (onMessageStatusChange) onMessageStatusChange(data);
      queryClient.invalidateQueries({ queryKey: ["messages", data.conversationId] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    };

    const handleGroupUpdated = (data: any) => {
      if (onGroupUpdated) onGroupUpdated(data);
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    };

    const handleUserOnline = (data: any) => { if (onUserOnline) onUserOnline(data); };
    const handleUserOffline = (data: any) => { if (onUserOffline) onUserOffline(data); };

    // 🌟 সমস্ত ইভেন্ট লিসেনার রেজিস্টার করা হলো
    socket.on("receive_message", handleReceiveMessage);
    socket.on("receive_reaction", handleReceiveReaction);
    socket.on("on_message_deleted", handleMessageDeleted);
    socket.on("on_message_deleted_for_me", handleMessageDeletedForMe);
    socket.on("on_message_edited", handleMessageEdited);
    
    socket.on("receive_call_offer", handleReceiveCallOffer);
    socket.on("receive_call_answer", handleReceiveCallAnswer);
    socket.on("receive_ice_candidate", handleReceiveIceCandidate);
    socket.on("receive_end_call", handleReceiveEndCall);

    socket.on("on_typing_start", handleTypingStart);
    socket.on("on_typing_stop", handleTypingStop);
    socket.on("on_message_status_change", handleMessageStatusChange);
    socket.on("message_read", handleMessageStatusChange);
    socket.on("on_group_updated", handleGroupUpdated);
    socket.on("user_online", handleUserOnline);
    socket.on("user_offline", handleUserOffline);

    // 🌟 ক্লিনআপ ফাংশন
    return () => {
      socket.off("connect", joinRoom);
      socket.off("receive_message", handleReceiveMessage);
      socket.off("receive_reaction", handleReceiveReaction);
      socket.off("on_message_deleted", handleMessageDeleted);
      socket.off("on_message_deleted_for_me", handleMessageDeletedForMe);
      socket.off("on_message_edited", handleMessageEdited);

      socket.off("receive_call_offer", handleReceiveCallOffer);
      socket.off("receive_call_answer", handleReceiveCallAnswer);
      socket.off("receive_ice_candidate", handleReceiveIceCandidate);
      socket.off("receive_end_call", handleReceiveEndCall);

      socket.off("on_typing_start", handleTypingStart);
      socket.off("on_typing_stop", handleTypingStop);
      socket.off("on_message_status_change", handleMessageStatusChange);
      socket.off("message_read", handleMessageStatusChange);
      socket.off("on_group_updated", handleGroupUpdated);
      socket.off("user_online", handleUserOnline);
      socket.off("user_offline", handleUserOffline);

      if (conversationId && socket.connected) {
        socket.emit("leave_conversation", { conversationId });
      }
    };
  }, [
    conversationId, 
    currentUserId, 
    queryClient, 
    onCallOffer, 
    onCallAnswer, 
    onIceCandidate, 
    onEndCall,
    onTypingStart,
    onTypingStop,
    onMessageStatusChange,
    onGroupUpdated,
    onUserOnline,
    onUserOffline
  ]);

  return { socket };
}