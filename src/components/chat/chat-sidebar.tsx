"use client";

import React, { useEffect, useState, useMemo } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Conversation } from "@/types";
import { formatTime } from "@/lib/utils";
import { Users } from "lucide-react";
import { socket } from "@/lib/socket";
import { decryptMessage } from "@/lib/crypto";

interface ChatSidebarProps {
  conversations: Conversation[];
  activeId: string;
  currentUserId?: string;
  onSelectConversation: (id: string) => void;
  onlineUsers: Set<string>;
}

export default function ChatSidebar({
  conversations = [],
  activeId,
  currentUserId,
  onSelectConversation,
  onlineUsers,
}: ChatSidebarProps) {
  const safeConversations = useMemo(() => {
    return Array.isArray(conversations) ? conversations : [];
  }, [conversations]);

  const [decryptedPreviews, setDecryptedPreviews] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!currentUserId) return;
    let isMounted = true;

    async function processSidebarPreviews() {
      const updates: Record<string, string> = {};

      for (const conv of safeConversations) {
        const lastMsgObj = conv.messages?.[0];
        if (!lastMsgObj) continue;

        // ১. যদি মেসেজে বডি না থাকে কিন্তু ছবি বা ফাইল থাকে
        if (!lastMsgObj.body) {
          continue;
        }

        console.log("DEBUG SIDEBAR MESSAGE:", {
          convId: conv.id,
          body: lastMsgObj.body,
          keys: lastMsgObj.keys,
          currentUserId,
        });
        // ২. যদি মেসেজটি এনক্রিপ্টেড হয় (যাতে JSON অবজেক্ট বা iv স্ট্রিং সরাসরি না দেখায়)
        if (lastMsgObj.keys && lastMsgObj.keys.length > 0) {
          try {
            // চ্যাটবক্সের মতো হুবহু একই লজিক দিয়ে ডিক্রিপ্ট করা হচ্ছে
            const plainText = await decryptMessage(lastMsgObj.body, lastMsgObj.keys, currentUserId);
            if (plainText) {
              updates[conv.id] = plainText;
            }
          } catch (error) {
            // ডিবাগিং মোড: ডিক্রিপশনে কেন ফেল করছে কনসোলে ট্র্যাক করবে কিন্তু UI নষ্ট করবে না
            console.error(`Sidebar decryption error for conv ${conv.id}:`, error);
          }
        } else {
          // যদি এনক্রিপ্টেড না হয়ে সাধারণ টেক্সট হয়
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

    if (socket && socket.connected && unreadCount > 0) {
      try {
        socket.emit("mark_conversation_as_read", { conversationId: convId });
      } catch (error) {
        console.error("Failed to mark as read via socket", error);
      }
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
                lastMessageText = `${reactorName} reacted: ${latestReaction.emoji}`;
              } else {
                // স্টেট থেকে সঠিক ডিক্রিপ্টেড টেক্সট নেওয়া হচ্ছে
                const decryptedText = decryptedPreviews[conv.id];
                const rawBody = lastMsgObj.body;

                // সুনিশ্চিত করা হচ্ছে যেন কোনো অবস্থাতেই র এনক্রিপ্টেড জেসন বা iv স্ট্রিং স্ক্রিনে না আসে
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

            return (
              <div
                key={conv.id}
                onClick={() => handleConversationClick(conv.id, unreadCount)}
                className={`w-full text-left p-2.5 rounded-lg transition-all flex items-center gap-3 relative cursor-pointer ${
                  activeId === conv.id
                    ? "bg-muted font-medium"
                    : "hover:bg-muted/50"
                }`}
              >
                <div className="relative">
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
                    <p className={`text-sm truncate ${unreadCount > 0 ? "font-bold text-foreground" : "font-semibold"}`}>
                      {chatName}
                    </p>
                    {lastMsgObj?.createdAt && (
                      <span className={`text-[10px] shrink-0 ${unreadCount > 0 ? "font-bold text-primary" : "text-muted-foreground"}`}>
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
            );
          })
        )}
      </div>
    </div>
  );
}