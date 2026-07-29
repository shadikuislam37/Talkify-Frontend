"use client";

import React, { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useChat } from "@/hooks/use-chat";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Plus, Search, Loader2 } from "lucide-react";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  image?: string | null;
}

interface NewChatModalProps {
  onSelectConversation?: (conversationId: string) => void;
}

export default function NewChatModal({ onSelectConversation }: NewChatModalProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const queryClient = useQueryClient();

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const { data: usersData = [], isLoading } = useChat.useSearchUsers(debouncedQuery);
  const users = usersData as UserProfile[];

  const { mutateAsync: createChat, isPending: isCreating } = useChat.useCreateOrGetOneToOne();

  const handleUserClick = async (targetUserId: string) => {
    try {
      const response: any = await createChat(targetUserId);
      // ব্যাকএন্ড response.data অথবা response সরাসরি পাঠায়
      const conversationId = response?.id || response?.data?.id;

      // 🌟 ১. চ্যাট লিস্ট রিফ্রেশ করা (Invalidation)
      await queryClient.invalidateQueries({ queryKey: ["conversations"] });

      // 🌟 ২. অ্যাক্টিভ চ্যাট হিসেবে সিলেক্ট করা
      if (conversationId && onSelectConversation) {
        onSelectConversation(conversationId);
      }

      setOpen(false);
      setQuery("");
    } catch (error) {
      console.error("Failed to create conversation:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger  asChild>
        <Button variant="ghost" size="icon" title="New Chat">
          <Plus className="h-5 w-5" />
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Start New Conversation</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search user by name or email..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="max-h-60 overflow-y-auto space-y-1">
            {isLoading ? (
              <div className="flex justify-center items-center py-6 text-muted-foreground gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-xs">Searching users...</span>
              </div>
            ) : users.length === 0 && debouncedQuery.length > 0 ? (
              <p className="text-center text-xs text-muted-foreground py-6">
                No users found.
              </p>
            ) : (
              users.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  disabled={isCreating}
                  onClick={() => handleUserClick(user.id)}
                  className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted cursor-pointer transition-colors text-left disabled:opacity-50"
                >
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={user.image || undefined} />
                    <AvatarFallback>
                      {user.name ? user.name.slice(0, 2).toUpperCase() : "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 overflow-hidden">
                    <p className="font-medium text-sm truncate">{user.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {user.email}
                    </p>
                  </div>
                  {isCreating && (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}