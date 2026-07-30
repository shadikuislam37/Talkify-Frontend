"use client";
import { useReactionStore } from "@/store/use-reaction-store";
import React, { useEffect, useRef, useState, useCallback } from "react";
import Image from "next/image";
import { useForm } from "@tanstack/react-form";
import { useQueryClient } from "@tanstack/react-query";
import { useSocket } from "@/hooks/use-socket";
import { useMessage } from "@/hooks/use-messages";
import { Loader2, Send, Paperclip, X, Info, Video, Check } from "lucide-react";
import { sendMessageSchema, SendMessageInput } from "@/schemas/chat.schema";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import GroupDetailsModal from "./group-details-modal";
import { AuthUser, Conversation, Message } from "@/types";
import MessageBubble from "./message-bubble";
import { useCallStore } from "@/store/use-call-store";
import { useOnlineUsers } from "@/hooks/use-online-users";
import { formatLastSeen } from "@/lib/utils";
import { useEditMessage } from "@/hooks/use-message-edit-delete";
import { api } from "@/lib/api";

interface ChatBoxProps {
  conversationId: string;
  currentUserId?: string;
  currentUserName?: string;
  conversation?: Conversation;
  availableUsers?: AuthUser[];
}

export default function ChatBox({
  conversationId,
  currentUserId,
  currentUserName = "Someone",
  conversation,
  availableUsers = [],
}: ChatBoxProps) {
  const { socket } = useSocket(conversationId);
  const queryClient = useQueryClient();

  const onlineUsers = useOnlineUsers();
  const startCall = useCallStore((state) => state.startCall);
  const [isGroupDetailsOpen, setIsGroupDetailsOpen] = useState(false);

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

  const messages: Message[] = React.useMemo(() => {
    const rawList = data?.pages.flatMap((page: unknown) => page as Message[]) ?? [];
    return [...rawList].reverse();
  }, [data]);

  const { mutateAsync: sendMessage, isPending: isSending } = useMessage.useSendMessage();
  const { mutateAsync: markAsRead } = useMessage.useMarkMessageAsRead?.() || {
    mutateAsync: async () => {},
  };
  const { mutateAsync: deleteMessage } = useMessage.useDeleteMessage?.() || {
    mutateAsync: async () => {},
  };
  const { mutateAsync: reactToMessage } = useMessage.useReactToMessage();
  const addOrUpdateReaction = useReactionStore((state) => state.addOrUpdateReaction);

  const { mutateAsync: editMessage } = useEditMessage?.() || {
    mutateAsync: async () => {},
  };

  const [typingUsers, setTypingUsers] = useState<{ [userId: string]: string }>({});
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
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
      setTimeout(() => {
        setHighlightedMsgId(null);
      }, 2000);
    }
  };

  const handleStartVideoCall = () => {
    if (!otherUser) return;
    startCall({
      id: otherUser.id,
      name: otherUser.name || "User",
      image: otherUser.image || undefined,
    });
  };

  useEffect(() => {
    if (!socket || !conversationId) return;
    socket.emit("join_conversation", { conversationId });
    return () => {
      socket.emit("leave_conversation", { conversationId });
    };
  }, [socket, conversationId]);

  useEffect(() => {
    if (!socket.connected) {
      socket.connect();
    }

    const handleNewMessage = (newMessage: Message) => {
      queryClient.setQueryData(
        ["messages", conversationId],
        (oldData: any) => {
          if (!oldData) return oldData;
          const newPages = [...oldData.pages];
          if (newPages.length > 0) {
            newPages[0] = [newMessage, ...newPages[0]];
          }
          return { ...oldData, pages: newPages };
        }
      );
    };

    const handleStatusChange = (data: { messageId: string; userId?: string; readByUserId?: string; status: string }) => {
      const readerUserId = data.userId || data.readByUserId;

      queryClient.setQueryData(["messages", conversationId], (oldData: any) => {
        if (!oldData) return oldData;

        return {
          ...oldData,
          pages: oldData.pages.map((page: Message[]) =>
            page.map((msg) => {
              if (msg.id === data.messageId) {
                const existingReads = msg.reads || [];
                const alreadyRead = readerUserId 
                  ? existingReads.some((r: any) => String(r.userId) === String(readerUserId))
                  : false;

                const updatedReads = alreadyRead || !readerUserId
                  ? existingReads
                  : [...existingReads, { id: Math.random().toString(), messageId: msg.id, userId: readerUserId, readAt: new Date().toISOString() }];

                return {
                  ...msg,
                  status: data.status as any,
                  reads: updatedReads,
                };
              }
              return msg;
            })
          ),
        };
      });
    };

    const handleReceiveReaction = (data: { messageId: string; reaction: any }) => {
      addOrUpdateReaction(data.messageId, data.reaction);
    };

    socket.on("receive_message", handleNewMessage);
    socket.on("on_message_status_change", handleStatusChange);
    socket.on("message_read", handleStatusChange);
    socket.on("receive_reaction", handleReceiveReaction);

    return () => {
      socket.off("receive_message", handleNewMessage);
      socket.off("on_message_status_change", handleStatusChange);
      socket.off("message_read", handleStatusChange);
      socket.off("receive_reaction", handleReceiveReaction);
    };
  }, [socket, conversationId, queryClient, addOrUpdateReaction]);

  useEffect(() => {
    if (!conversationId || !currentUserId || messages.length === 0) return;

    const incomingUnreadMessages = messages.filter((m) => {
      const msgSenderId = m.senderId || m.sender?.id;
      const isMyMessage = Boolean(msgSenderId && String(msgSenderId) === String(currentUserId));
      const alreadyReadByMe = m.reads?.some((r: any) => String(r.userId) === String(currentUserId));

      return !isMyMessage && m.status !== "READ" && !alreadyReadByMe;
    });

    if (incomingUnreadMessages.length > 0) {
      incomingUnreadMessages.forEach(async (msg) => {
        try {
          await markAsRead({ messageId: msg.id, conversationId });
        } catch (err) {
          // Silent Fail
        }

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
  }, [conversationId, currentUserId, messages, markAsRead, socket]);

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
    if (messages.length > 0 || Object.keys(typingUsers).length > 0) {
      if (isInitialMount.current) {
        messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
        isInitialMount.current = false;
      } else {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }
    }
  }, [messages.length, typingUsers]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await api.post("/media/upload", formData);
      const data = res.data;

      if (data.success) {
        setSelectedImage(data.data.fileUrl);
      } else {
        alert(data.message || "File upload failed!");
      }
    } catch (error) {
      console.error("Upload error:", error);
      alert("Something went wrong while uploading!");
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  useEffect(() => {
    if (!socket) return;

    const handleTypingStart = (data: { conversationId: string; userId?: string; senderName?: string }) => {
      if (data.conversationId === conversationId && data.userId !== currentUserId) {
        setTypingUsers((prev) => ({
          ...prev,
          [data.userId || "unknown"]: data.senderName || "Someone",
        }));
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
  }, [socket, conversationId, currentUserId]);

  const form = useForm({
    defaultValues: {
      body: "",
      image: "",
      conversationId: conversationId,
    } as SendMessageInput,
    validators: { onChange: sendMessageSchema },
    onSubmit: async ({ value }) => {
      const activeId = conversationId || value.conversationId;

      if (!activeId || (!value.body?.trim() && !selectedImage)) return;

      if (socket) socket.emit("typing_stop", { conversationId: activeId, userId: currentUserId });

      const payload = {
        conversationId: activeId,
        body: value.body?.trim() ? value.body.trim() : undefined,
        image: selectedImage || undefined,
        replyToId: replyingTo?.id || undefined,
      };

      try {
        const newMsg = await sendMessage(payload);

        if (socket && newMsg) {
          socket.emit("send_message", { conversationId: activeId, message: newMsg });
        }

        form.reset({ body: "", image: "", conversationId: activeId });
        setSelectedImage(null);
        setReplyingTo(null);
      } catch (err) {
        console.error("Failed to send message:", err);
      }
    },
  });

  useEffect(() => {
    if (conversationId) {
      form.setFieldValue("conversationId", conversationId);
    }
  }, [conversationId, form]);

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
  if (!editText.trim()) return;
  try {
    // 🌟 ব্যাকএন্ডের এডিট রাউট অনুযায়ী এখানে এপিআই কল করা হলো
    await api.patch(`/messages/edit/${messageId}`, { newBody: editText.trim() });

    setEditingMessageId(null);
    setEditText("");
    
    // মেসেজ লিস্ট রিফ্রেশ করার জন্য কুয়েরি ইনভ্যালিডেট করা
    queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
  } catch (err) {
    console.error("Failed to edit message:", err);
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
          pages: oldData.pages.map((page: Message[]) =>
            page.filter((msg) => msg.id !== deletingMessageId)
          ),
        };
      });
    } catch (err) {
      console.error("Failed to delete message:", err);
    } finally {
      setIsDeleting(false);
      setDeletingMessageId(null);
    }
  };

  const typingUserNames = Object.values(typingUsers);

  return (
    <div className="flex flex-col h-full overflow-hidden border rounded-md bg-background relative">
      {/* CHAT HEADER SECTION */}
      <div className="flex items-center justify-between border-b p-4 shrink-0">
        <div 
          onClick={() => {
            if (conversation?.isGroup) {
              setIsGroupDetailsOpen(true);
            }
          }}
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

        {/* Action Buttons */}
        <div className="flex items-center gap-1">
          {!conversation?.isGroup && otherUser && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleStartVideoCall}
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              title="Start Video Call"
            >
              <Video className="h-4 w-4" />
            </Button>
          )}

          {conversation?.isGroup && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setIsGroupDetailsOpen(true)}
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              title="Group Info"
            >
              <Info className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* MESSAGES LIST AREA */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col justify-end min-h-0">
        <div ref={observerTargetRef} className="h-2 w-full">
          {isFetchingNextPage && (
            <div className="flex justify-center py-2">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-10 text-muted-foreground gap-2 m-auto">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Loading chat...</span>
          </div>
        ) : messages.length === 0 ? (
          <p className="text-center text-muted-foreground text-sm m-auto">
            No messages yet. Say hi! 👋
          </p>
        ) : (
          <div className="flex flex-col space-y-3">
            {messages.map((msg) => (
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
      
                  onDelete={(id) => {
                    setDeletingMessageId(id);
                  }}

                  
   onDeleteForMe={async (msgId) => {
    try {
      await api.post(`/messages/delete-for-me/${msgId}`);

      queryClient.setQueryData(["messages", conversationId], (oldData: any) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          pages: oldData.pages.map((page: Message[]) =>
            page.filter((m) => m.id !== msgId)
          ),
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
                />

                {editingMessageId === msg.id ? (
                  <div className="flex items-center gap-2 mt-1 px-2">
                    <Input
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="h-8 text-xs"
                    />
                    <Button size="sm" onClick={() => handleSaveEdit(msg.id)} className="h-8 px-2">
                      <Check className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingMessageId(null)} className="h-8 px-2">
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : null}
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

      {/* Reply Preview Above Input */}
      {replyingTo && (
        <div className="flex items-center justify-between p-2 bg-muted/80 border-t text-xs shrink-0">
          <div className="truncate pr-2">
            <span className="font-bold text-primary block">
              Replying to {replyingTo.senderId === currentUserId ? "yourself" : replyingTo.sender?.name || "user"}
            </span>
            <span className="text-muted-foreground truncate block">{replyingTo.body || "Image"}</span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setReplyingTo(null)}
            className="h-6 w-6 rounded-full text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {/* Selected Image Preview */}
      {selectedImage && (
        <div className="relative w-16 h-16 m-2 border rounded-md overflow-hidden bg-muted shrink-0">
          <Image
            src={selectedImage}
            alt="Preview of uploaded image"
            fill
            sizes="64px"
            className="object-cover"
            unoptimized
          />
          <button
            type="button"
            onClick={() => setSelectedImage(null)}
            className="absolute top-0 right-0 z-10 bg-black/60 text-white p-0.5 rounded-bl hover:bg-black/80 transition-colors"
            title="Remove image"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* Input Form with TanStack Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
        className="flex gap-2 items-center p-4 border-t shrink-0 bg-background"
      >
        <label className="cursor-pointer p-2 hover:bg-muted rounded-md text-muted-foreground transition-colors flex items-center justify-center">
          {isUploading ? (
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          ) : (
            <Paperclip className="h-4 w-4" />
          )}
          <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" disabled={isUploading} />
        </label>

        <form.Field name="body">
          {(field) => (
            <div className="flex-1">
              <Input
                name={field.name}
                value={field.state.value || ""}
                onChange={(e) => {
                  field.handleChange(e.target.value);
                  handleInputChange(e.target.value);
                }}
                onBlur={field.handleBlur}
                placeholder="Type a message..."
                autoComplete="off"
                className="h-10"
              />
            </div>
          )}
        </form.Field>

        <Button type="submit" disabled={isSending || isUploading} size="icon" className="h-10 w-10">
          {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </form>

      {/* Delete Confirmation Modal */}
      {deletingMessageId && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-background border rounded-lg p-6 max-w-sm w-full shadow-lg space-y-4 animate-in fade-in zoom-in duration-150">
            <h3 className="text-lg font-semibold text-foreground">
              Delete Message?
            </h3>
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete this message? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                disabled={isDeleting}
                onClick={() => setDeletingMessageId(null)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={isDeleting}
                onClick={confirmDeleteMessage}
              >
                {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* GROUP DETAILS MODAL INTEGRATION */}
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