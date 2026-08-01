"use client";

import React, { useState } from "react";
import { useForm } from "@tanstack/react-form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Send, X, FileText, Film, Music } from "lucide-react";
import { sendMessageSchema } from "@/schemas/chat.schema";
import Image from "next/image";
import { Message } from "@/types";
import MediaUploadButton from "./MediaUploadButton";

interface MessageInputProps {
  conversationId: string;
  currentUserId?: string;
  socket: any;
  replyingTo: Message | null;
  onCancelReply: () => void;
  onSendMessage: (payload: any) => Promise<any>;
  isSending: boolean;
  onTyping: (text: string) => void;
}

export const MessageInput = ({
  conversationId,
  currentUserId,
  socket,
  replyingTo,
  onCancelReply,
  onSendMessage,
  isSending,
  onTyping,
}: MessageInputProps) => {
  const [mediaPreview, setMediaPreview] = useState<{
    url: string;
    type: string;
    name: string;
  } | null>(null);

  const form = useForm({
    defaultValues: {
      body: "",
      fileUrl: "",
      fileType: "",
      fileName: "",
      conversationId: conversationId,
    } as any,
    validators: { onChange: sendMessageSchema },
    onSubmit: async ({ value }) => {
      const activeId = conversationId || value.conversationId;
      // 🌟 এখানে body অথবা mediaPreview.url যেকোনো একটা থাকলেই যেন সাবমিট এলাও হয়
      if (!activeId || (!value.body?.trim() && !mediaPreview?.url)) return;

      try {
        if (socket) socket.emit("typing_stop", { conversationId: activeId, userId: currentUserId });

        const payload = {
          conversationId: activeId,
          body: value.body?.trim() ? value.body.trim() : undefined,
          fileUrl: mediaPreview?.url || undefined,
          fileType: mediaPreview?.type || undefined,
          fileName: mediaPreview?.name || undefined,
          replyToId: replyingTo?.id || undefined,
        };

        form.reset({ body: "", fileUrl: "", fileType: "", fileName: "", conversationId: activeId });
        setMediaPreview(null);
        onCancelReply();

        const newMsg = await onSendMessage(payload);

        if (socket && newMsg) {
          socket.emit("send_message", { conversationId: activeId, message: newMsg });
        }
      } catch (error) {
        console.error("Failed to send message:", error);
      }
    },
  });

  const handleUploadComplete = (fileData: { url: string; name: string; type: string }) => {
    form.setFieldValue("fileUrl", fileData.url);
    form.setFieldValue("fileType", fileData.type);
    form.setFieldValue("fileName", fileData.name);
    
    setMediaPreview({
      url: fileData.url,
      type: fileData.type,
      name: fileData.name,
    });
  };

  const handleRemoveMedia = () => {
    form.setFieldValue("fileUrl", "");
    form.setFieldValue("fileType", "");
    form.setFieldValue("fileName", "");
    setMediaPreview(null);
  };

  return (
    <div className="flex flex-col border-t bg-background shrink-0 mt-auto">
      {/* Reply Preview Bar */}
      {replyingTo && (
        <div className="flex items-center justify-between p-2 bg-muted/80 border-b text-xs">
          <div className="truncate pr-2">
            <span className="font-bold text-primary block">
              Replying to {replyingTo.senderId === currentUserId ? "yourself" : replyingTo.sender?.name || "user"}
            </span>
            <span className="text-muted-foreground truncate block">{replyingTo.body || "Attachment"}</span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onCancelReply}
            className="h-6 w-6 rounded-full text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {/* Media Preview Box */}
      {/* Media Preview Box */}
      {mediaPreview && mediaPreview.url && (
        <div className="p-2 border-b bg-muted/40">
          <div className="relative w-fit flex items-center gap-2 p-2 bg-background rounded-md border shadow-sm">
            {mediaPreview.type.startsWith("image/") ? (
              <div className="relative w-14 h-14 rounded overflow-hidden bg-muted">
                <Image 
                  src={mediaPreview.url} 
                  alt="preview" 
                  fill 
                  className="object-cover" 
                  unoptimized 
                />
              </div>
            ) : mediaPreview.type.startsWith("video/") ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground p-1">
                <Film className="h-4 w-4 text-primary" />
                <span className="max-w-[150px] truncate">{mediaPreview.name}</span>
              </div>
            ) : mediaPreview.type.startsWith("audio/") ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground p-1">
                <Music className="h-4 w-4 text-primary" />
                <span className="max-w-[150px] truncate">{mediaPreview.name}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs text-muted-foreground p-1">
                <FileText className="h-4 w-4 text-primary" />
                <span className="max-w-[150px] truncate">{mediaPreview.name}</span>
              </div>
            )}

            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="h-5 w-5 rounded-full absolute -top-2 -right-2 shadow"
              onClick={handleRemoveMedia}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}

      {/* Main Input Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
        className="flex gap-2 items-center p-4"
      >
        <MediaUploadButton onUploadComplete={handleUploadComplete} />

        <form.Field name="body">
          {(field) => (
            <div className="flex-1">
              <Input
                name={field.name}
                value={field.state.value || ""}
                onChange={(e) => {
                  field.handleChange(e.target.value);
                  onTyping(e.target.value);
                }}
                onBlur={field.handleBlur}
                placeholder="Type a message..."
                autoComplete="off"
                disabled={isSending}
                className="h-10"
              />
            </div>
          )}
        </form.Field>

        {/* 🌟 সেন্ড বাটনে মিডিয়া প্রিভিউ বা বডি যেকোনো একটি থাকলেই যেন এটি সচল হয় */}
        <form.Subscribe
          selector={(state) => [state.values.body, mediaPreview]}
        >
          {([body, preview]) => (
            <Button
              type="submit"
              disabled={isSending || (!body?.trim() && !preview)}
              size="icon"
              className="h-10 w-10 shrink-0"
            >
              {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          )}
        </form.Subscribe>
      </form>
    </div>
  );
};

export default MessageInput;