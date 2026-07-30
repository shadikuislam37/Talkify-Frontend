"use client";

import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useOnlineUsers } from "@/hooks/use-online-users";
import { Conversation } from "@/types";
import { formatTime } from "@/lib/utils";
import { Users } from "lucide-react";

interface ChatSidebarProps {
  conversations: Conversation[];
  activeId: string;
  currentUserId?: string;
  onSelectConversation: (id: string) => void;
}

export default function ChatSidebar({
  conversations = [],
  activeId,
  currentUserId,
  onSelectConversation,
}: ChatSidebarProps) {
  const onlineUsers = useOnlineUsers();
  const safeConversations = Array.isArray(conversations) ? conversations : [];

  return (
    <div className="w-full h-full flex flex-col bg-background">
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {safeConversations.length === 0 ? (
          <p className="text-xs text-center text-muted-foreground py-8">
            No conversations found
          </p>
        ) : (
          safeConversations.map((conv) => {
            const usersList = conv.users || [];
            const otherUser = currentUserId
              ? usersList.find((u) => u.id !== currentUserId) || usersList[0]
              : usersList[0];

            // ১-টু-১ চ্যাটের জন্য অনলাইন স্ট্যাটাস
            const isOnline = !conv.isGroup && otherUser?.id && onlineUsers.has(otherUser.id);

            const chatName = conv.isGroup
              ? conv.name || "Group Chat"
              : otherUser?.name || conv.name || "Unknown User";

            // 🌟 গ্রুপের ক্ষেত্রে ছবি থাকলে conv.image, অন্যথা ১-টু-১ యూজারের ছবি
            const avatarImage = conv.isGroup ? conv.image : otherUser?.image;

            const lastMsgObj = conv.messages?.[0];
            
            // 🌟 গ্রুপের লাস্ট মেসেজে প্রেরকের নাম যোগ করা (যেমন: "Karim: Hello")
            let lastMessageText = "No messages yet";
            if (lastMsgObj) {
              const senderName =
                lastMsgObj.senderId === currentUserId
                  ? "You"
                  : lastMsgObj.sender?.name?.split(" ")[0] || "Someone";

              const content = lastMsgObj.body || (lastMsgObj.image ? "📷 Photo" : "");

              lastMessageText = conv.isGroup
                ? `${senderName}: ${content}`
                : content;
            }

            // আনরিড মেসেজ চেক
            const isUnread =
              lastMsgObj &&
              lastMsgObj.senderId !== currentUserId &&
              !lastMsgObj.reads?.some((r) => String(r.userId) === String(currentUserId));

            return (
              <button
                key={conv.id}
                onClick={() => onSelectConversation(conv.id)}
                className={`w-full text-left p-2.5 rounded-lg transition-all flex items-center gap-3 relative ${
                  activeId === conv.id
                    ? "bg-muted font-medium"
                    : "hover:bg-muted/50"
                }`}
              >
                {/* Avatar with Online Status Indicator */}
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

                {/* Chat Name & Message Preview */}
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-0.5">
                    <p className="text-sm font-semibold truncate">{chatName}</p>
                    {lastMsgObj?.createdAt && (
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {formatTime(lastMsgObj.createdAt)}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex justify-between items-center gap-1">
                    <p
                      className={`text-xs truncate ${
                        isUnread
                          ? "font-bold text-foreground"
                          : "text-muted-foreground"
                      }`}
                    >
                      {lastMessageText}
                    </p>
                    {isUnread && (
                      <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}