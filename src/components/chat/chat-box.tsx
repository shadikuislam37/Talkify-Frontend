"use client";
import { useReactionStore } from "@/store/use-reaction-store";
import React, { useEffect, useRef, useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { socket } from "@/lib/socket";
import { useMessage } from "@/hooks/use-messages";
import { Loader2, Info, Video, Phone, Check, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import GroupDetailsModal from "./group-details-modal";
import { AuthUser, Conversation, Message } from "@/types";
import MessageBubble from "./message-bubble";
import { useCallStore } from "@/store/use-call-store";
import { useOnlineUsers } from "@/hooks/use-online-users";
import { formatLastSeen } from "@/lib/utils";
import { api } from "@/lib/api";
import { MessageInput } from "./message-input";
import { decryptMessage, encryptMessage, getMyPublicKeyPem, Recipient } from "@/lib/crypto";

interface ChatBoxProps {
  conversationId: string;
  currentUserId?: string;
  currentUserName?: string;
  currentUserPublicKey?: string | null;
  conversation?: Conversation;
  availableUsers?: AuthUser[];
}

export default function ChatBox({
  conversationId,
  currentUserId,
  currentUserName = "Someone",
  currentUserPublicKey,
  conversation,
  availableUsers = [],
}: ChatBoxProps) {
  const queryClient = useQueryClient();

  const onlineUsers = useOnlineUsers();
  const startCall = useCallStore((state) => state.startCall);
  const [isGroupDetailsOpen, setIsGroupDetailsOpen] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const otherUser = React.useMemo(() => {
    if (!conversation || conversation.isGroup) return null;
    const users = conversation.users || [];
    return users.find((u: AuthUser) => u.id !== currentUserId) || users[0];
  }, [conversation, currentUserId]);

  const isOnline = Boolean(otherUser?.id && onlineUsers.has(otherUser.id));

  const chatTitle = conversation?.isGroup
    ? conversation.name || "Group Chat"
    : otherUser?.name || conversation?.name || "Chat";

  const chatAvatarImage = conversation?.isGroup
    ? conversation?.image
    : otherUser?.image;

  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useMessage.useGetMessages(conversationId);

  const rawMessages: Message[] = React.useMemo(() => {
    const list = data?.pages.flatMap((page: unknown) => page as Message[]) ?? [];
    return [...list].reverse();
  }, [data]);

  const [decryptedMessages, setDecryptedMessages] = useState<Message[]>([]);

  useEffect(() => {
    let isMounted = true;

    async function processMessages() {
      if (!currentUserId) return;

      const processed = await Promise.all(
        rawMessages.map(async (msg) => {
          let updatedMsg = { ...msg };

          // ১. মেইন মেসেজ ডিক্রিপশন
          if (msg.body && msg.keys && msg.keys.length > 0) {
            try {
              const plainText = await decryptMessage(msg.body, msg.keys, currentUserId);
              if (plainText && !plainText.startsWith("{")) {
                updatedMsg.body = plainText;
              }
            } catch (err) {
              // fallback to original
            }
          }

          // 🌟 ২. রিপ্লাই করা মেসেজ ডিক্রিপশন ফিক্স
          if (msg.replyTo && msg.replyTo.body) {
            const rawReplyBody = msg.replyTo.body;
            if (rawReplyBody.trim().startsWith("{") && msg.replyTo.keys && msg.replyTo.keys.length > 0) {
              try {
                const decryptedReply = await decryptMessage(rawReplyBody, msg.replyTo.keys, currentUserId);
                if (decryptedReply && !decryptedReply.startsWith("{")) {
                  updatedMsg.replyTo = {
                    ...msg.replyTo,
                    body: decryptedReply,
                  };
                }
              } catch (err) {
                console.error("ChatBox reply decryption error:", err);
              }
            }
          }

          return updatedMsg;
        })
      );

      if (isMounted) {
        setDecryptedMessages(processed);
      }
    }

    processMessages();

    return () => {
      isMounted = false;
    };
  }, [rawMessages, currentUserId]);

  const { mutateAsync: sendMessage, isPending: isSending } = useMessage.useSendMessage();
  const { mutateAsync: markAsRead } = useMessage.useMarkMessageAsRead?.() || {
    mutateAsync: async () => {},
  };
  const { mutateAsync: deleteMessage } = useMessage.useDeleteMessage?.() || {
    mutateAsync: async () => {},
  };
  const { mutateAsync: reactToMessage } = useMessage.useReactToMessage();
  const addOrUpdateReaction = useReactionStore((state) => state.addOrUpdateReaction);

  const [typingUsers, setTypingUsers] = useState<{ [userId: string]: string }>({});
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [highlightedMsgId, setHighlightedMsgId] = useState<string | null>(null);

  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const observerTargetRef = useRef<HTMLDivElement>(null);
  const isInitialMount = useRef(true);

  const scrollToMessage = (targetId: string) => {
    const element = document.getElementById(`msg-${targetId}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      setHighlightedMsgId(targetId);
      setTimeout(() => setHighlightedMsgId(null), 2000);
    }
  };

  const handleStartAudioCall = () => {
    if (!otherUser) return;
    startCall(
      { id: otherUser.id, name: otherUser.name || "User", image: otherUser.image || undefined },
      false
    );
  };

  const handleStartVideoCall = () => {
    if (!otherUser) return;
    startCall(
      { id: otherUser.id, name: otherUser.name || "User", image: otherUser.image || undefined },
      true
    );
  };

  useEffect(() => {
    if (!socket || !conversationId) return;
    if (!socket.connected) socket.connect();
    socket.emit("join_conversation", { conversationId });
    return () => {
      socket.emit("leave_conversation", { conversationId });
    };
  }, [conversationId]);

  useEffect(() => {
    if (!conversationId || !currentUserId || decryptedMessages.length === 0) return;

    const incomingUnreadMessages = decryptedMessages.filter((m) => {
      const msgSenderId = m.senderId || m.sender?.id;
      const isMyMessage = Boolean(msgSenderId && String(msgSenderId) === String(currentUserId));
      const alreadyReadByMe = m.reads?.some((r: any) => String(r.userId) === String(currentUserId));
      return !isMyMessage && m.status !== "READ" && !alreadyReadByMe;
    });

    if (incomingUnreadMessages.length > 0) {
      incomingUnreadMessages.forEach(async (msg) => {
        try {
          await markAsRead({ messageId: msg.id, conversationId });
        } catch (err) {}

        if (socket && socket.connected) {
          socket.emit("update_message_status", {
            messageId: msg.id,
            conversationId,
            userId: currentUserId,
            status: "READ",
          });
        }
      });
    }
  }, [conversationId, currentUserId, decryptedMessages, markAsRead]);

  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;
      if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    },
    [fetchNextPage, hasNextPage, isFetchingNextPage]
  );

  useEffect(() => {
    const element = observerTargetRef.current;
    if (!element) return;
    const observer = new IntersectionObserver(handleObserver, { threshold: 0.5 });
    observer.observe(element);
    return () => observer.disconnect();
  }, [handleObserver]);

  useEffect(() => {
    if (decryptedMessages.length > 0 || Object.keys(typingUsers).length > 0) {
      if (isInitialMount.current) {
        messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
        isInitialMount.current = false;
      } else {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }
    }
  }, [decryptedMessages.length, typingUsers]);

  useEffect(() => {
    if (!socket) return;

    const handleTypingStart = (data: { conversationId: string; userId?: string; senderName?: string }) => {
      if (data.conversationId === conversationId && data.userId !== currentUserId) {
        setTypingUsers((prev) => ({ ...prev, [data.userId || "unknown"]: data.senderName || "Someone" }));
      }
    };

    const handleTypingStop = (data: { conversationId: string; userId?: string }) => {
      if (data.conversationId === conversationId) {
        setTypingUsers((prev) => {
          const updated = { ...prev };
          delete updated[data.userId || "unknown"];
          return updated;
        });
      }
    };

    socket.on("on_typing_start", handleTypingStart);
    socket.on("on_typing_stop", handleTypingStop);

    return () => {
      socket.off("on_typing_start", handleTypingStart);
      socket.off("on_typing_stop", handleTypingStop);
    };
  }, [conversationId, currentUserId]);

  const handleInputChange = (text: string) => {
    if (!socket) return;
    if (text.trim().length > 0) {
      socket.emit("typing_start", { conversationId, userId: currentUserId, senderName: currentUserName });
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit("typing_stop", { conversationId, userId: currentUserId });
      }, 2000);
    } else {
      socket.emit("typing_stop", { conversationId, userId: currentUserId });
    }
  };

 const handleSaveEdit = async (messageId: string) => {
  if (!editText.trim() || !currentUserId) return;
  try {
    const rawText = editText.trim();
    const members = conversation?.users || (otherUser ? [otherUser] : []);

    // prop-কে অগ্রাধিকার দিন — send flow-এর মতোই reliable সোর্স
    const myPublicKeyPem = currentUserPublicKey || getMyPublicKeyPem(currentUserId);
    const recipients: Recipient[] = [];

    if (!myPublicKeyPem) {
      // silent fail না করে স্পষ্ট error দিন
      setSendError("Your encryption key is unavailable. Please refresh and try again.");
      return;
    }
    recipients.push({ userId: currentUserId, publicKeyPem: myPublicKeyPem });

    members.forEach((m) => {
      if (m.id !== currentUserId && m.publicKey) {
        recipients.push({ userId: m.id, publicKeyPem: m.publicKey });
      }
    });

    if (recipients.length === 0) return;

    const { encryptedBody, keys } = await encryptMessage(rawText, recipients);

    await api.patch(`/messages/edit/${messageId}`, {
      encryptedBody,
      keys,
    });

    setEditingMessageId(null);
    setEditText("");
    queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
  } catch (err) {
    console.error("Failed to edit message:", err);
    setSendError("Failed to edit message. Please try again.");
  }
};

  const confirmDeleteMessage = async () => {
    if (!deletingMessageId) return;
    try {
      setIsDeleting(true);
      await deleteMessage(deletingMessageId);
      if (socket && conversation?.id) {
        socket.emit("delete_message_everyone", {
          messageId: deletingMessageId,
          conversationId: conversation.id,
        });
      }
      queryClient.setQueryData(["messages", conversationId], (oldData: any) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          pages: oldData.pages.map((page: Message[]) => page.filter((msg) => msg.id !== deletingMessageId)),
        };
      });
    } catch (err) {
      console.error("Failed to delete message:", err);
    } finally {
      setIsDeleting(false);
      setDeletingMessageId(null);
    }
  };

  const confirmDeleteForMe = async () => {
    if (!deletingMessageId) return;
    try {
      setIsDeleting(true);
      await api.delete(`/messages/${deletingMessageId}/delete-for-me`);

      if (socket) {
        socket.emit("delete_message_for_me", { messageId: deletingMessageId });
      }

      queryClient.setQueryData(["messages", conversationId], (oldData: any) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          pages: oldData.pages.map((page: Message[]) =>
            page.filter((msg) => msg.id !== deletingMessageId)
          ),
        };
      });
    } catch (err) {
      console.error("Failed to delete message for me:", err);
    } finally {
      setIsDeleting(false);
      setDeletingMessageId(null);
    }
  };

  const typingUserNames = Object.values(typingUsers);

  return (
    <div className="flex flex-col h-full overflow-hidden border rounded-md bg-background relative">
      <div className="flex items-center justify-between border-b p-4 shrink-0">
        <div
          onClick={() => conversation?.isGroup && setIsGroupDetailsOpen(true)}
          className={`flex items-center gap-3 ${conversation?.isGroup ? "cursor-pointer hover:opacity-80 transition-opacity" : ""}`}
        >
          <div className="relative">
            <Avatar className="h-9 w-9">
              <AvatarImage src={chatAvatarImage || undefined} />
              <AvatarFallback className="text-xs font-semibold">
                {chatTitle ? chatTitle.slice(0, 2).toUpperCase() : "CU"}
              </AvatarFallback>
            </Avatar>
            {!conversation?.isGroup && isOnline && (
              <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-background" />
            )}
          </div>

          <div>
            <h2 className="font-semibold text-sm leading-tight">{chatTitle}</h2>
            {conversation?.isGroup ? (
              <p className="text-[11px] text-muted-foreground">
                {conversation?.users?.length || 0} members • Click for info
              </p>
            ) : (
              <p className={`text-[11px] ${isOnline ? "text-green-600 font-medium" : "text-muted-foreground"}`}>
                {isOnline ? "Online" : formatLastSeen(otherUser?.lastSeen)}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          {!conversation?.isGroup && otherUser && (
            <>
              <Button type="button" variant="ghost" size="icon" onClick={handleStartAudioCall} className="h-8 w-8 text-muted-foreground hover:text-foreground" title="Start Audio Call">
                <Phone className="h-4 w-4" />
              </Button>
              <Button type="button" variant="ghost" size="icon" onClick={handleStartVideoCall} className="h-8 w-8 text-muted-foreground hover:text-foreground" title="Start Video Call">
                <Video className="h-4 w-4" />
              </Button>
            </>
          )}

          {conversation?.isGroup && (
            <Button type="button" variant="ghost" size="icon" onClick={() => setIsGroupDetailsOpen(true)} className="h-8 w-8 text-muted-foreground hover:text-foreground" title="Group Info">
              <Info className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col min-h-0">
        <div ref={observerTargetRef} className="h-2 w-full">
          {isFetchingNextPage && (
            <div className="flex justify-center py-2">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>

        {sendError && (
          <div className="mb-2 p-2 rounded-md bg-red-50 border border-red-200 text-xs text-red-700 flex items-center justify-between">
            <span>{sendError}</span>
            <button onClick={() => setSendError(null)} className="ml-2 text-red-500 hover:text-red-700">
              <X className="h-3 w-3" />
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-10 text-muted-foreground gap-2 m-auto">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Loading chat...</span>
          </div>
        ) : decryptedMessages.length === 0 ? (
          <p className="text-center text-muted-foreground text-sm m-auto">
            No messages yet. Say hi! 👋
          </p>
        ) : (
          <div className="flex flex-col space-y-3">
            {decryptedMessages.map((msg) => (
              <div key={msg.id} className="group relative">
                <MessageBubble
                  msg={msg}
                  currentUserId={currentUserId}
                  isGroup={Boolean(conversation?.isGroup)}
                  highlightedMsgId={highlightedMsgId}
                  onReply={(m) => setReplyingTo(m)}
                  onEdit={(id, currentText) => {
                    setEditingMessageId(id);
                    setEditText(currentText);
                  }}
                  onDelete={(id) => setDeletingMessageId(id)}
                  onDeleteForMe={async (msgId) => {
                    try {
                      await api.delete(`/messages/${msgId}/delete-for-me`);
                      queryClient.setQueryData(["messages", conversationId], (oldData: any) => {
                        if (!oldData) return oldData;
                        return {
                          ...oldData,
                          pages: oldData.pages.map((page: Message[]) => page.filter((m) => m.id !== msgId)),
                        };
                      });
                    } catch (err) {
                      console.error("Failed to delete message for me:", err);
                    }
                  }}
                  onReaction={async (msgId, emoji) => {
                    try {
                      await reactToMessage({ messageId: msgId, emoji });
                      if (socket && conversation?.id) {
                        socket.emit("send_reaction", {
                          messageId: msgId,
                          conversationId: conversation.id,
                          emoji,
                        });
                      }
                    } catch (err) {
                      console.error("Failed to react:", err);
                    }
                  }}
                  onScrollToReply={scrollToMessage}
                  onRetry={(failedMsg) => {
                    if (!failedMsg._retryPayload) return;
                    sendMessage({
                      ...failedMsg._retryPayload,
                      clientId: failedMsg.id,
                    }).catch((error: any) => {
                      setSendError(error?.message || "Retry failed. Please try again.");
                    });
                  }}
                />

                {editingMessageId === msg.id && (
                  <div className="flex items-center gap-2 mt-1 px-2">
                    <Input
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleSaveEdit(msg.id);
                        } else if (e.key === "Escape") {
                          e.preventDefault();
                          setEditingMessageId(null);
                        }
                      }}
                      autoFocus
                      className="h-8 text-xs"
                    />
                    <Button size="sm" onClick={() => handleSaveEdit(msg.id)} className="h-8 px-2">
                      <Check className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingMessageId(null)} className="h-8 px-2">
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {typingUserNames.length > 0 && (
          <div className="text-xs text-muted-foreground italic flex items-center gap-1 animate-pulse py-1 self-start mt-2">
            <span>
              {typingUserNames.length === 1
                ? `${typingUserNames[0]} is typing...`
                : `${typingUserNames.join(", ")} are typing...`}
            </span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <MessageInput
        conversationId={conversationId}
        currentUserId={currentUserId}
        socket={socket}
        replyingTo={replyingTo}
        onCancelReply={() => setReplyingTo(null)}
        onSendMessage={async (payload) => {
          if (!payload.body && !payload.image && !payload.fileUrl) return;
          if (!currentUserId) return;

          setSendError(null);
          const clientId =
            typeof crypto !== "undefined" && "randomUUID" in crypto
              ? `temp-${crypto.randomUUID()}`
              : `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`;

          try {
            return await sendMessage({
              ...payload,
              clientId,
              replyToPreview: replyingTo ?? undefined,
              members: conversation?.users || (otherUser ? [otherUser] : []),
              currentUserId,
              currentUserPublicKey: currentUserPublicKey
            });
          } catch (error: any) {
            setSendError(error?.message || "Failed to send message. Please try again.");
            throw error;
          }
        }}
        isSending={isSending}
        onTyping={handleInputChange}
      />

      {deletingMessageId && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-background border rounded-lg p-6 max-w-sm w-full shadow-lg space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Delete Message?</h3>
            <p className="text-sm text-muted-foreground">
              Choose how you want to delete this message.
            </p>
            <div className="flex flex-col gap-2 pt-2">
              <Button type="button" variant="destructive" disabled={isDeleting} onClick={confirmDeleteMessage}>
                {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete for Everyone"}
              </Button>
              <Button type="button" variant="outline" disabled={isDeleting} onClick={confirmDeleteForMe}>
                Delete for Me
              </Button>
              <Button type="button" variant="ghost" disabled={isDeleting} onClick={() => setDeletingMessageId(null)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {conversation?.isGroup && (
        <GroupDetailsModal
          open={isGroupDetailsOpen}
          onOpenChange={setIsGroupDetailsOpen}
          conversationId={conversationId}
          groupName={conversation?.name || "Group Chat"}
          members={conversation?.users || []}
          adminIds={conversation?.adminIds || []}
          currentUserId={currentUserId}
          allUsers={availableUsers}
        />
      )}
    </div>
  );
}