import { useEffect } from "react";
import { socket } from "@/lib/socket";
import { useQueryClient } from "@tanstack/react-query";
import { playNotificationSound, sendPushNotification } from "@/lib/notification";
import { Message } from "@/types";
import { toast } from "sonner";
import { useChatStore } from "@/store/use-chat-store";

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
  const { addMessageRequest } = useChatStore(); // 🌟 ইনস্ট্যান্ট অপ্টিমিস্টিক আপডেটের জন্য

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

    // 🌟 ১. রিয়েল-টাইম নতুন মেসেজ হ্যান্ডলার (MULTI-DEVICE SAFE)
    const handleReceiveMessage = (newMessage: Message) => {
      const isMyMessage =
        String(newMessage.senderId || newMessage.sender?.id) === String(currentUserId);

      if (!isMyMessage) {
        playNotificationSound();
        // 🌟 keys আর currentUserId পাস — sendPushNotification ভেতরে decryptMessage()
        // চালিয়ে আসল টেক্সট দেখাতে পারে
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

      // 🌟 MULTI-DEVICE SAFE de-dupe:
      // নিজের পাঠানো মেসেজ socket দিয়ে দুই রকমভাবে ফেরত আসতে পারে —
      //   (ক) যে tab থেকে পাঠানো: সেখানে optimistic bubble আছে (clientId দিয়ে),
      //       useSendMessage-এর onSuccess সেটাকে server message দিয়ে replace করবে।
      //   (খ) একই ইউজারের অন্য tab/device: সেখানে optimistic bubble নেই, তাই
      //       এই মেসেজটা realtime দেখাতে হবে।
      // তাই নিজের মেসেজ blanket skip করা যাবে না (তাহলে খ ভাঙে)।
      // সমাধান: server message-এর সাথে আসা clientId (বা server id) দিয়ে de-dupe —
      //   • list-এ আগে থেকে থাকলে → replace (double-render বন্ধ)
      //   • না থাকলে → নতুন হিসেবে add (realtime sync)
      // ⚠️ backend-এর receive_message broadcast-এ clientId ferry করতে হবে
      //    (message.controller + message.service ফিক্স দেখো)।
      const incomingClientId = (newMessage as any).clientId as string | undefined;

      queryClient.setQueryData(["messages", newMessage.conversationId], (oldData: any) => {
        if (!oldData || !oldData.pages || oldData.pages.length === 0) {
          return {
            pages: [[newMessage]],
            pageParams: [null],
          };
        }

        // এই মেসেজ (clientId বা server id মিলে) আগে থেকে আছে কিনা — সব page জুড়ে
        const matches = (m: Message) =>
          m.id === newMessage.id ||
          (incomingClientId && (m.id === incomingClientId || m.clientId === incomingClientId));

        const alreadyExists = oldData.pages.some((page: Message[]) =>
          page.some(matches)
        );

        if (alreadyExists) {
          // থাকলে duplicate না করে server version দিয়ে replace/merge
          // (optimistic "pending" → confirmed: আসল id + status বসে যায়)
          return {
            ...oldData,
            pages: oldData.pages.map((page: Message[]) =>
              page.map((m) => (matches(m) ? { ...m, ...newMessage } : m))
            ),
          };
        }

        // নেই — অন্য device/tab থেকে আসা নতুন মেসেজ, top-এ add
        const newPages = [...oldData.pages];
        newPages[0] = [newMessage, ...newPages[0]];
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

    const handleMessageStatusChange = (data: { messageId?: string; conversationId: string; status: string; userId?: string }) => {
      if (onMessageStatusChange) onMessageStatusChange(data);

      // 🌟 ইনস্ট্যান্ট ক্যাশ আপডেট: সার্ভারের রেসপন্সের জন্য অপেক্ষা না করে সাথে সাথে ডাবল ব্লু টিক দেখানোর জন্য
      queryClient.setQueryData(["messages", data.conversationId], (oldData: any) => {
        if (!oldData || !oldData.pages) return oldData;

        return {
          ...oldData,
          pages: oldData.pages.map((page: Message[]) =>
            page.map((msg) => {
              // যদি নির্দিষ্ট কোনো মেসেজ আইডি আসে অথবা ওই কনভার্সেশনের আগের সব মেসেজ হয়ে থাকে
              const isTargetMessage = data.messageId ? msg.id === data.messageId : true;
              
              if (isTargetMessage && String(msg.senderId) === String(currentUserId)) {
                return {
                  ...msg,
                  status: data.status || "READ",
                };
              }
              return msg;
            })
          ),
        };
      });

      queryClient.invalidateQueries({ queryKey: ["messages", data.conversationId] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    };

    const handleGroupUpdated = (data: any) => {
      if (onGroupUpdated) onGroupUpdated(data);
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    };

    const handleUserOnline = (data: any) => { if (onUserOnline) onUserOnline(data); };
    const handleUserOffline = (data: any) => { if (onUserOffline) onUserOffline(data); };

    const handleThemeChange = (data: { conversationId: string; theme: string }) => {
      // কনভার্সেশন লিস্ট এবং নির্দিষ্ট চ্যাটের ডেটা ইনস্ট্যান্ট ক্যাশে আপডেট করা
      queryClient.setQueryData(["conversations"], (old: any) => {
        if (!old) return old;
        return old.map((conv: any) => 
          conv.id === data.conversationId ? { ...conv, theme: data.theme } : conv
        );
      });
      
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    };

    // =========================================================================
    // 🌟 ৬. Message Request Optimistic Real-Time Handlers (নতুন যোগ করা অংশ)
    // =========================================================================
    const handleReceiveMessageRequest = (newRequest: any) => {
      playNotificationSound();
      toast.info(`${newRequest.sender?.name || "Someone"} sent you a message request!`);
      
      addMessageRequest(newRequest);

      queryClient.setQueryData(["pending-message-requests"], (old: any = []) => {
        if (!Array.isArray(old)) return [newRequest];
        if (old.some((req: any) => req.id === newRequest.id)) return old;
        return [newRequest, ...old];
      });

      queryClient.invalidateQueries({ queryKey: ["pending-message-requests"] });
    };

    const handleMessageRequestResponse = (response: { requestId: string; status: "ACCEPTED" | "REJECTED"; acceptedBy: any }) => {
      if (response.status === "ACCEPTED") {
        toast.success(`${response.acceptedBy.name} accepted your message request!`);
        queryClient.invalidateQueries({ queryKey: ["conversations"] });
      }
    };
    // =========================================================================

    // 🌟 সমস্ত ইভেন্ট লিসেনার রেজিস্টার
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

    socket.on("theme_changed", handleThemeChange);

    // 🌟 Message Request Listeners
    socket.on("receive_message_request", handleReceiveMessageRequest);
    socket.on("message_request_response", handleMessageRequestResponse);

    // 🌟 ক্লিনআপ
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
      socket.off("theme_changed", handleThemeChange);

      // Message Request Cleanups
      socket.off("receive_message_request", handleReceiveMessageRequest);
      socket.off("message_request_response", handleMessageRequestResponse);

      if (conversationId && socket.connected) {
        socket.emit("leave_conversation", { conversationId });
      }
    };
  }, [
    conversationId,
    currentUserId,
    queryClient,
    addMessageRequest,
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