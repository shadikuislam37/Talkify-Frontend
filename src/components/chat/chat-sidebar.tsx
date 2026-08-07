"use client";

import React, { useEffect, useState, useMemo } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Conversation } from "@/types";
import { formatTime } from "@/lib/utils";
import { Users, MoreVertical, Bell, BellOff, Trash2 } from "lucide-react";
import { socket } from "@/lib/socket";
import { decryptMessage } from "@/lib/crypto";
import { api } from "@/lib/api";

interface ChatSidebarProps {
  conversations: Conversation[];
  activeId: string;
  currentUserId?: string;
  onSelectConversation: (id: string) => void;
  onlineUsers: Set<string>;
  onConversationUpdate?: () => void;
}

export default function ChatSidebar({
  conversations = [],
  activeId,
  currentUserId,
  onSelectConversation,
  onlineUsers,
  onConversationUpdate,
}: ChatSidebarProps) {
  const safeConversations = useMemo(() => {
    return Array.isArray(conversations) ? conversations : [];
  }, [conversations]);

  const [decryptedPreviews, setDecryptedPreviews] = useState<Record<string, string>>({});
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUserId) return;
    let isMounted = true;

    async function processSidebarPreviews() {
      const updates: Record<string, string> = {};

      for (const conv of safeConversations) {
        const lastMsgObj = conv.messages?.[0];
        if (!lastMsgObj) continue;

        if (!lastMsgObj.body) continue;

        if (lastMsgObj.keys && lastMsgObj.keys.length > 0) {
          try {
            const plainText = await decryptMessage(lastMsgObj.body, lastMsgObj.keys, currentUserId);
            if (plainText) {
              updates[conv.id] = plainText;
            }
          } catch (error) {
            console.error(`Sidebar decryption error for conv ${conv.id}:`, error);
          }
        } else {
          updates[conv.id] = lastMsgObj.body;
        }
      }

      if (isMounted && Object.keys(updates).length > 0) {
        setDecryptedPreviews((prev) => ({ ...prev, ...updates }));
      }
    }

    processSidebarPreviews();

    return () => {
      isMounted = false;
    };
  }, [safeConversations, currentUserId]);

  const handleConversationClick = async (convId: string, unreadCount: number) => {
    onSelectConversation(convId);
    setOpenMenuId(null);

    if (socket && socket.connected && unreadCount > 0) {
      try {
        socket.emit("mark_conversation_as_read", { conversationId: convId });
      } catch (error) {
        console.error("Failed to mark as read via socket", error);
      }
    }
  };

  const handleToggleMute = async (e: React.MouseEvent, convId: string) => {
    e.stopPropagation();
    setOpenMenuId(null);
    try {
      await api.patch(`/conversations/${convId}/mute`);
      if (onConversationUpdate) onConversationUpdate();
    } catch (error) {
      console.error("Failed to toggle mute", error);
    }
  };

  const handleDeleteChat = async (e: React.MouseEvent, convId: string) => {
    e.stopPropagation();
    setOpenMenuId(null);
    if (!window.confirm("Are you sure you want to remove this conversation?")) return;

    try {
      await api.delete(`/conversations/${convId}`);
      if (onConversationUpdate) onConversationUpdate();
    } catch (error) {
      console.error("Failed to delete conversation", error);
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-background">
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {safeConversations.length === 0 ? (
          <p className="text-xs text-center text-muted-foreground py-8">
            No conversations found
          </p>
        ) : (
          safeConversations.map((conv: any) => {
            const usersList = conv.users || [];
            const otherUser = currentUserId
              ? usersList.find((u: any) => u.id !== currentUserId) || usersList[0]
              : usersList[0];

            const isOnline = !conv.isGroup && otherUser?.id && onlineUsers.has(otherUser.id);
            const chatName = conv.isGroup
              ? conv.name || "Group Chat"
              : otherUser?.name || conv.name || "Unknown User";
            const avatarImage = conv.isGroup ? conv.image : otherUser?.image;
            const isMuted = conv.isMuted || false;

            const lastMsgObj = conv.messages?.[0];
            let lastMessageText = "No messages yet";

            if (lastMsgObj) {
              const isMyMessage = lastMsgObj.senderId === currentUserId;
              const senderName = isMyMessage ? "You" : lastMsgObj.sender?.name || "Someone";
              const isDeleted = !lastMsgObj.body && !lastMsgObj.image && !lastMsgObj.fileUrl;

              const reactions = lastMsgObj.reactions || [];
              const latestReaction = reactions.length > 0 ? reactions[reactions.length - 1] : null;

              if (isDeleted) {
                lastMessageText = conv.isGroup
                  ? `${senderName} deleted a message`
                  : isMyMessage ? "You deleted a message" : `${chatName} deleted a message`;
              } else if (latestReaction) {
                const isMyReaction = latestReaction.userId === currentUserId;
                const reactorName = isMyReaction ? "You" : chatName.split(" ")[0];
                lastMessageText = `${reactorName} reacted ${latestReaction.emoji} to this message`;
              } else {
                const decryptedText = decryptedPreviews[conv.id];
                const rawBody = lastMsgObj.body;

                let textContent = "";
                if (decryptedText && !decryptedText.startsWith("{")) {
                  textContent = decryptedText;
                } else if (rawBody && !rawBody.trim().startsWith("{")) {
                  textContent = rawBody;
                } else if (lastMsgObj.image) {
                  textContent = "📷 Photo";
                } else if (lastMsgObj.fileUrl) {
                  textContent = "📁 Attachment";
                } else {
                  textContent = "New message";
                }

                lastMessageText = conv.isGroup ? `${senderName}: ${textContent}` : textContent;
              }
            }

            const unreadCount = conv.unreadCount || 0;
            const isMenuOpen = openMenuId === conv.id;

            return (
              <div
                key={conv.id}
                onClick={() => handleConversationClick(conv.id, unreadCount)}
                className={`w-full text-left p-2.5 rounded-lg transition-all flex items-center justify-between gap-2 relative cursor-pointer group ${
                  activeId === conv.id
                    ? "bg-muted font-medium"
                    : "hover:bg-muted/50"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="relative shrink-0">
                    <Avatar className="h-10 w-10">
                      {avatarImage && <AvatarImage src={avatarImage} alt={chatName} />}
                      <AvatarFallback className="text-xs font-semibold bg-muted">
                        {conv.isGroup ? (
                          <Users className="h-4 w-4 text-muted-foreground" />
                        ) : chatName ? (
                          chatName.slice(0, 2).toUpperCase()
                        ) : (
                          "CU"
                        )}
                      </AvatarFallback>
                    </Avatar>

                    {isOnline && (
                      <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 ring-2 ring-background" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-0.5">
                      <p className={`text-sm truncate flex items-center gap-1.5 ${unreadCount > 0 ? "font-bold text-foreground" : "font-semibold"}`}>
                        <span className="truncate">{chatName}</span>
                        {isMuted && <BellOff size={12} className="text-muted-foreground shrink-0" />}
                      </p>
                      {lastMsgObj?.createdAt && (
                        <span className={`text-[10px] shrink-0 ml-1 ${unreadCount > 0 ? "font-bold text-primary" : "text-muted-foreground"}`}>
                          {formatTime(lastMsgObj.createdAt)}
                        </span>
                      )}
                    </div>

                    <div className="flex justify-between items-center gap-1">
                      <p
                        className={`text-xs truncate ${
                          unreadCount > 0
                            ? "font-bold text-foreground"
                            : "text-muted-foreground"
                        }`}
                      >
                        {lastMessageText}
                      </p>

                      {unreadCount > 0 && (
                        <span className="bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 min-w-[18px] text-center">
                          {unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* 🌟 রেসপন্সিভ থ্রি-ডট মেনু (মোবাইলে সবসময় দেখাবে, ল্যাপটপে হোভারে দেখাবে) */}
                <div className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => setOpenMenuId(isMenuOpen ? null : conv.id)}
                    className={`p-1.5 rounded-full hover:bg-background text-muted-foreground transition-opacity ${
                      isMenuOpen ? "opacity-100 bg-background shadow-sm" : "opacity-100 md:opacity-0 md:group-hover:opacity-100"
                    }`}
                  >
                    <MoreVertical size={16} />
                  </button>

                  {isMenuOpen && (
                    <div className="absolute right-0 top-8 w-36 bg-popover border border-border rounded-md shadow-lg py-1 z-50">
                      <button
                        onClick={(e) => handleToggleMute(e, conv.id)}
                        className="w-full text-left px-3 py-2 text-xs flex items-center gap-2 hover:bg-muted text-foreground"
                      >
                        {isMuted ? <Bell size={14} /> : <BellOff size={14} />}
                        {isMuted ? "Unmute Chat" : "Mute Chat"}
                      </button>
                      <button
                        onClick={(e) => handleDeleteChat(e, conv.id)}
                        className="w-full text-left px-3 py-2 text-xs flex items-center gap-2 text-destructive hover:bg-muted"
                      >
                        <Trash2 size={14} />
                        Delete Chat
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}