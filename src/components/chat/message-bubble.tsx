"use client";

import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Check, CheckCheck, CornerUpLeft, Reply, Trash2 } from "lucide-react";

export interface Message {
  id: string;
  senderId?: string;
  body?: string;
  image?: string;
  createdAt?: string;
  status?: "SENT" | "DELIVERED" | "READ";
  reads?: { userId: string; readAt?: string }[]; // 🌟 Reads Array Support
  replyToId?: string;
  replyTo?: {
    id: string;
    body?: string;
    senderName?: string;
    sender?: {
      id?: string;
      name?: string;
    };
  };
  sender?: {
    id?: string;
    name?: string;
    image?: string | null;
  };
}

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

  // 🌟 রিড লজিক ফিক্স: অন্য কোন ইউজার মেসেজটি পড়েছে কি না
  // 🌟 রিড লজিক: অন্য কোনো ইউজার (আমার আইডি ছাড়া) মেসেজটি রিড করেছে কি না
const isReadByOther = React.useMemo(() => {
  // যদি ব্যাকএন্ড থেকে reads অ্যারে আসে
  if (msg.reads && Array.isArray(msg.reads) && msg.reads.length > 0) {
    return msg.reads.some((r) => String(r.userId) !== String(currentUserId));
  }
// ব্যাকএন্ডে যদি reads অ্যারে না থেকে সরাসরি status থাকে
  // খেয়াল রাখুন: অপজিট ইউজার না দেখলে status READ হওয়া উচিত নয়
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
              {msg.replyTo.sender?.name || msg.replyTo.senderName || "User"}
            </strong>
          </span>
        </div>
      )}

      <div className={`flex items-end gap-2 w-full ${isMe ? "justify-end" : "justify-start"}`}>
        {!isMe && (
          <Avatar className="h-8 w-8 mb-1">
            <AvatarImage src={msg.sender?.image || undefined} />
            <AvatarFallback className="text-xs">
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
            {msg.image && (
              <img
                src={msg.image}
                alt="attachment"
                className="rounded-md max-h-48 object-cover mb-1"
              />
            )}

            {msg.body && <p className="text-sm font-medium break-words">{msg.body}</p>}

            {/* Read / Sent Status Indicator for Sender */}
            {isMe && (
              <div className="flex justify-end items-center gap-1 text-[10px] opacity-80 mt-0.5">
                {isReadByOther ? (
                  <CheckCheck className="h-3.5 w-3.5 text-sky-400 font-bold" />
                ) : (
                  <Check className="h-3.5 w-3.5 text-muted-foreground" />
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default MessageBubble;