"use client";

import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
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
import { useCreateOrGetOneToOne } from "@/hooks/use-conversations";

interface NewChatModalProps {
  onSelectConversation?: (conversationId: string) => void;
  currentUserId?: string;
}

export default function NewChatModal({
  onSelectConversation,
  currentUserId,
}: NewChatModalProps) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const { mutateAsync: createChat, isPending: isCreating } =
    useCreateOrGetOneToOne();

  const handleUserSelect = async (user: UserProfile) => {
    try {
      const response: any = await createChat(user.id);
      
      // 🌟 ব্যাকএন্ড বা অ্যাক্সিওস রেসপন্স থেকে সেফলি কনভার্সেশন আইডি এক্সট্রাক্ট করা
      const conversationId = response?.id || response?.data?.id || response?.conversation?.id;

      // ১. কনভার্সেশন লিস্ট রিফ্রেশ করা
      await queryClient.invalidateQueries({ queryKey: ["conversations"] });

      // ২. চ্যাট সিলেক্ট করে উইন্ডো ওপেন করা
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

        <UserSearch
          onSelectUser={handleUserSelect}
          isLoadingAction={isCreating}
          excludeUserIds={currentUserId ? [currentUserId] : []}
          placeholder="Search user by name..."
        />
      </DialogContent>
    </Dialog>
  );
}