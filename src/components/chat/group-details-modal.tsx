"use client";

import React, { useState } from "react";
import { useChat } from "@/hooks/use-chat";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  ShieldCheck,
  UserMinus,
  ShieldAlert,
  UserPlus,
  Loader2,
  LogOut,
} from "lucide-react";
import { AuthUser } from "@/types";

interface GroupDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: string;
  groupName: string;
  members: AuthUser[];
  adminIds?: string[];
  currentUserId?: string;
  allUsers?: AuthUser[];
}

export default function GroupDetailsModal({
  open,
  onOpenChange,
  conversationId,
  groupName,
  members = [],
  adminIds = [],
  currentUserId,
  allUsers = [],
}: GroupDetailsModalProps) {
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [selectedNewUserIds, setSelectedNewUserIds] = useState<string[]>([]);

  const { mutateAsync: removeMember, isPending: isRemoving } =
    useChat.useRemoveGroupMember();
  const { mutateAsync: makeAdmin, isPending: isPromoting } =
    useChat.useMakeGroupAdmin();
  const { mutateAsync: addMembers, isPending: isAdding } =
    useChat.useAddGroupMember();
  const { mutateAsync: leaveGroup, isPending: isLeaving } =
    useChat.useLeaveGroup?.() || { mutateAsync: async () => {} };

  const isCurrentUserAdmin = currentUserId
    ? adminIds.includes(currentUserId)
    : false;

  // যারা অলরেডি গ্রুপের সদস্য না তাদের ফিল্টার করা
  const nonMembers = allUsers.filter(
    (u) => !members.some((m) => m.id === u.id)
  );

  const handleRemove = async (targetUserId: string) => {
    if (confirm("Are you sure you want to remove this member?")) {
      await removeMember({ conversationId, targetUserId });
    }
  };

  const handleMakeAdmin = async (targetUserId: string) => {
    if (confirm("Make this member a Group Admin?")) {
      await makeAdmin({ conversationId, targetUserId });
    }
  };

  const handleAddMembers = async () => {
    if (selectedNewUserIds.length === 0) return;
    await addMembers({ conversationId, userIds: selectedNewUserIds });
    setSelectedNewUserIds([]);
    setIsAddMemberOpen(false);
  };

  const handleLeaveGroup = async () => {
    if (confirm("Are you sure you want to leave this group?")) {
      await leaveGroup(conversationId);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">{groupName}</DialogTitle>
          <p className="text-xs text-muted-foreground">
            {members.length} Members
          </p>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Member Add Section for Admins */}
          {isCurrentUserAdmin && (
            <div>
              {!isAddMemberOpen ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAddMemberOpen(true)}
                  className="w-full flex items-center justify-center gap-2 border-dashed"
                >
                  <UserPlus className="h-4 w-4 text-primary" />
                  <span>Add New Members</span>
                </Button>
              ) : (
                <div className="border rounded-lg p-3 space-y-3 bg-muted/30">
                  <p className="text-xs font-semibold">Select members to add:</p>

                  {nonMembers.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-2 text-center">
                      No external users available to add.
                    </p>
                  ) : (
                    <div className="max-h-36 overflow-y-auto space-y-2 pr-1">
                      {nonMembers.map((user) => (
                        <label
                          key={user.id}
                          className="flex items-center gap-2 text-xs cursor-pointer hover:bg-muted p-1.5 rounded transition-colors"
                        >
                          <input
                            type="checkbox"
                            className="rounded border-gray-300 text-primary focus:ring-primary"
                            checked={selectedNewUserIds.includes(user.id)}
                            onChange={(e) => {
                              if (e.target.checked)
                                setSelectedNewUserIds([
                                  ...selectedNewUserIds,
                                  user.id,
                                ]);
                              else
                                setSelectedNewUserIds(
                                  selectedNewUserIds.filter(
                                    (id) => id !== user.id
                                  )
                                );
                            }}
                          />
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={user.image || undefined} />
                            <AvatarFallback>
                              {user?.name ? user.name.slice(0, 2).toUpperCase() : "U"}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{user.name}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2 justify-end pt-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsAddMemberOpen(false)}
                      className="h-8 text-xs"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleAddMembers}
                      disabled={isAdding || selectedNewUserIds.length === 0}
                      className="h-8 text-xs gap-1"
                    >
                      {isAdding && (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      )}
                      Add Selected
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Members List */}
          <div className="space-y-2">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Group Members
            </p>
            <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
              {members.map((member) => {
                const isAdmin = adminIds.includes(member.id);
                const isMe = member.id === currentUserId;

                return (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 border transition-colors text-sm"
                  >
                    <div className="flex items-center gap-2.5">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={member.image || undefined} />
                        <AvatarFallback className="text-xs">
                          {member.name ? member.name.slice(0, 2).toUpperCase() : "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="font-medium text-xs sm:text-sm flex items-center gap-1">
                          {member.name} {isMe && <span className="text-muted-foreground font-normal">(You)</span>}
                        </span>
                      </div>
                      {isAdmin && (
                        <span className="flex items-center gap-0.5 text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-semibold ml-1">
                          <ShieldCheck className="h-3 w-3" /> Admin
                        </span>
                      )}
                    </div>

                    {isCurrentUserAdmin && !isMe && (
                      <div className="flex items-center gap-1">
                        {!isAdmin && (
                          <button
                            type="button"
                            onClick={() => handleMakeAdmin(member.id)}
                            disabled={isPromoting}
                            title="Make Admin"
                            className="p-1.5 hover:bg-muted rounded text-blue-500 transition-colors"
                          >
                            <ShieldAlert className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemove(member.id)}
                          disabled={isRemoving}
                          title="Remove Member"
                          className="p-1.5 hover:bg-muted rounded text-red-500 transition-colors"
                        >
                          <UserMinus className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 🌟 Leave Group Button Section */}
          <div className="pt-2 border-t">
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleLeaveGroup}
              disabled={isLeaving}
              className="w-full flex items-center justify-center gap-2 h-9"
            >
              {isLeaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <LogOut className="h-4 w-4" />
              )}
              <span>Leave Group</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}