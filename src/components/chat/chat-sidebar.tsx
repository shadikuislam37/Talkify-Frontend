"use client";

import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useOnlineUsers } from "@/hooks/use-online-users";
import { Conversation } from "@/types";
import { formatTime } from "@/lib/utils";
import { Users } from "lucide-react";
// 🌟 আপনার প্রজেক্টের সকেট বা এপিআই হুক ইমপোর্ট করে নিন (যদি থাকে)
// import { useSocket } from "@/hooks/use-socket"; 

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
  
  // 🌟 সকেট থাকলে সেটি কল করুন
  // const { socket } = useSocket();

  // 🌟 নতুন ফাংশন: চ্যাটে ক্লিক করলে যা ঘটবে
  const handleConversationClick = async (convId: string, unreadCount: number) => {
    // ১. প্রথমে চ্যাট সিলেক্ট করে UI আপডেট করুন
    onSelectConversation(convId);

    // ২. যদি আনরিড মেসেজ থাকে, তবেই ব্যাকএন্ডে রিকোয়েস্ট পাঠান
    if (unreadCount > 0) {
      try {
        // অপশন ১: API কল করে seen করা (আপনার API রাউট অনুযায়ী পরিবর্তন করুন)
        // await fetch(`/api/conversations/${convId}/seen`, { method: "POST" });
        
        // অপশন ২: সকেট ইভেন্ট দিয়ে seen করা
        // if (socket) {
        //   socket.emit("mark_seen", { conversationId: convId });
        // }
      } catch (error) {
        console.error("Failed to mark as seen", error);
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
              
              if (isDeleted) {
                lastMessageText = conv.isGroup
                  ? `${senderName} deleted a message`
                  : isMyMessage ? "You deleted a message" : `${chatName} deleted a message`;
              } else {
                const content = lastMsgObj.body || (lastMsgObj.image ? "📷 Photo" : lastMsgObj.fileUrl ? "📁 Attachment" : "");
                lastMessageText = conv.isGroup ? `${senderName}: ${content}` : content;
              }
            }

            const unreadCount = conv.unreadCount || 0;

            return (
              <button
                key={conv.id}
                // 🌟 এখানে নতুন ফাংশনটি বসানো হয়েছে
                onClick={() => handleConversationClick(conv.id, unreadCount)}
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

                    {/* মেসেঞ্জারের মতো আনরেড কাউন্ট ব্যাজ */}
                    {unreadCount > 0 && (
                      <span className="bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 min-w-[18px] text-center">
                        {unreadCount}
                      </span>
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