"use client";

import React, { useRef, useState } from "react";
import { useForm } from "@tanstack/react-form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Send, Paperclip, X, FileText, Film, Music } from "lucide-react";
import { useMessage } from "@/hooks/use-messages";
import { useSocket } from "@/hooks/use-socket";
import { SendMessageInput, sendMessageSchema } from "@/schemas/chat.schema";
import Image from "next/image";
import { useChatStore } from "@/store/use-chat-store";

export const MessageInput = () => {
  const { activeConversationId } = useChatStore();
  const { socket } = useSocket(activeConversationId || undefined);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [isUploading, setIsUploading] = useState(false);
  const [mediaPreview, setMediaPreview] = useState<{
    url: string;
    type: string;
    name: string;
  } | null>(null);

  const { mutateAsync: sendMessage, isPending } = useMessage.useSendMessage();

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
        setMediaPreview(null);
      } catch (error) {
        console.error("Failed to send message:", error);
      }
    },
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/media/upload`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (data.success) {
        form.setFieldValue("image", data.data.fileUrl);
        setMediaPreview({
          url: data.data.fileUrl,
          type: file.type,
          name: file.name,
        });
      } else {
        alert(data.message || "File upload failed!");
      }
    } catch (error) {
      console.error("Upload error:", error);
      alert("Something went wrong while uploading!");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemoveMedia = () => {
    form.setFieldValue("image", "");
    setMediaPreview(null);
  };

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
      {/* 🌟 ফাইল প্রিভিউ অংশ */}
      {mediaPreview && (
        <div className="relative w-fit flex items-center gap-2 p-2 bg-muted rounded-md border">
          {mediaPreview.type.startsWith("image/") ? (
            <div className="relative w-16 h-16 rounded overflow-hidden">
              <Image
                src={mediaPreview.url}
                alt="upload preview"
                fill
                className="object-cover"
                unoptimized
              />
            </div>
          ) : mediaPreview.type.startsWith("video/") ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground p-2">
              <Film className="h-5 w-5 text-primary" />
              <span className="max-w-[150px] truncate">{mediaPreview.name}</span>
            </div>
          ) : mediaPreview.type.startsWith("audio/") ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground p-2">
              <Music className="h-5 w-5 text-primary" />
              <span className="max-w-[150px] truncate">{mediaPreview.name}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-muted-foreground p-2">
              <FileText className="h-5 w-5 text-primary" />
              <span className="max-w-[150px] truncate">{mediaPreview.name}</span>
            </div>
          )}

          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="h-6 w-6 rounded-full absolute -top-2 -right-2"
            onClick={handleRemoveMedia}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      <div className="flex gap-2 items-center">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          accept="image/*,application/pdf,video/*,audio/*"
        />

        <Button
          type="button"
          variant="outline"
          size="icon"
          disabled={isPending || isUploading}
          onClick={() => fileInputRef.current?.click()}
        >
          {isUploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Paperclip className="h-4 w-4" />
          )}
        </Button>

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
                disabled={isPending || isUploading}
              />
              {field.state.meta.errors.length > 0 && (
                <span className="text-xs text-destructive mt-1">
                  {field.state.meta.errors.map((err) => (typeof err === "string" ? err : err?.message)).join(", ")}
                </span>
              )}
            </div>
          )}
        </form.Field>

        <Button type="submit" disabled={isPending || isUploading} size="icon">
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