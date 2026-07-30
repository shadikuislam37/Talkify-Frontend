"use client";

import React, { useState } from "react";
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
import { Plus } from "lucide-react";
import { UserProfile } from "@/types";
import { UserSearch } from "./user-search";

interface NewChatModalProps {
  onSelectConversation?: (conversationId: string) => void;
  currentUserId?: string; // 🌟 নিজের আইডি ফিল্টার করার জন্য
}

export default function NewChatModal({
  onSelectConversation,
  currentUserId,
}: NewChatModalProps) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const { mutateAsync: createChat, isPending: isCreating } =
    useChat.useCreateOrGetOneToOne();

  const handleUserSelect = async (user: UserProfile) => {
    try {
      const response: any = await createChat(user.id);
      
      // ব্যাকএন্ড response.data অথবা response সরাসরি পাঠাতে পারে
      const conversationId = response?.id || response?.data?.id;

      // 🌟 ১. ইনবক্স চ্যাট লিস্ট রিফ্রেশ করা (Invalidation)
      await queryClient.invalidateQueries({ queryKey: ["conversations"] });

      // 🌟 ২. অ্যাক্টিভ চ্যাট সিলেক্ট করা
      if (conversationId && onSelectConversation) {
        onSelectConversation(conversationId);
      }

      setOpen(false);
    } catch (error) {
      console.error("Failed to create conversation:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" title="New Chat">
          <Plus className="h-5 w-5" />
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Start New Conversation</DialogTitle>
        </DialogHeader>

        {/* 🌟 আলাদা UserSearch কম্পোনেন্ট ব্যবহার করা হলো */}
        <UserSearch
          onSelectUser={handleUserSelect}
          isLoadingAction={isCreating}
          excludeUserIds={currentUserId ? [currentUserId] : []}
          placeholder="Search user by name or email..."
        />
      </DialogContent>
    </Dialog>
  );
}