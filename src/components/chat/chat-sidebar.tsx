"use client";

import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export interface ConversationUser {
  id: string;
  name: string;
  image?: string | null;
}

export interface ConversationMessage {
  id: string;
  body?: string | null;
  image?: string | null;
}

export interface Conversation {
  id: string;
  isGroup?: boolean;
  name?: string | null;
  users?: ConversationUser[];
  messages?: ConversationMessage[];
}

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
  const safeConversations = Array.isArray(conversations) ? conversations : [];

  return (
    <div className="w-full h-full flex flex-col bg-background">
      {/* 🔴 এখান থেকে 'Chats' টাইটেল রিমুভ করা হয়েছে যাতে ২ বার না আসে */}
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

            const chatName = conv.isGroup
              ? conv.name || "Group Chat"
              : otherUser?.name || conv.name || "Unknown User";

            const lastMsgObj = conv.messages?.[0];
            const lastMessageText = lastMsgObj
              ? lastMsgObj.body || (lastMsgObj.image ? "📷 Photo" : "")
              : "No messages yet";

            const avatarImage = conv.isGroup ? undefined : otherUser?.image;

            return (
              <button
                key={conv.id}
                onClick={() => onSelectConversation(conv.id)}
                className={`w-full text-left p-3 rounded-md transition-colors flex items-center gap-3 ${
                  activeId === conv.id
                    ? "bg-muted font-medium"
                    : "hover:bg-muted/50"
                }`}
              >
                <Avatar className="h-10 w-10">
                  {avatarImage && <AvatarImage src={avatarImage} alt={chatName} />}
                  <AvatarFallback className="text-xs">
                    {chatName ? chatName.slice(0, 2).toUpperCase() : "CU"}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{chatName}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {lastMessageText}
                  </p>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}