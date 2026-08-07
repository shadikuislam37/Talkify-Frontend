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
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Users, Search, X } from "lucide-react";
import { AuthUser } from "@/types";
import { CreateGroupInput } from "@/schemas/chat.schema";
import { useCreateGroupChat } from "@/hooks/use-conversations";

interface CreateGroupModalProps {
  userList?: AuthUser[];
  currentUserId?: string; // 🌟 কারেন্ট ইউজারকে লিস্ট থেকে বাদ দেওয়ার জন্য অপশনাল
}

export default function CreateGroupModal({
  userList = [],
  currentUserId,
}: CreateGroupModalProps) {
  const [open, setOpen] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [searchFilter, setSearchFilter] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  const { mutateAsync: createGroup, isPending } = useCreateGroupChat();

  const resetForm = () => {
    setGroupName("");
    setSearchFilter("");
    setSelectedUserIds([]);
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) resetForm();
  };

  const toggleUserSelection = (userId: string) => {
    if (!userId) return;
    setSelectedUserIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  // কারেন্ট ইউজার ফিল্টার করে লিস্ট তৈরি
  const availableUsers = React.useMemo(() => {
    return userList.filter((u) => u.id !== currentUserId);
  }, [userList, currentUserId]);

  const filteredUsers = availableUsers.filter((user) =>
    user.name?.toLowerCase().includes(searchFilter.toLowerCase())
  );

  const selectedUsers = availableUsers.filter((u) =>
    selectedUserIds.includes(u.id)
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!groupName.trim()) return;

    if (selectedUserIds.length < 2) {
      alert("Please select at least 2 members");
      return;
    }

    try {
      await createGroup({
        name: groupName.trim(),
        userIds: selectedUserIds,
      } as CreateGroupInput);

      resetForm();
      setOpen(false);
    } catch (err) {
      console.error("Failed to create group:", err);
    }
  };

  const isButtonDisabled =
    isPending || !groupName.trim() || selectedUserIds.length < 2;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
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

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Group Name Field */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Group Name <span className="text-red-500">*</span>
            </label>
            <Input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="e.g. Friends Circle"
              autoComplete="off"
              required
            />
          </div>

          {/* Member Selection Section */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-medium text-muted-foreground">
                Select Members (At least 2) <span className="text-red-500">*</span>
              </label>
              <span className="text-[11px] font-semibold text-primary">
                {selectedUserIds.length} selected
              </span>
            </div>

            {/* 🌟 Selected Members Badges */}
            {selectedUsers.length > 0 && (
              <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto p-1 bg-muted/40 rounded-md border">
                {selectedUsers.map((user) => (
                  <span
                    key={user.id}
                    className="inline-flex items-center gap-1 bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full border border-primary/20"
                  >
                    <span className="truncate max-w-[100px]">{user.name}</span>
                    <button
                      type="button"
                      onClick={() => toggleUserSelection(user.id)}
                      className="hover:text-destructive transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* User Search Input */}
            {availableUsers.length > 5 && (
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Filter users..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="pl-8 h-8 text-xs"
                />
              </div>
            )}

            {/* User List Container */}
            <div className="max-h-48 overflow-y-auto border rounded-md p-1 space-y-1">
              {filteredUsers.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">
                  {availableUsers.length === 0
                    ? "No users available"
                    : "No matching user found"}
                </p>
              ) : (
                filteredUsers.map((user) => {
                  const uId = user.id;
                  const isSelected = selectedUserIds.includes(uId);

                  return (
                    <div
                      key={uId}
                      onClick={() => toggleUserSelection(uId)}
                      className={`flex items-center justify-between p-2 rounded-md cursor-pointer text-sm transition-colors ${
                        isSelected
                          ? "bg-primary/10 border-primary/30 border font-medium text-primary"
                          : "hover:bg-muted"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Avatar className="h-7 w-7">
                          <AvatarImage src={user.image || undefined} />
                          <AvatarFallback className="text-[10px]">
                            {user.name ? user.name.slice(0, 2).toUpperCase() : "U"}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs sm:text-sm">{user.name}</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        readOnly
                        className="rounded accent-primary h-4 w-4 cursor-pointer"
                      />
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isButtonDisabled}>
              {isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Create Group
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}