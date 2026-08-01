"use client";

import { useReactionStore } from "@/store/use-reaction-store";
import React, { useState } from "react";
import Image from "next/image";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Check, CheckCheck, CornerUpLeft, Edit2, Reply, Smile, Trash2 } from "lucide-react";
import { Message } from "@/types";
import { formatTime } from "@/lib/utils";

const EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🔥", "😤"];

interface MessageBubbleProps {
  msg: Message;
  currentUserId?: string;
  isGroup?: boolean;
  highlightedMsgId?: string | null;
  onReply?: (msg: Message) => void;
  onEdit?: (msgId: string, currentBody: string) => void;
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
  onEdit,
  onDelete,
  onDeleteForMe,
  onReaction,
  onScrollToReply,
}: MessageBubbleProps) {
  const msgSenderId = msg.senderId || msg.sender?.id;
  const isMe = Boolean(msgSenderId && String(msgSenderId) === String(currentUserId));
  const isHighlighted = highlightedMsgId === msg.id;

  const isDeleted = !msg.body && !msg.image && !msg.fileUrl;

  const reactionsMap = useReactionStore((state) => state.reactionsMap);
  const currentReactions = reactionsMap[msg.id] || msg.reactions || [];

  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [showDeleteMenu, setShowDeleteMenu] = useState(false);


 const isEdited = msg.updatedAt && msg.createdAt && (new Date(msg.updatedAt).getTime() - new Date(msg.createdAt).getTime() > 3000);

  const isReadByOther = React.useMemo(() => {
    if (!isMe) return false;
    if (msg.reads && Array.isArray(msg.reads) && msg.reads.length > 0) {
      const hasOtherRead = msg.reads.some((r) => {
        const readerId = typeof r === "string" ? r : r.userId;
        return Boolean(readerId && String(readerId) !== String(currentUserId));
      });
      if (hasOtherRead) return true;
    }
    return msg.status === "READ";
  }, [msg.reads, msg.status, currentUserId, isMe]);

  return (
    <div
      id={`msg-${msg.id}`}
      className={`group relative flex flex-col transition-all duration-300 p-1 rounded-lg ${
        isHighlighted ? "bg-primary/20 ring-2 ring-primary/40" : ""
      } ${isMe ? "items-end" : "items-start"}`}
    >
      {!isDeleted && msg.replyTo && (
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

        {!isDeleted && (
          <div
            className={`hidden group-hover:flex items-center gap-1 ${
              isMe ? "order-first" : "order-last"
            }`}
          >
            {onReaction && (
              <div className="relative">
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setShowReactionPicker(!showReactionPicker)}
                  title="React"
                  className="p-1 hover:bg-muted rounded text-muted-foreground transition-colors cursor-pointer inline-flex items-center justify-center"
                >
                  <Smile className="h-3.5 w-3.5" />
                </div>

                {showReactionPicker && (
                  <div className={`absolute bottom-full mb-1 z-50 flex items-center gap-1.5 p-1.5 rounded-full shadow-lg bg-background border ${isMe ? "right-0" : "left-0"}`}>
                    {EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => {
                          onReaction(msg.id, emoji);
                          setShowReactionPicker(false);
                        }}
                        className="hover:bg-muted p-1.5 rounded-full text-base transition-transform hover:scale-125 focus:outline-none cursor-pointer"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {isMe && onEdit && (
              <button
                type="button"
                onClick={() => onEdit(msg.id, msg.body || "")}
                title="Edit message"
                className="p-1 hover:bg-muted rounded text-muted-foreground transition-colors"
              >
                <Edit2 className="h-3.5 w-3.5" />
              </button>
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

            {isMe && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowDeleteMenu(!showDeleteMenu)}
                  title="Delete options"
                  className="p-1 hover:bg-muted rounded text-muted-foreground transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>

                {showDeleteMenu && (
                  <div className={`absolute bottom-full mb-1 z-50 flex flex-col py-1 w-36 rounded-md shadow-lg bg-background border ${isMe ? "right-0" : "left-0"}`}>
                    {onDelete && (
                      <button
                        type="button"
                        onClick={() => {
                          onDelete(msg.id);
                          setShowDeleteMenu(false);
                        }}
                        className="text-left px-3 py-1.5 text-xs hover:bg-muted text-red-500 transition-colors cursor-pointer font-medium"
                      >
                        Delete
                      </button>
                    )}

                    {/* {onDeleteForMe && (
                      <button
                        type="button"
                        onClick={() => {
                          onDeleteForMe(msg.id);
                          setShowDeleteMenu(false);
                        }}
                        className="text-left px-3 py-1.5 text-xs hover:bg-muted text-foreground transition-colors cursor-pointer"
                      >
                        Delete for Me
                      </button>
                    )} */}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col max-w-[70%] relative">
          {isGroup && !isMe && msg.sender?.name && (
            <span className="text-[11px] font-semibold text-primary mb-0.5 ml-1">
              {msg.sender.name}
            </span>
          )}

          {!isDeleted && msg.replyTo && (
            <div
              onClick={() => {
                const targetId = msg.replyToId || msg.replyTo?.id;
                if (targetId && onScrollToReply) onScrollToReply(targetId);
              }}
              className={`cursor-pointer text-xs p-2 rounded-xl mb-1.5 border truncate ${
                isMe
                  ? "bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground/90"
                  : "bg-background/60 border-border/60 text-muted-foreground"
              }`}
            >
              <p className="truncate text-[11px] opacity-90">{msg.replyTo.body || "Attachment"}</p>
            </div>
          )}

          <div
            className={`p-2.5 rounded-2xl border space-y-1 relative ${
              isMe
                ? "bg-primary text-primary-foreground rounded-br-none self-end"
                : "bg-muted/50 rounded-bl-none self-start"
            }`}
          >
            {/* 🌟 Reply inside bubble with proper contrast */}
            {!isDeleted && msg.replyTo && (
              <div
                onClick={() => {
                  const targetId = msg.replyToId || msg.replyTo?.id;
                  if (targetId && onScrollToReply) onScrollToReply(targetId);
                }}
                className={`cursor-pointer text-xs p-2 rounded-xl mb-1.5 border truncate ${
                  isMe
                    ? "bg-black/20 border-white/20 text-white"
                    : "bg-muted/60 border-border/60 text-foreground"
                }`}
              >
                <p className="truncate text-[11px] font-medium">{msg.replyTo.body || "Attachment"}</p>
              </div>
            )}

            {isDeleted ? (
              <p className="text-xs italic opacity-80 select-none">
                {isMe ? "You deleted a message" : `${msg.sender?.name || "Someone"} deleted a message`}
              </p>
            ) : (
              <>
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

                {msg.fileUrl && (
                  <div className="mt-1">
                    {msg.fileType?.startsWith("image/") ? (
                      <div className="relative w-64 h-48 max-w-xs rounded-lg overflow-hidden">
                        <Image 
                          src={msg.fileUrl} 
                          alt="attachment" 
                          fill 
                          sizes="(max-width: 768px) 100vw, 256px"
                          className="object-cover" 
                        />
                      </div>
                    ) : (
                      <a 
                        href={msg.fileUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 bg-muted/60 rounded-xl border hover:bg-muted transition"
                      >
                        <span className="text-2xl">📄</span>
                        <div className="overflow-hidden">
                          <p className="text-xs font-semibold truncate">{msg.fileName || "Attachment"}</p>
                          <span className="text-[10px] text-muted-foreground uppercase">{msg.fileType?.split("/")[1] || "FILE"}</span>
                        </div>
                      </a>
                    )}
                  </div>
                )}

                {msg.body && <p className="text-sm font-medium break-words">{msg.body}</p>}
              </>
            )}

            <div
              className={`flex items-center justify-end gap-1 text-[10px] mt-0.5 ${
                isMe ? "text-primary-foreground/80" : "text-muted-foreground"
              }`}
            >
            {isEdited && !isDeleted && (
  <span className="italic opacity-70 mr-1 select-none">(edited)</span>
)}

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

          {!isDeleted && currentReactions.length > 0 && (
            <div
              className={`absolute -bottom-2 ${
                isMe ? "right-2" : "left-2"
              } bg-background border rounded-full px-1.5 py-0.5 text-xs shadow flex items-center gap-1 z-10`}
            >
              {currentReactions.map((r: any) => (
                <span key={r.id || r.userId || r.emoji}>{r.emoji}</span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default MessageBubble;