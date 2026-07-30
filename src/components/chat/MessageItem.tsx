"use client";
import React, { useState } from "react";
import { useEditMessage, useDeleteMessageForEveryone } from "@/hooks/use-message-edit-delete";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Edit2, Check, X } from "lucide-react";

interface MessageItemProps {
  message: {
    id: string;
    body?: string;
    senderId: string;
  };
  currentUserId: string;
}

export default function MessageActionHandler({ message, currentUserId }: MessageItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(message.body || "");

  const { mutate: editMessage, isPending: isEditingPending } = useEditMessage();
  const { mutate: deleteMessage } = useDeleteMessageForEveryone();

  const isOwner = message.senderId === currentUserId;

  if (!isOwner) return null; // শুধু নিজের মেসেজেই এডিট/ডিলিট অপশন থাকবে

  const handleSaveEdit = () => {
    editMessage(
      { messageId: message.id, newBody: editedText },
      {
        onSuccess: () => setIsEditing(false),
      }
    );
  };

  return (
    <div className="flex items-center gap-1 text-xs">
      {isEditing ? (
        <div className="flex items-center gap-1 mt-1">
          <Input
            value={editedText}
            onChange={(e) => setEditedText(e.target.value)}
            className="h-7 text-xs"
          />
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={handleSaveEdit} disabled={isEditingPending}>
            <Check className="h-3 w-3 text-green-600" />
          </Button>
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setIsEditing(false)}>
            <X className="h-3 w-3 text-destructive" />
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => setIsEditing(true)} title="Edit">
            <Edit2 className="h-3 w-3 text-muted-foreground hover:text-foreground" />
          </button>
          <button onClick={() => deleteMessage(message.id)} title="Delete for everyone">
            <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
          </button>
        </div>
      )}
    </div>
  );
}