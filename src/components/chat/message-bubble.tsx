"use client";

import React from "react";
import Image from "next/image";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, CheckCheck, CornerUpLeft, Reply, Smile, Trash2 } from "lucide-react";
import { Message } from "@/types";
import { formatTime } from "@/lib/utils";

const EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🔥"];

interface MessageBubbleProps {
  msg: Message;
  currentUserId?: string;
  isGroup?: boolean;
  highlightedMsgId?: string | null;
  onReply?: (msg: Message) => void;
  onDelete?: (msgId: string) => void; 
  onDeleteForMe?: (msgId: string) => void; 
  onReaction?: (msgId: string, emoji: string) => void; 
  onScrollToReply?: (targetId: string) => void;
}

export function MessageBubble({
  msg,
  currentUserId,
  isGroup = false,
  highlightedMsgId,
  onReply,
  onDelete,
  onDeleteForMe,
  onReaction,
  onScrollToReply,
}: MessageBubbleProps) {
  const msgSenderId = msg.senderId || msg.sender?.id;
  const isMe = Boolean(msgSenderId && String(msgSenderId) === String(currentUserId));
  const isHighlighted = highlightedMsgId === msg.id;

  // 🌟 READ STATUS LOGIC FIX
  const isReadByOther = React.useMemo(() => {
    // ১. নিজের পাঠানো মেসেজ না হলে ব্লু টিক হিসাব হবে না
    if (!isMe) return false;

    // ২. যদি reads অ্যারেতে অন্য কোনো ইউজারের ID পাওয়া যায়
    if (msg.reads && Array.isArray(msg.reads) && msg.reads.length > 0) {
      const hasOtherRead = msg.reads.some((r) => {
        const readerId = typeof r === "string" ? r : r.userId;
        return Boolean(readerId && String(readerId) !== String(currentUserId));
      });
      if (hasOtherRead) return true;
    }

    // ৩. মেসেজের স্ট্যাটাস 'READ' হলে
    return msg.status === "READ";
  }, [msg.reads, msg.status, currentUserId, isMe]);

  return (
    <div
      id={`msg-${msg.id}`}
      className={`group relative flex flex-col transition-all duration-300 p-1 rounded-lg ${
        isHighlighted ? "bg-primary/20 ring-2 ring-primary/40" : ""
      } ${isMe ? "items-end" : "items-start"}`}
    >
      {/* "X replied to Y" Header */}
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

        {/* Action Controls (Hover) */}
        <div
          className={`hidden group-hover:flex items-center gap-1 ${
            isMe ? "order-first" : "order-last"
          }`}
        >
          {onReaction && (
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  title="React"
                  className="p-1 hover:bg-muted rounded text-muted-foreground transition-colors"
                >
                  <Smile className="h-3.5 w-3.5" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="flex gap-1 p-1 w-auto rounded-full" side="top">
                {EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => onReaction(msg.id, emoji)}
                    className="hover:bg-muted p-1 rounded-full text-base transition-transform hover:scale-125"
                  >
                    {emoji}
                  </button>
                ))}
              </PopoverContent>
            </Popover>
          )}

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

          {onDeleteForMe && (
            <button
              type="button"
              onClick={() => onDeleteForMe(msg.id)}
              title="Delete for me"
              className="p-1 hover:bg-muted rounded text-muted-foreground transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}

          {isMe && onDelete && (
            <button
              type="button"
              onClick={() => onDelete(msg.id)}
              title="Delete for everyone"
              className="p-1 hover:bg-muted rounded text-red-500 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex flex-col max-w-[70%] relative">
          {/* Group Chat Header Name */}
          {isGroup && !isMe && msg.sender?.name && (
            <span className="text-[11px] font-semibold text-primary mb-0.5 ml-1">
              {msg.sender.name}
            </span>
          )}

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
            className={`p-2.5 rounded-2xl border space-y-1 relative ${
              isMe
                ? "bg-primary text-primary-foreground rounded-br-none self-end"
                : "bg-muted/50 rounded-bl-none self-start"
            }`}
          >
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

            <div
              className={`flex items-center justify-end gap-1 text-[10px] mt-0.5 ${
                isMe ? "text-primary-foreground/80" : "text-muted-foreground"
              }`}
            >
              <span>{formatTime(msg.createdAt)}</span>

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

          {/* Reactions Badges */}
          {msg.reactions && msg.reactions.length > 0 && (
            <div
              className={`absolute -bottom-2 ${
                isMe ? "right-2" : "left-2"
              } bg-background border rounded-full px-1.5 py-0.5 text-xs shadow flex items-center gap-1 z-10`}
            >
              {msg.reactions.map((r: any) => (
                <span key={r.id || r.emoji}>{r.emoji}</span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default MessageBubble;