"use client";

import React, { useState, useRef } from "react";
import { useForm } from "@tanstack/react-form";
import { Button } from "@/components/ui/button";
import { Send, X, FileText, Smile, Mic, Trash2 } from "lucide-react";
import { sendMessageSchema } from "@/schemas/chat.schema";
import Image from "next/image";
import { Message } from "@/types";
import MediaUploadButton from "./MediaUploadButton";
import { mediaApi } from "@/lib/api";

// 🌟 ইমোজি মার্ট ইম্পোর্ট
import Picker from "@emoji-mart/react";
import data from "@emoji-mart/data";

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

  // 🌟 ভয়েস রেকর্ডিং এর জন্য নতুন লোকাল স্টেট (অরিজিনাল কোডের লাইন ঠিক রেখে যুক্ত করা হয়েছে)
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isUploadingAudio, setIsUploadingAudio] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

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

  // 🌟 ভয়েস নোট রেকর্ডিং শুরু করার ফাংশন
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        stream.getTracks().forEach((track) => track.stop());
        await uploadAndSendAudio(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error("Microphone permission denied:", error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const uploadAndSendAudio = async (audioBlob: Blob) => {
    try {
      setIsUploadingAudio(true);
      const formData = new FormData();
      const file = new File([audioBlob], `voice-note-${Date.now()}.webm`, { type: "audio/webm" });
      formData.append("files", file);

      const res: any = await mediaApi.post("/media/upload", formData);

      const fileUrl = res.data?.data?.[0]?.fileUrl || res.fileUrl || res.url;

      if (fileUrl) {
        const payload = {
          conversationId,
          fileUrl: fileUrl,
          fileType: "audio/webm",
          fileName: `Voice Note - ${new Date().toLocaleTimeString()}`,
          replyToId: replyingTo?.id || undefined,
        };
        await onSendMessage(payload);
        onCancelReply();
      }
    } catch (error) {
      console.error("Failed to upload voice note:", error);
    } finally {
      setIsUploadingAudio(false);
    }
  };

  const formatAudioTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

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

  // 🌟 ইমোজি সিলেক্ট করার হ্যান্ডলার
  const handleEmojiSelect = (emoji: any, field: any) => {
    const currentVal = field.state.value || "";
    const newVal = currentVal + emoji.native;
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
        <div className="shrink-0 pb-1 flex items-center gap-1">
          <MediaUploadButton onUploadComplete={handleUploadComplete} />

          {/* 🌟 ভয়েস রেকর্ডার বাটন ও ইউআই */}
          {isUploadingAudio ? (
            <span className="text-xs text-muted-foreground px-2 animate-pulse">Sending...</span>
          ) : isRecording ? (
            <div className="flex items-center gap-2 bg-red-500/10 text-red-500 px-3 py-1.5 rounded-full animate-pulse">
              <span className="w-2 h-2 rounded-full bg-red-500"></span>
              <span className="text-xs font-semibold">{formatAudioTime(recordingTime)}</span>
              <button type="button" onClick={cancelRecording} className="p-1 hover:bg-red-500/20 rounded-full" title="Cancel">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
              <button type="button" onClick={stopRecording} className="p-1 bg-red-500 text-white rounded-full" title="Send">
                <Send className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={startRecording}
              className="p-2 hover:bg-muted rounded-full text-muted-foreground transition-colors cursor-pointer"
              title="Record voice note"
            >
              <Mic className="h-5 w-5" />
            </button>
          )}
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

              {/* 🌟 ইমোজি বাটন ও ইমোজি মার্ট পিকার পপআপ */}
              <div className="absolute right-2 bottom-2.5 flex items-center">
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="text-muted-foreground hover:text-foreground transition-colors p-1"
                  title="Insert Emoji"
                >
                  <Smile className="h-5 w-5" />
                </button>

                {showEmojiPicker && (
                  <div className="absolute bottom-full right-0 mb-2 z-50 shadow-2xl rounded-2xl overflow-hidden border bg-background">
                    <Picker
                      data={data}
                      onEmojiSelect={(emoji: any) => handleEmojiSelect(emoji, field)}
                      theme="light"
                    />
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