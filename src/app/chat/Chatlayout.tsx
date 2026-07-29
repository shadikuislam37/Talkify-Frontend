"use client";

import React, { useState, useEffect } from "react";
import ChatSidebar from "@/components/chat/chat-sidebar";
import ChatBox from "@/components/chat/chat-box";
import NewChatModal from "@/components/chat/new-chat-modal";
import CreateGroupModal from "@/components/chat/create-group-modal";
import { useChat } from "@/hooks/use-chat";
import { authClient } from "@/lib/auth-client";

interface ChatLayoutProps {
  currentUserId?: string;
  currentUserName?: string;
}

export const ChatLayout = ({
  currentUserId: propUserId,
  currentUserName: propUserName,
}: ChatLayoutProps) => {
  const { data: session } = authClient.useSession();
  
  const currentUserId = propUserId || session?.user?.id;
  const currentUserName = propUserName || session?.user?.name || "Someone";

  // ১. কনভারসেশন ফেচিং
  const { data: conversations = [], isLoading } = useChat.useGetConversations();

  // 🌟 ২. ইউজারদের লিস্ট বের করা (গ্রুপে অ্যাড করার জন্য)
  // আপনার যদি সার্চ ইউজারের হুক বা অল ইউজার হুক থাকে
  const { data: searchUsers = [] } = useChat.useSearchUsers(""); 

  const [activeConversationId, setActiveConversationId] = useState<string>("");

  useEffect(() => {
    if (conversations.length > 0 && !activeConversationId) {
      setActiveConversationId(conversations[0].id);
    }
  }, [conversations, activeConversationId]);

  // 🌟 অ্যাক্টিভ চ্যাটের সম্পূর্ণ অবজেক্টটি খুঁজে বের করা
  const activeConversation = conversations.find(
    (c: any) => c.id === activeConversationId
  );

  // 🌟 গ্রুপে যুক্ত করার মতো ইউজার লিস্ট তৈরি করা (সব চ্যাটের ইউনিক ইউজারদের নিয়ে)
  const allAvailableUsers = React.useMemo(() => {
    const userMap = new Map();
    conversations.forEach((conv: any) => {
      conv.users?.forEach((u: any) => {
        if (u.id !== currentUserId) {
          userMap.set(u.id, u);
        }
      });
    });
    return Array.from(userMap.values());
  }, [conversations, currentUserId]);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Sidebar Section */}
      <aside className="h-full flex flex-col border-r w-80">
        <div className="p-4 border-b flex justify-between items-center bg-background">
          <h2 className="font-bold text-lg">Chats</h2>
          <div className="flex items-center gap-1">
            {/* 🔍 User Search Modal */}
            <NewChatModal
              onSelectConversation={(id) => setActiveConversationId(id)}
            />
            {/* 👥 Create Group Modal (🌟 এখানে userList পাস করা হলো) */}
            <CreateGroupModal userList={allAvailableUsers} />
          </div>
        </div>

        {/* Sidebar List */}
        <div className="flex-1 overflow-hidden">
          {isLoading ? (
            <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
              Loading chats...
            </div>
          ) : (
            <ChatSidebar
              conversations={conversations}
              activeId={activeConversationId}
              currentUserId={currentUserId}
              onSelectConversation={(id) => setActiveConversationId(id)}
            />
          )}
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 h-full flex flex-col">
        {activeConversationId ? (
          <ChatBox
            key={activeConversationId}
            conversationId={activeConversationId}
            currentUserId={currentUserId}
            currentUserName={currentUserName}
            conversation={activeConversation} // 🌟 conversation পাস করা হলো
            availableUsers={allAvailableUsers} // 🌟 availableUsers পাস করা হলো
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-2">
            <div className="text-4xl">💬</div>
            <p className="text-sm font-medium">
              Select a conversation from the sidebar to start chatting
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

export default ChatLayout;