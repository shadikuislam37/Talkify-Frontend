"use client";

import React, { useState, useRef } from "react";
import { useForm } from "@tanstack/react-form";
import { Button } from "@/components/ui/button";
import { Loader2, Send, X, FileText, Film, Music, Smile } from "lucide-react";
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

const COMMON_EMOJIS = ["😊", "😂", "❤️", "👍", "🔥", "🎉", "😢", "😍", "🙏", "✨"];
const MAX_TEXTAREA_HEIGHT = 120;

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

  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const form = useForm({
    defaultValues: {
      body: "",
      fileUrl: "",
      fileType: "",
      fileName: "",
      conversationId: conversationId,
    } as any,
    validators: {
      onChange: sendMessageSchema,
    },
    onSubmit: async ({ value }) => {
      const activeId = conversationId || value.conversationId;
      if (!activeId || (!value.body?.trim() && !mediaPreview?.url)) return;

      const payload = {
        conversationId: activeId,
        body: value.body?.trim() ? value.body.trim() : undefined,
        fileUrl: mediaPreview?.url || undefined,
        fileType: mediaPreview?.type || undefined,
        fileName: mediaPreview?.name || undefined,
        replyToId: replyingTo?.id || undefined,
      };

      try {
        if (socket) {
          socket.emit("typing_stop", { conversationId: activeId, userId: currentUserId });
        }

        await onSendMessage(payload);

        form.setFieldValue("body", "");
        form.setFieldValue("fileUrl", "");
        form.setFieldValue("fileType", "");
        form.setFieldValue("fileName", "");
        setMediaPreview(null);
        onCancelReply();
        setShowEmojiPicker(false);

        if (textareaRef.current) {
          textareaRef.current.style.height = "auto";
        }
      } catch (error) {
        console.error("Failed to send message:", error);
      }
    },
  });

  const autoResize = (el: HTMLTextAreaElement) => {
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`;
  };

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

  const handleEmojiSelect = (emoji: string, field: any) => {
    const currentVal = field.state.value || "";
    const newVal = currentVal + emoji;
    field.handleChange(newVal);
    onTyping(newVal);
    if (textareaRef.current) {
      textareaRef.current.focus();
      autoResize(textareaRef.current);
    }
  };

  return (
    <div className="flex flex-col border-t bg-background shrink-0 mt-auto relative">
      {/* Reply Preview Bar */}
      {replyingTo && (
        <div className="flex items-center justify-between gap-2 p-2 bg-muted/80 border-b text-xs">
          <div className="truncate pr-2 min-w-0 flex-1">
            <span className="font-bold text-primary block truncate">
              Replying to {replyingTo.senderId === currentUserId ? "yourself" : replyingTo.sender?.name || "user"}
            </span>
            <span className="text-muted-foreground truncate block">{replyingTo.body || "Attachment"}</span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onCancelReply}
            className="h-6 w-6 rounded-full text-muted-foreground hover:text-foreground shrink-0"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {/* Media Preview Box */}
      {mediaPreview && mediaPreview.url && (
        <div className="p-2 border-b bg-muted/40">
          <div className="relative w-fit max-w-full flex items-center gap-2 p-2 bg-background rounded-md border shadow-sm">
            {mediaPreview.type?.startsWith("image/") ? (
              <div className="relative w-14 h-14 rounded overflow-hidden bg-muted shrink-0">
                <Image
                  src={mediaPreview.url}
                  alt="preview"
                  fill
                  sizes="56px"
                  className="object-cover"
                  unoptimized
                />
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs text-muted-foreground p-1 min-w-0">
                <FileText className="h-4 w-4 text-primary shrink-0" />
                <span className="max-w-[45vw] sm:max-w-[150px] truncate">{mediaPreview.name}</span>
              </div>
            )}

            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="h-5 w-5 rounded-full absolute -top-2 -right-2 shadow shrink-0"
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
        className="flex gap-1.5 sm:gap-2 items-end p-2 sm:p-4 relative"
      >
        <div className="shrink-0 pb-1">
          <MediaUploadButton onUploadComplete={handleUploadComplete} />
        </div>

        <form.Field name="body">
          {(field) => (
            <div className="flex-1 min-w-0 relative">
              <textarea
                ref={textareaRef}
                name={field.name}
                value={field.state.value || ""}
                rows={1}
                onChange={(e) => {
                  field.handleChange(e.target.value);
                  onTyping(e.target.value);
                  autoResize(e.target);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    if (field.state.value?.trim() || mediaPreview) {
                      form.handleSubmit();
                    }
                  }
                }}
                onBlur={field.handleBlur}
                placeholder="Type a message..."
                autoComplete="off"
               
                className="w-full resize-none overflow-y-auto min-h-[40px] max-h-[120px] rounded-md border border-input bg-background pl-3 pr-10 py-2.5 text-sm leading-5 ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />

              {/* 🌟 ইনপুট বক্সের ভেতরে ইমোজি বাটন */}
              <div className="absolute right-2 bottom-2.5 flex items-center">
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="text-muted-foreground hover:text-foreground transition-colors p-1"
                  title="Insert Emoji"
                >
                  <Smile className="h-5 w-5" />
                </button>

                {/* ইমোজি পিকার পপআপ */}
                {showEmojiPicker && (
                  <div className="absolute bottom-full right-0 mb-2 p-2 bg-background border rounded-xl shadow-xl flex flex-wrap gap-1.5 w-64 z-50">
                    {COMMON_EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => handleEmojiSelect(emoji, field)}
                        className="p-1.5 hover:bg-muted rounded-lg text-lg transition-transform hover:scale-125 cursor-pointer"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </form.Field>

     <form.Subscribe selector={(state) => [state.values.body, mediaPreview]}>
  {([body, preview]) => (
    <Button
      type="submit"
      disabled={!body?.trim() && !preview}
      size="icon"
      className="h-10 w-10 shrink-0"
    >
      <Send className="h-4 w-4" />
    </Button>
  )}
</form.Subscribe>
      </form>
    </div>
  );
};

export default MessageInput;