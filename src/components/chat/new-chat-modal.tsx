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
  const [infoMessage, setInfoMessage] = useState<string | null>(null); // 🌟 ইনফো মেসেজের জন্য স্টেট
  const queryClient = useQueryClient();

  const { mutateAsync: createChat, isPending: isCreating } =
    useCreateOrGetOneToOne();

  const handleUserSelect = async (user: UserProfile) => {
    try {
      setInfoMessage(null); // আগের মেসেজ ক্লিয়ার করা
      const response: any = await createChat(user.id);
      
      const conversationId = response?.id || response?.data?.id || response?.conversation?.id;

      if (conversationId && onSelectConversation) {
        await queryClient.invalidateQueries({ queryKey: ["conversations"] });
        onSelectConversation(conversationId);
        setOpen(false);
      }
   } catch (error: any) {
      console.error("Full Error Object:", error); // 🌟 কনসোলে পুরো এররটি প্রিন্ট করে দেখুন
      console.error("Response Status:", error?.response?.status);
      console.error("Response Message:", error?.response?.data?.message);
      
      // যদি ব্যাকএন্ড থেকে মেসেজ রিকোয়েস্ট পাঠানো হয়
      if (
        error?.response?.status === 202 || 
        error?.response?.data?.message?.includes("request") || 
        error?.message?.includes("request") ||
        error?.status === 202
      ) {
        setInfoMessage("Message request sent! They will appear in chats once accepted.");
        
        setTimeout(() => {
          setOpen(false);
          setInfoMessage(null);
        }, 1000);
      } else {
        // যদি অন্য কোনো এরর হয়, সেটিও স্ক্রিনে দেখতে পারেন
        setInfoMessage(error?.response?.data?.message || "Something went wrong!");
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => { setOpen(val); if(!val) setInfoMessage(null); }}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" title="New Chat">
          <Plus className="h-5 w-5" />
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Start New Conversation</DialogTitle>
        </DialogHeader>

        {/* 🌟 মডালের ভেতরে নোটিশ দেখানোর জায়গা */}
        {infoMessage && (
          <div className="p-3 bg-muted text-foreground text-sm rounded-md text-center font-medium border border-border">
            {infoMessage}
          </div>
        )}

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