"use client";

import { useReactionStore } from "@/store/use-reaction-store";
import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Check, CheckCheck, CornerUpLeft, Edit2, Reply, Smile, Trash2, Loader2, AlertCircle, RotateCw, X } from "lucide-react";
import { Message } from "@/types";
import { formatTime } from "@/lib/utils";
import { decryptMessage } from "@/lib/crypto";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

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
  onRetry?: (msg: Message) => void;
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
  onRetry,
}: MessageBubbleProps) {
  const msgSenderId = msg.senderId || msg.sender?.id;
  const isMe = Boolean(msgSenderId && String(msgSenderId) === String(currentUserId));
  const isHighlighted = highlightedMsgId === msg.id;
  const isPending = msg._sendStatus === "pending";
  const isFailed = msg._sendStatus === "failed";

  const isDeleted = !msg.body && !msg.image && !msg.fileUrl;

  const reactionsMap = useReactionStore((state) => state.reactionsMap);
  const currentReactions = reactionsMap[msg.id] || msg.reactions || [];

  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [showDeleteMenu, setShowDeleteMenu] = useState(false);
  const [actionsVisible, setActionsVisible] = useState(false);

  // মেইন মেসেজ ডিক্রিপ্ট করার লোকাল স্টেট
  const [displayBody, setDisplayBody] = useState<string>(msg.body || "");

  // রিপ্লাই প্রিভিউ মেসেজ ডিক্রিপ্ট করার লোকাল স্টেট
  const [replyDisplayBody, setReplyDisplayBody] = useState<string>("");

  // ইমেজ লাইটবক্স প্রিভিউ-এর জন্য স্টেট
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function resolveBodies() {
      // ১. মেইন মেসেজ ডিক্রিপশন
      if (msg.body) {
        if (msg.body.trim().startsWith("{") && msg.keys && msg.keys.length > 0 && currentUserId) {
          try {
            const decrypted = await decryptMessage(msg.body, msg.keys, currentUserId);
            if (isMounted && decrypted && !decrypted.startsWith("{")) {
              setDisplayBody(decrypted);
            } else {
              setDisplayBody(msg.body);
            }
          } catch (err) {
            if (isMounted) setDisplayBody(msg.body);
          }
        } else {
          if (isMounted) setDisplayBody(msg.body);
        }
      }

      // ২. রিপ্লাই প্রিভিউ মেসেজ ডিক্রিপশন
      if (msg.replyTo && msg.replyTo.body) {
        const rawReply = msg.replyTo.body;
        if (rawReply.trim().startsWith("{") && msg.replyTo.keys && msg.replyTo.keys.length > 0 && currentUserId) {
          try {
            const decryptedReply = await decryptMessage(rawReply, msg.replyTo.keys, currentUserId);
            if (isMounted && decryptedReply && !decryptedReply.startsWith("{")) {
              setReplyDisplayBody(decryptedReply);
            } else {
              setReplyDisplayBody("Encrypted message");
            }
          } catch (err) {
            if (isMounted) setReplyDisplayBody("Encrypted message");
          }
        } else {
          if (isMounted) setReplyDisplayBody(rawReply);
        }
      }
    }

    resolveBodies();
    return () => {
      isMounted = false;
    };
  }, [msg.body, msg.keys, msg.replyTo, currentUserId]);

  const pressTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleTouchStart = () => {
    if (isDeleted) return;
    pressTimerRef.current = setTimeout(() => {
      setActionsVisible((prev) => !prev);
    }, 500);
  };

  const handleTouchEnd = () => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
  };

  const isReadByOther = React.useMemo(() => {
    if (!isMe) return false;

    if (msg.status === "READ") return true;

    if (msg.reads && Array.isArray(msg.reads) && msg.reads.length > 0) {
      const hasOtherRead = msg.reads.some((r: any) => {
        const readerId = typeof r === "string" ? r : r.userId;
        return Boolean(readerId && String(readerId) !== String(currentUserId));
      });
      if (hasOtherRead) return true;
    }

    return false;
  }, [msg.reads, msg.status, currentUserId, isMe]);

  return (
    <div
      id={`msg-${msg.id}`}
      className={`group relative flex flex-col transition-all duration-300 p-1 rounded-lg ${
        isHighlighted ? "bg-primary/20 ring-2 ring-primary/40" : ""
      } ${isMe ? "items-end" : "items-start"}`}
    >
      {/* বাইরের দিকের টপ রিপ্লাই লেবেল */}
      {!isDeleted && msg.replyTo && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            const targetId = msg.replyToId || msg.replyTo?.id;
            if (targetId && onScrollToReply) onScrollToReply(targetId);
          }}
          className="flex items-center gap-1 text-[11px] text-muted-foreground mb-0.5 cursor-pointer hover:underline px-1"
        >
          <CornerUpLeft className="h-3 w-3 shrink-0" />
          <span className="truncate">
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

      <div className={`flex items-end gap-2 w-full min-w-0 ${isMe ? "justify-end" : "justify-start"}`}>
        {!isMe && (
          <Avatar className="h-8 w-8 mb-1 shrink-0">
            <AvatarImage src={msg.sender?.image || undefined} />
            <AvatarFallback className="text-xs font-semibold">
              {msg.sender?.name ? msg.sender.name.slice(0, 2).toUpperCase() : "U"}
            </AvatarFallback>
          </Avatar>
        )}

        {!isDeleted && !isPending && !isFailed && (
          <div
            className={`${
              actionsVisible ? "flex" : "hidden group-hover:flex"
            } items-center gap-1 shrink-0 ${isMe ? "order-first" : "order-last"}`}
          >
            {onReaction && (
              <div className="relative">
                <div
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowReactionPicker(!showReactionPicker);
                  }}
                  title="React"
                  className="p-2 hover:bg-muted rounded text-muted-foreground transition-colors cursor-pointer inline-flex items-center justify-center active:scale-95"
                >
                  <Smile className="h-4 w-4" />
                </div>

                {showReactionPicker && (
                  <div
                    className={`absolute bottom-full mb-1 z-50 flex items-center gap-1.5 p-1.5 rounded-full shadow-lg bg-background border max-w-[85vw] overflow-x-auto ${
                      isMe ? "right-0" : "left-0"
                    }`}
                  >
                    {EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onReaction(msg.id, emoji);
                          setShowReactionPicker(false);
                        }}
                        className="hover:bg-muted p-1.5 rounded-full text-base transition-transform hover:scale-125 active:scale-110 focus:outline-none cursor-pointer shrink-0"
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
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(msg.id, displayBody);
                }}
                title="Edit message"
                className="p-2 hover:bg-muted rounded text-muted-foreground transition-colors active:scale-95"
              >
                <Edit2 className="h-4 w-4" />
              </button>
            )}

            {onReply && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onReply(msg);
                }}
                title="Reply"
                className="p-2 hover:bg-muted rounded text-muted-foreground transition-colors active:scale-95"
              >
                <Reply className="h-4 w-4" />
              </button>
            )}

            {isMe && (
              <div className="relative">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDeleteMenu(!showDeleteMenu);
                  }}
                  title="Delete options"
                  className="p-2 hover:bg-muted rounded text-muted-foreground transition-colors active:scale-95"
                >
                  <Trash2 className="h-4 w-4" />
                </button>

                {showDeleteMenu && (
                  <div className={`absolute bottom-full mb-1 z-50 flex flex-col py-1 w-36 rounded-md shadow-lg bg-background border ${isMe ? "right-0" : "left-0"}`}>
                    {onDelete && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(msg.id);
                          setShowDeleteMenu(false);
                        }}
                        className="text-left px-3 py-2 text-xs hover:bg-muted text-red-500 transition-colors cursor-pointer font-medium"
                      >
                        Delete
                      </button>
                    )}

                    {onDeleteForMe && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteForMe(msg.id);
                          setShowDeleteMenu(false);
                        }}
                        className="text-left px-3 py-2 text-xs hover:bg-muted text-foreground transition-colors cursor-pointer"
                      >
                        Delete for Me
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col max-w-[78%] sm:max-w-[70%] min-w-0 w-fit relative">
          {isGroup && !isMe && msg.sender?.name && (
            <span className="text-[11px] font-semibold text-primary mb-0.5 ml-1 truncate">
              {msg.sender.name}
            </span>
          )}

          <div
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onMouseDown={handleTouchStart}
            onMouseUp={handleTouchEnd}
            onMouseLeave={handleTouchEnd}
            className={`p-2.5 rounded-2xl border space-y-1 relative min-w-0 ${
              isMe
                ? "bg-primary text-primary-foreground rounded-br-none self-end"
                : "bg-muted/50 rounded-bl-none self-start"
            } ${!isDeleted ? "cursor-pointer select-none" : ""}  ${isFailed ? "ring-1 ring-red-400" : ""}`}
          >
            {/* বাবলের ভেতরের রিপ্লাই প্রিভিউ বক্স */}
            {!isDeleted && msg.replyTo && (
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  const targetId = msg.replyToId || msg.replyTo?.id;
                  if (targetId && onScrollToReply) onScrollToReply(targetId);
                }}
                className={`cursor-pointer text-xs p-2 rounded-xl mb-1.5 border min-w-0 w-full overflow-hidden ${
                  isMe
                    ? "bg-black/20 border-white/20 text-white"
                    : "bg-muted/60 border-border/60 text-foreground"
                }`}
              >
                <div className="flex flex-col min-w-0">
                  <span className="text-[10px] font-bold opacity-70 truncate">
                    {msg.replyTo.sender?.name || "User"}
                  </span>
                  <p className="text-[11px] font-medium line-clamp-2 break-all">
                    {replyDisplayBody || (msg.replyTo.body?.trim().startsWith("{") ? "Encrypted message" : msg.replyTo.body) || "Attachment"}
                  </p>
                </div>
              </div>
            )}

            {isDeleted ? (
              <p className="text-xs italic opacity-80 select-none">
                {isMe ? "You deleted a message" : `${msg.sender?.name || "Someone"} deleted a message`}
              </p>
            ) : (
              <>
                {/* msg.image — ক্লিক করলে লাইটবক্স খোলে */}
                {msg.image && !msg.fileUrl && (
                  <div
                    className="relative w-full aspect-[4/3] max-h-64 mb-1 rounded-md overflow-hidden bg-muted/20 cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPreviewSrc(msg.image!);
                    }}
                  >
                    <Image
                      src={msg.image}
                      alt="Attachment"
                      fill
                      sizes="(max-width: 640px) 70vw, 260px"
                      className="object-cover rounded-md"
                      unoptimized
                    />
                  </div>
                )}

                {/* 🌟 ভয়েস নোট বা অডিও প্লেয়ার সাপোর্ট */}
                {msg.fileUrl && (
                  msg.fileType?.startsWith("audio/") || 
                  msg.fileUrl.endsWith(".webm") || 
                  msg.fileUrl.endsWith(".mp3") || 
                  msg.fileUrl.endsWith(".m4a") || 
                  msg.fileUrl.endsWith(".mp4")
                ) && (
                  <div className="flex items-center gap-2 min-w-[220px] py-1">
                    <audio controls src={msg.fileUrl} className="h-9 w-full max-w-[240px] accent-primary" />
                  </div>
                )}

                {msg.fileUrl && 
                  !msg.fileType?.startsWith("audio/") && 
                  !msg.fileUrl.endsWith(".webm") && 
                  !msg.fileUrl.endsWith(".mp3") && 
                  !msg.fileUrl.endsWith(".m4a") && 
                  !msg.fileUrl.endsWith(".mp4") && (
                  <div className="mt-1">
                    {msg.fileType?.startsWith("image/") || (msg.image && msg.fileUrl) ? (
                      <div
                        className="relative w-full max-w-[240px] aspect-[4/3] rounded-lg overflow-hidden cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewSrc(msg.fileUrl || msg.image || "");
                        }}
                      >
                        <Image
                          src={msg.fileUrl || msg.image!}
                          alt="attachment"
                          fill
                          sizes="(max-width: 640px) 65vw, 240px"
                          className="object-cover"
                          unoptimized
                        />
                      </div>
                    ) : (
                      <Link
                        href={msg.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        prefetch={false}
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-3 p-3 bg-muted/60 rounded-xl border hover:bg-muted transition w-full max-w-full min-w-0"
                      >
                        <span className="text-2xl shrink-0">📄</span>
                        <div className="overflow-hidden min-w-0 flex-1">
                          <p className="text-xs font-semibold truncate">{msg.fileName || "Attachment"}</p>
                          <span className="text-[10px] text-muted-foreground uppercase">{msg.fileType?.split("/")[1] || "FILE"}</span>
                        </div>
                      </Link>
                    )}
                  </div>
                )}

                {/* 🌟 মূল টেক্সট মেসেজ প্রদর্শনের জন্য */}
                {displayBody && (
                  <p className="text-sm font-medium break-words whitespace-pre-wrap">
                    {displayBody}
                  </p>
                )}
              </>
            )}

            {/* 🌟 Seen by Popover for Group Chat */}
            {isMe && isGroup && msg.reads && msg.reads.length > 0 && (
              <Popover>
                <PopoverTrigger asChild>
                  <div className="text-[9px] text-muted-foreground self-end mt-0.5 cursor-pointer hover:underline">
                    Seen by {msg.reads.length}
                  </div>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-2 z-[60]" align="end">
                  <h4 className="text-xs font-semibold text-muted-foreground mb-2 pb-1 border-b">Seen by</h4>
                  <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
                    {msg.reads.map((r: any) => (
                      <div key={r.id || r.userId} className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={r.user?.image} />
                          <AvatarFallback>{r.user?.name?.[0] || "U"}</AvatarFallback>
                        </Avatar>
                        <span className="text-xs font-medium truncate">{r.user?.name || "Unknown"}</span>
                      </div>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            )}

            {/* টাইমস্ট্যাম্প এবং টিক মার্ক */}
            <div
              className={`flex items-center justify-end gap-1 text-[10px] mt-0.5 ${
                isMe ? "text-primary-foreground/80" : "text-muted-foreground"
              }`}
            >
              {msg.isEdited && !isDeleted && (
                <span className="italic opacity-70 mr-1 select-none">(edited)</span>
              )}

              <span>{formatTime(msg.createdAt)}</span>

              {isMe && (
                <span className="ml-0.5">
                  {isFailed ? (
                    <AlertCircle className="h-3.5 w-3.5 text-red-400" />
                  ) : isReadByOther ? (
                    <CheckCheck className="h-3.5 w-3.5 text-sky-400 font-bold" />
                  ) : (
                    <Check className="h-3.5 w-3.5 opacity-70" />
                  )}
                </span>
              )}
            </div>
          </div>

          {isFailed && onRetry && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRetry(msg);
              }}
              className={`mt-1 flex items-center gap-1 text-[11px] text-red-500 hover:text-red-600 hover:underline ${
                isMe ? "self-end" : "self-start"
              }`}
            >
              <RotateCw className="h-3 w-3" />
              Failed to send — Tap to retry
            </button>
          )}

          {/* রিয়্যাকশন গ্রুপিং ও কাউন্ট */}
          {!isDeleted && currentReactions.length > 0 && (() => {
            const groupedReactions = currentReactions.reduce((acc: any, r: any) => {
              const emoji = r.emoji;
              if (!acc[emoji]) {
                acc[emoji] = { emoji, count: 0 };
              }
              acc[emoji].count += 1;
              return acc;
            }, {});

            const uniqueReactions = Object.values(groupedReactions);

            return (
              <div
                className={`absolute -bottom-2 ${
                  isMe ? "right-2" : "left-2"
                } bg-background border rounded-full px-2 py-0.5 text-xs shadow flex items-center gap-1 z-10 select-none`}
              >
                {uniqueReactions.map((item: any) => (
                  <span key={item.emoji} className="flex items-center gap-0.5">
                    <span>{item.emoji}</span>
                    {item.count > 1 && (
                      <span className="text-[10px] font-bold text-muted-foreground">
                        {item.count}
                      </span>
                    )}
                  </span>
                ))}
              </div>
            );
          })()}
        </div>
      </div>

      {/* ইমেজ লাইটবক্স — attachment-এ ক্লিক করলে ফুল-স্ক্রিন প্রিভিউ খোলে */}
      {previewSrc && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setPreviewSrc(null)}
          onTouchEnd={(e) => {
            if (e.target === e.currentTarget) {
              setPreviewSrc(null);
            }
          }}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setPreviewSrc(null);
            }}
            onTouchEnd={(e) => {
              e.stopPropagation();
              e.preventDefault();
              setPreviewSrc(null);
            }}
            className="absolute top-4 right-4 p-3 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors z-[110] cursor-pointer"
            title="Close"
          >
            <X className="h-6 w-6" />
          </button>

          <div
            className="relative w-full h-full max-w-4xl max-h-[85vh] flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={previewSrc}
              alt="Preview"
              fill
              sizes="100vw"
              className="object-contain"
              unoptimized
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default MessageBubble;