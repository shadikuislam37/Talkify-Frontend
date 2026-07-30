"use client";

import React from "react";
import Image from "next/image";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Check, CheckCheck, CornerUpLeft, Reply, Trash2 } from "lucide-react";
import { Message } from "@/types";
import { formatTime } from "@/lib/utils"; // 🌟 সময় ফরম্যাট করার হেলপার ইম্পোর্ট

interface MessageBubbleProps {
  msg: Message;
  currentUserId?: string;
  highlightedMsgId?: string | null;
  onReply?: (msg: Message) => void;
  onDelete?: (msgId: string) => void;
  onScrollToReply?: (targetId: string) => void;
}

export function MessageBubble({
  msg,
  currentUserId,
  highlightedMsgId,
  onReply,
  onDelete,
  onScrollToReply,
}: MessageBubbleProps) {
  const msgSenderId = msg.senderId || msg.sender?.id;
  const isMe = Boolean(msgSenderId && String(msgSenderId) === String(currentUserId));
  const isHighlighted = highlightedMsgId === msg.id;

  // 🌟 রিড লজিক: অন্য কোনো ইউজার (আমার আইডি ছাড়া) মেসেজটি রিড করেছে কি না
  const isReadByOther = React.useMemo(() => {
    if (msg.reads && Array.isArray(msg.reads) && msg.reads.length > 0) {
      return msg.reads.some((r) => String(r.userId) !== String(currentUserId));
    }
    return msg.status === "READ";
  }, [msg.reads, msg.status, currentUserId]);

  return (
    <div
      id={`msg-${msg.id}`}
      className={`group relative flex flex-col transition-all duration-300 p-1 rounded-lg ${
        isHighlighted ? "bg-primary/20 ring-2 ring-primary/40" : ""
      } ${isMe ? "items-end" : "items-start"}`}
    >
      {/* "X replied to Y" Header Text */}
      {msg.replyTo && (
        <div
          onClick={() => {
            const targetId = msg.replyToId || msg.replyTo?.id;
            if (targetId && onScrollToReply) onScrollToReply(targetId);
          }}
          className="flex items-center gap-1 text-[11px] text-muted-foreground mb-0.5 cursor-pointer hover:underline px-1"
        >
          <CornerUpLeft className="h-3 w-3" />
          <span>
            <strong className="font-semibold text-foreground">
              {isMe ? "You" : msg.sender?.name || "User"}
            </strong>{" "}
            replied to{" "}
            <strong className="font-semibold text-foreground">
              {msg.replyTo.sender?.name || "User"}
            </strong>
          </span>
        </div>
      )}

      <div className={`flex items-end gap-2 w-full ${isMe ? "justify-end" : "justify-start"}`}>
        {!isMe && (
          <Avatar className="h-8 w-8 mb-1">
            <AvatarImage src={msg.sender?.image || undefined} />
            <AvatarFallback className="text-xs font-semibold">
              {msg.sender?.name ? msg.sender.name.slice(0, 2).toUpperCase() : "U"}
            </AvatarFallback>
          </Avatar>
        )}

        {/* Hover Actions (Reply & Delete Buttons) */}
        <div
          className={`hidden group-hover:flex items-center gap-1 ${
            isMe ? "order-first" : "order-last"
          }`}
        >
          {onReply && (
            <button
              type="button"
              onClick={() => onReply(msg)}
              title="Reply"
              className="p-1 hover:bg-muted rounded text-muted-foreground transition-colors"
            >
              <Reply className="h-3.5 w-3.5" />
            </button>
          )}
          {isMe && onDelete && (
            <button
              type="button"
              onClick={() => onDelete(msg.id)}
              title="Delete"
              className="p-1 hover:bg-muted rounded text-red-500 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex flex-col max-w-[70%]">
          {/* Parent Reply Body Preview */}
          {msg.replyTo && (
            <div
              onClick={() => {
                const targetId = msg.replyToId || msg.replyTo?.id;
                if (targetId && onScrollToReply) onScrollToReply(targetId);
              }}
              className={`cursor-pointer text-xs p-2.5 rounded-2xl mb-1 bg-muted/80 hover:bg-muted text-muted-foreground transition-colors truncate border border-border/50 ${
                isMe ? "self-end rounded-br-none" : "self-start rounded-bl-none"
              }`}
            >
              <p className="truncate opacity-90">{msg.replyTo.body || "Attachment"}</p>
            </div>
          )}

          {/* Main Message Bubble Body */}
          <div
            className={`p-2.5 rounded-2xl border space-y-1 ${
              isMe
                ? "bg-primary text-primary-foreground rounded-br-none self-end"
                : "bg-muted/50 rounded-bl-none self-start"
            }`}
          >
            {/* 🌟 Image Wrapper Container with relative position */}
            {msg.image && (
              <div className="relative w-full min-w-[200px] h-48 mb-1 rounded-md overflow-hidden bg-muted/20">
                <Image
                  src={msg.image}
                  alt="Attachment"
                  fill
                  sizes="(max-width: 768px) 100vw, 260px"
                  className="object-cover rounded-md"
                  unoptimized
                />
              </div>
            )}

            {msg.body && <p className="text-sm font-medium break-words">{msg.body}</p>}

            {/* 🌟 Time and Read/Sent Status Indicator */}
            <div
              className={`flex items-center justify-end gap-1 text-[10px] mt-0.5 ${
                isMe ? "text-primary-foreground/80" : "text-muted-foreground"
              }`}
            >
              {/* সময় প্রদর্শন */}
              <span>{formatTime(msg.createdAt)}</span>

              {/* নিজের পাঠানো মেসেজের জন্য টিক মার্ক */}
              {isMe && (
                <span className="ml-0.5">
                  {isReadByOther ? (
                    <CheckCheck className="h-3.5 w-3.5 text-sky-400 font-bold" />
                  ) : (
                    <Check className="h-3.5 w-3.5 opacity-70" />
                  )}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MessageBubble;