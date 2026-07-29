"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Users } from "lucide-react";
import { useChat } from "@/hooks/use-chat";

interface User {
  id: string;
  name: string;
  image?: string;
}

interface CreateGroupModalProps {
  userList?: User[];
}

export default function CreateGroupModal({
  userList = [],
}: CreateGroupModalProps) {
  const [open, setOpen] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const { mutateAsync: createGroup, isPending } = useChat.useCreateGroupChat();

  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim() || selectedUserIds.length < 2) return;

    try {
      await createGroup({ name: groupName.trim(), userIds: selectedUserIds });
      setGroupName("");
      setSelectedUserIds([]);
      setOpen(false);
    } catch (err) {
      console.error("Failed to create group:", err);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {/* 🌟 এই Trigger বাটনটি হেডারে আইকন হিসেবে শো করবে */}
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" title="Create Group Chat">
          <Users className="h-4 w-4" />
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" /> Create Group Chat
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Group Name</label>
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="e.g. Friends Circle"
              className="w-full px-3 py-2 border rounded-md text-sm outline-none focus:ring-2 focus:ring-primary mt-1"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">
              Select Members (At least 2)
            </label>
            <div className="max-h-48 overflow-y-auto border rounded-md p-2 space-y-1 mt-1">
              {userList.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">
                  No users available to add
                </p>
              ) : (
                userList.map((user) => {
                  const isSelected = selectedUserIds.includes(user.id);
                  return (
                    <div
                      key={user.id}
                      onClick={() => toggleUserSelection(user.id)}
                      className={`flex items-center justify-between p-2 rounded-md cursor-pointer text-sm transition-colors ${
                        isSelected ? "bg-primary text-primary-foreground font-medium" : "hover:bg-muted"
                      }`}
                    >
                      <span>{user.name}</span>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        readOnly
                        className="rounded accent-primary"
                      />
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending || !groupName.trim() || selectedUserIds.length < 2}
            >
              {isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Create Group
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}