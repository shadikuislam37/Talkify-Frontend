"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { useForm } from "@tanstack/react-form";
import { useQueryClient } from "@tanstack/react-query";
import { useSocket } from "@/hooks/use-socket";
import { useChat } from "@/hooks/use-chat";
import { Loader2, Send, Paperclip, X, Info } from "lucide-react";
import { sendMessageSchema, SendMessageInput } from "@/schemas/chat.schema";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import GroupDetailsModal from "./group-details-modal";
import MessageBubble, { Message } from "./message-bubble";

interface ChatBoxProps {
  conversationId: string;
  currentUserId?: string;
  currentUserName?: string;
  conversation?: any;
  availableUsers?: any[];
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

  const [isGroupDetailsOpen, setIsGroupDetailsOpen] = useState(false);

  // 🌟 ১-টু-১ চ্যাটের জন্য অপর ইউজারকে আলাদা করা
  const otherUser = React.useMemo(() => {
    if (!conversation || conversation.isGroup) return null;
    const users = conversation.users || [];
    return users.find((u: any) => u.id !== currentUserId) || users[0];
  }, [conversation, currentUserId]);

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
  } = useChat.useGetMessages(conversationId);

  const messages: Message[] = React.useMemo(() => {
    const rawList = data?.pages.flatMap((page: any) => page) ?? [];
    return [...rawList].reverse();
  }, [data]);

  const { mutateAsync: sendMessage, isPending: isSending } = useChat.useSendMessage();
  const { mutateAsync: deleteMessage } = useChat.useDeleteMessage?.() || {
    mutateAsync: async () => {},
  };

  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [highlightedMsgId, setHighlightedMsgId] = useState<string | null>(null);

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

  useEffect(() => {
    if (!socket || !conversationId) return;
    socket.emit("join_conversation", { conversationId });
    return () => {
      socket.emit("leave_conversation", { conversationId });
    };
  }, [socket, conversationId]);

  // 🌟 সকেট মেসেজ লিসেনার
  useEffect(() => {
    if (!socket) return;

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

    const handleStatusChange = (data: { messageId: string; status: string }) => {
      queryClient.setQueryData(
        ["messages", conversationId],
        (oldData: any) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            pages: oldData.pages.map((page: Message[]) =>
              page.map((msg) =>
                msg.id === data.messageId
                  ? { ...msg, status: data.status as any }
                  : msg
              )
            ),
          };
        }
      );
    };

    socket.on("receive_message", handleNewMessage);
    socket.on("on_message_status_change", handleStatusChange);
    socket.on("message_read", handleStatusChange);

    return () => {
      socket.off("receive_message", handleNewMessage);
      socket.off("on_message_status_change", handleStatusChange);
      socket.off("message_read", handleStatusChange);
    };
  }, [socket, conversationId, queryClient]);

  // 🌟 আনরিড মেসেজ রিড করার ট্র্রিগার (একদম নিখুঁত ফিক্স)
useEffect(() => {
  if (!socket || !conversationId || !currentUserId || messages.length === 0) return;

  // 🔴 ১. শুধু অপজিট ইউজারের পাঠানো মেসেজগুলো ফিল্টার করা (যেগুলো আমার নয় এবং READ হয়নি)
  const incomingUnreadMessages = messages.filter((m) => {
    const msgSenderId = m.senderId || m.sender?.id;
    const isMyMessage = Boolean(msgSenderId && String(msgSenderId) === String(currentUserId));
    
    // আমার পাঠানো মেসেজ হলে স্কিপ করব, শুধুমাত্র অন্য ইউজারের মেসেজ রিড মার্ক করব
    return !isMyMessage && m.status !== "READ";
  });

  // 🔴 ২. অন্য ইউজারের মেসেজগুলো পড়া হলে তবেই ব্যাকএন্ডে সকেট এমিট পাঠাব
  if (incomingUnreadMessages.length > 0) {
    incomingUnreadMessages.forEach((msg) => {
      socket.emit("update_message_status", {
        messageId: msg.id,
        conversationId,
        userId: currentUserId, // রিডার হিসেবে আমার আইডি যাচ্ছে
        status: "READ",
      });
    });
  }
}, [socket, conversationId, messages, currentUserId]);

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
    if (messages.length > 0 || isOtherTyping) {
      if (isInitialMount.current) {
        messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
        isInitialMount.current = false;
      } else {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }
    }
  }, [messages.length, isOtherTyping]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    if (!socket) return;

    const handleTypingStart = (data: { conversationId: string }) => {
      if (data.conversationId === conversationId) setIsOtherTyping(true);
    };
    const handleTypingStop = (data: { conversationId: string }) => {
      if (data.conversationId === conversationId) setIsOtherTyping(false);
    };

    socket.on("on_typing_start", handleTypingStart);
    socket.on("on_typing_stop", handleTypingStop);

    return () => {
      socket.off("on_typing_start", handleTypingStart);
      socket.off("on_typing_stop", handleTypingStop);
    };
  }, [socket, conversationId]);

  // 🌟 TanStack Form সাথে conversationId ফিক্স
  const form = useForm({
    defaultValues: {
      body: "",
      image: "",
      conversationId: conversationId,
    } as SendMessageInput,
    validators: { onChange: sendMessageSchema },
    onSubmit: async ({ value }) => {
      // 🌟 conversationId নিশ্চিত ফিক্সড
      const activeId = conversationId || value.conversationId;

      if (!activeId || (!value.body?.trim() && !selectedImage)) return;

      if (socket) socket.emit("typing_stop", { conversationId: activeId });

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

        form.reset();
        setSelectedImage(null);
        setReplyingTo(null);
      } catch (err) {
        console.error("Failed to send message:", err);
      }
    },
  });

  // conversationId চেঞ্জ হলে তানস্ট্যাক ফর্মে সিঙ্ক রাখা
  useEffect(() => {
    if (conversationId) {
      form.setFieldValue("conversationId", conversationId);
    }
  }, [conversationId, form]);

  const handleInputChange = (text: string) => {
    if (!socket) return;
    if (text.trim().length > 0) {
      socket.emit("typing_start", { conversationId, senderName: currentUserName });
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit("typing_stop", { conversationId });
      }, 2000);
    } else {
      socket.emit("typing_stop", { conversationId });
    }
  };

  const confirmDeleteMessage = async () => {
    if (!deletingMessageId) return;

    try {
      setIsDeleting(true);
      await deleteMessage(deletingMessageId);

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

  return (
    <div className="flex flex-col h-full border rounded-md p-4 bg-background relative">
      
      {/* CHAT HEADER SECTION */}
      <div className="flex items-center justify-between border-b pb-3 mb-3">
        <div 
          onClick={() => {
            if (conversation?.isGroup) {
              setIsGroupDetailsOpen(true);
            }
          }}
          className={`flex items-center gap-3 ${conversation?.isGroup ? "cursor-pointer hover:opacity-80 transition-opacity" : ""}`}
        >
          <Avatar className="h-9 w-9">
            <AvatarImage src={chatAvatarImage || undefined} />
            <AvatarFallback className="text-xs font-semibold">
              {chatTitle ? chatTitle.slice(0, 2).toUpperCase() : "CU"}
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="font-semibold text-sm leading-tight">{chatTitle}</h2>
            {conversation?.isGroup ? (
              <p className="text-[11px] text-muted-foreground">
                {conversation?.users?.length || 0} members • Click for info
              </p>
            ) : (
              <p className="text-[11px] text-muted-foreground">
                {otherUser?.email || "Direct Message"}
              </p>
            )}
          </div>
        </div>

        {conversation?.isGroup && (
          <button
            type="button"
            onClick={() => setIsGroupDetailsOpen(true)}
            className="p-2 hover:bg-muted rounded-full text-muted-foreground transition-colors"
            title="Group Info"
          >
            <Info className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* MESSAGES LIST AREA */}
      <div className="flex-1 overflow-y-auto mb-4 pr-1 flex flex-col">
        <div ref={observerTargetRef} className="h-2 w-full">
          {isFetchingNextPage && (
            <div className="flex justify-center py-2">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-10 text-muted-foreground gap-2 my-auto">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Loading chat...</span>
          </div>
        ) : messages.length === 0 ? (
          <p className="text-center text-muted-foreground text-sm py-10 my-auto">
            No messages yet. Say hi! 👋
          </p>
        ) : (
          <div className="flex flex-col space-y-3 mt-auto">
            {messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                msg={msg}
                currentUserId={currentUserId}
                highlightedMsgId={highlightedMsgId}
                onReply={(m) => setReplyingTo(m)}
                onDelete={(id) => setDeletingMessageId(id)}
                onScrollToReply={scrollToMessage}
              />
            ))}
          </div>
        )}

        {isOtherTyping && (
          <div className="text-xs text-muted-foreground italic flex items-center gap-1 animate-pulse py-1 self-start mt-2">
            <span>Typing...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Reply Preview Above Input */}
      {replyingTo && (
        <div className="flex items-center justify-between p-2 bg-muted/80 rounded-t-md border-b text-xs mb-1 border-l-4 border-l-primary">
          <div className="truncate pr-2">
            <span className="font-bold text-primary block">
              Replying to {replyingTo.senderId === currentUserId ? "yourself" : replyingTo.sender?.name || "user"}
            </span>
            <span className="text-muted-foreground truncate block">{replyingTo.body || "Image"}</span>
          </div>
          <button
            type="button"
            onClick={() => setReplyingTo(null)}
            className="p-1 hover:bg-background rounded-full text-muted-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Selected Image Preview */}
      {selectedImage && (
        <div className="relative w-16 h-16 mb-2 border rounded-md overflow-hidden">
          <img src={selectedImage} alt="preview" className="w-full h-full object-cover" />
          <button
            type="button"
            onClick={() => setSelectedImage(null)}
            className="absolute top-0 right-0 bg-black/60 text-white p-0.5 rounded-bl"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* Input Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
        className="flex gap-2 items-center"
      >
        <label className="cursor-pointer p-2 hover:bg-muted rounded-md text-muted-foreground transition-colors">
          <Paperclip className="h-4 w-4" />
          <input type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
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
              />
            </div>
          )}
        </form.Field>

        <Button type="submit" disabled={isSending} size="icon">
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