"use client";

import React, { useState, useEffect } from "react";
import ChatSidebar from "@/components/chat/chat-sidebar";
import ChatBox from "@/components/chat/chat-box";
import NewChatModal from "@/components/chat/new-chat-modal";
import CreateGroupModal from "@/components/chat/create-group-modal";
import { authClient } from "@/lib/auth-client";
import { ArrowLeft, LogOut, Loader2, PanelLeft, Settings } from "lucide-react";
import { Conversation, AuthUser } from "@/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/use-auth-store";
import { useOnlineUsers } from "@/hooks/use-online-users";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import ProfileSettingsModal from "@/components/ProfileSettings";
import { useGetConversations } from "@/hooks/use-conversations";
import { useGetMe } from "@/hooks/use-me";
import { useSocket } from "@/hooks/use-socket";
import { useQueryClient } from "@tanstack/react-query";
import { useCallStore } from "@/store/use-call-store";
import E2EEPinModal from "@/components/E2EEPinModal";

interface ChatLayoutProps {
  currentUserId?: string;
  currentUserName?: string;
}

export const ChatLayout = ({
  currentUserId: propUserId,
  currentUserName: propUserName,
}: ChatLayoutProps) => {
  const router = useRouter();

  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const { data: session } = authClient.useSession();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const clearUser = useAuthStore((state) => state.clearUser);
  const queryClient = useQueryClient();

  const currentUserId = propUserId || session?.user?.id;
  const currentUserName = propUserName || session?.user?.name || "User";
  const currentUserEmail = session?.user?.email || "";
  const currentUserImage = session?.user?.image || "";
  
  const { data: meData, refetch: refetchMe } = useGetMe(!!currentUserId);
  const currentUserPublicKey = meData?.publicKey || null;
  
  const onlineUsers = useOnlineUsers();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const { data: conversations = [], isLoading } = useGetConversations();
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);

  const { setIncomingCall, incomingCall } = useCallStore();

  const activeConversationId = selectedConversationId;

  const activeConversation = conversations.find(
    (c: Conversation) => c.id === activeConversationId
  );

  const { socket } = useSocket(
    activeConversationId || undefined,
    currentUserId,
    (offerData) => setIncomingCall(offerData),
    undefined,
    undefined,
    () => setIncomingCall(null)
  );

  const handleSelectConversation = async (id: string) => {
    setSelectedConversationId(id);

    queryClient.setQueryData(["conversations"], (oldData: any) => {
      if (!oldData) return oldData;
      return oldData.map((conv: any) =>
        conv.id === id ? { ...conv, unreadCount: 0 } : conv
      );
    });

    if (socket && socket.connected) {
      socket.emit("mark_conversation_as_read", { conversationId: id });
    }

    // 🌟 নতুন চ্যাট সিলেক্ট করার সাথে সাথে ক্যাশ সিঙ্ক ও রিফেচ নিশ্চিত করা হলো
    await queryClient.invalidateQueries({ queryKey: ["conversations"] });
    await queryClient.refetchQueries({ queryKey: ["conversations"] });
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await authClient.signOut({
        fetchOptions: {
          onSuccess: () => {
            if (clearUser) clearUser();
            router.push("/sign-in");
            router.refresh();
          },
        },
      });
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const allAvailableUsers = React.useMemo(() => {
    const userMap = new Map<string, AuthUser>();
    conversations.forEach((conv: Conversation) => {
      conv.users?.forEach((u: AuthUser) => {
        if (u.id !== currentUserId) {
          userMap.set(u.id, u);
        }
      });
    });
    return Array.from(userMap.values());
  }, [conversations, currentUserId]);

  if (!isMounted) {
    return null;
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background relative">
      {currentUserId && meData && (
        <E2EEPinModal
          currentUser={{ ...meData, id: currentUserId }}
          onKeysReset={() => refetchMe()}
        />
      )}

      <aside
        className={`h-full flex-col border-r transition-all duration-300 ${
          isSidebarOpen ? "w-full md:w-80 flex" : "hidden"
        } ${activeConversationId ? "max-md:hidden" : "max-md:flex"}`}
      >
        <div className="p-3 border-b flex items-center justify-between bg-muted/30">
          <div className="flex items-center gap-2.5 min-w-0">
            <Avatar className="h-9 w-9 border">
              <AvatarImage src={currentUserImage} alt={currentUserName} />
              <AvatarFallback className="text-xs font-semibold">
                {currentUserName ? currentUserName.slice(0, 2).toUpperCase() : "CU"}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-semibold truncate leading-none">
                {currentUserName}
              </span>
              <span className="text-xs text-muted-foreground truncate mt-0.5">
                {currentUserEmail}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-0.5">
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0"
                  title="Settings"
                >
                  <Settings className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-sm">
                <DialogHeader>
                  <DialogTitle>Settings & Privacy</DialogTitle>
                </DialogHeader>
                <div className="py-2">
                  <ProfileSettingsModal
                    currentName={currentUserName}
                    currentImage={currentUserImage}
                    initialVisibility={true}
                  />
                </div>
              </DialogContent>
            </Dialog>

            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              disabled={isLoggingOut}
              title="Log Out"
              className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
            >
              {isLoggingOut ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <LogOut className="h-4 w-4" />
              )}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSidebarOpen(false)}
              className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0 hidden md:flex"
              title="Hide Sidebar"
            >
              <PanelLeft className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="p-3 border-b flex justify-between items-center bg-background">
          <h2 className="font-bold text-base">Chats</h2>
          <div className="flex items-center gap-1">
            <NewChatModal
              currentUserId={currentUserId}
              onSelectConversation={handleSelectConversation}
            />
            <CreateGroupModal
              userList={allAvailableUsers}
              currentUserId={currentUserId}
            />
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          {isLoading ? (
            <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
              Loading chats...
            </div>
          ) : (
            <ChatSidebar
              conversations={conversations}
              activeId={activeConversationId || ""}
              currentUserId={currentUserId}
              onSelectConversation={handleSelectConversation}
              onlineUsers={onlineUsers}
            />
          )}
        </div>
      </aside>

      <main
        className={`flex-1 h-full flex-col relative ${
          activeConversationId ? "flex" : "hidden md:flex"
        }`}
      >
        {!isSidebarOpen && (
          <div className="hidden md:flex items-center absolute top-2.5 left-3 z-30">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setIsSidebarOpen(true)}
              className="h-9 w-9 text-muted-foreground hover:text-foreground bg-background shadow-md rounded-lg"
              title="Show Sidebar"
            >
              <PanelLeft className="h-4 w-4" />
            </Button>
          </div>
        )}

        {activeConversationId ? (
          <div className="flex-1 flex flex-col h-full relative">
            <div className="md:hidden absolute top-3 left-3 z-20">
              <button
                onClick={() => setSelectedConversationId(null)}
                className="p-1.5 rounded-full hover:bg-muted text-muted-foreground"
                title="Back to chats"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 h-full flex flex-col pt-0 overflow-hidden">
              <ChatBox
                key={activeConversationId}
                conversationId={activeConversationId}
                currentUserId={currentUserId}
                currentUserName={currentUserName}
                conversation={activeConversation}
                availableUsers={allAvailableUsers}
                currentUserPublicKey={currentUserPublicKey}
              />
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-2 relative">
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
