"use client";

import React, { useRef } from "react";
import { useForm } from "@tanstack/react-form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button"; // 🌟 shadcn/ui Button
import { Loader2, Send } from "lucide-react";
import { useChatStore } from "@/store/use-chat-store";
import { useChat } from "@/hooks/use-chat";
import { useSocket } from "@/hooks/use-socket";
import { SendMessageInput, sendMessageSchema } from "@/schemas/chat.schema";

export const MessageInput = () => {
  const { activeConversationId } = useChatStore();
  const { socket } = useSocket(activeConversationId || undefined);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { mutateAsync: sendMessage, isPending } = useChat.useSendMessage();

  const form = useForm({
    defaultValues: {
      body: "",
      image: "",
      conversationId: activeConversationId || "",
    } as SendMessageInput,
    validators: { onChange: sendMessageSchema },
    onSubmit: async ({ value }) => {
      if (!activeConversationId || (!value.body?.trim() && !value.image?.trim())) return;

      try {
        if (socket) socket.emit("typing_stop", { conversationId: activeConversationId });

        const payload = {
          conversationId: activeConversationId,
          body: value.body?.trim() ? value.body.trim() : undefined,
          image: value.image?.trim() ? value.image.trim() : undefined,
        };

        const newMsg = await sendMessage(payload);

        if (socket && newMsg) {
          socket.emit("send_message", {
            conversationId: activeConversationId,
            message: newMsg,
          });
        }

        form.reset();
      } catch (error) {
        console.error("Failed to send message:", error);
      }
    },
  });

  const handleInputChange = (text: string) => {
    if (!socket || !activeConversationId) return;

    if (text.trim().length > 0) {
      socket.emit("typing_start", { conversationId: activeConversationId });

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit("typing_stop", { conversationId: activeConversationId });
      }, 2000);
    } else {
      socket.emit("typing_stop", { conversationId: activeConversationId });
    }
  };

  if (!activeConversationId) return null;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
      className="p-4 border-t flex flex-col gap-2 bg-background"
    >
      <div className="flex gap-2 items-center">
        <form.Field name="body">
          {(field) => (
            <div className="flex-1 flex flex-col">
              <Input
                name={field.name}
                value={field.state.value || ""}
                onChange={(e) => {
                  field.handleChange(e.target.value);
                  handleInputChange(e.target.value);
                }}
                onBlur={field.handleBlur}
                placeholder="Type a message..."
                autoComplete="off"
                disabled={isPending}
              />
              {field.state.meta.errors.length > 0 && (
                <span className="text-xs text-destructive mt-1">
                  {field.state.meta.errors.map((err) => (typeof err === "string" ? err : err?.message)).join(", ")}
                </span>
              )}
            </div>
          )}
        </form.Field>

        {/* 🌟 shadcn/ui Button কম্পোনেন্ট */}
        <Button type="submit" disabled={isPending} size="icon">
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </form>
  );
};

export default MessageInput;