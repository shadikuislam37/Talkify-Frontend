"use client";

import React from "react";
import { zodResolver } from "@hookform/resolvers/zod";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Send } from "lucide-react";
import { useChatStore } from "@/store/use-chat-store";
import { useChat } from "@/hooks/use-chat";
import { SendMessageInput, sendMessageSchema } from "@/schemas/chat.schema";

export const MessageInput = () => {
  const { activeConversationId } = useChatStore();

  // 🌟 useChat অবজেক্ট থেকে useSendMessage ব্যবহার করা হয়েছে
  const { mutateAsync: sendMessage, isPending } = useChat.useSendMessage();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SendMessageInput>({
    resolver: zodResolver(sendMessageSchema),
    defaultValues: {
      body: "",
      image: "",
      conversationId: activeConversationId || "",
    },
  });

  const onSubmit = async (data: SendMessageInput) => {
    if (!activeConversationId) return;

    try {
      await sendMessage({
        conversationId: activeConversationId,
        body: data.body?.trim() ? data.body.trim() : undefined,
        image: data.image?.trim() ? data.image.trim() : undefined,
      });

      reset({ body: "", image: "", conversationId: activeConversationId });
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  if (!activeConversationId) return null;

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="p-4 border-t flex flex-col gap-2 bg-background"
    >
      <div className="flex gap-2 items-center">
        <Input
          {...register("body")}
          placeholder="Type a message..."
          autoComplete="off"
          disabled={isPending}
          className="flex-1"
        />
        <Button type="submit" disabled={isPending} size="icon">
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>

      {errors.body && (
        <span className="text-xs text-destructive">
          {errors.body.message}
        </span>
      )}
    </form>
  );
};

export default MessageInput;