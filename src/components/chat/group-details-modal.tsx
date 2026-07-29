"use client";

import React, { useState } from "react";
import { useChat } from "@/hooks/use-chat";
import { ShieldCheck, UserMinus, ShieldAlert, X, UserPlus, Loader2 } from "lucide-react";

interface Member {
  id: string;
  name: string;
  image?: string;
}

// 🌟 ১. প্রপস টাইপ আপডেট করা হলো
interface GroupDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: string;
  groupName: string;
  members: Member[];
  adminIds?: string[];
  currentUserId?: string;
  allUsers?: Member[];
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

  const { mutateAsync: removeMember, isPending: isRemoving } = useChat.useRemoveGroupMember();
  const { mutateAsync: makeAdmin, isPending: isPromoting } = useChat.useMakeGroupAdmin();
  const { mutateAsync: addMembers, isPending: isAdding } = useChat.useAddGroupMember();

  // 🌟 open মিথ্যা হলে রেন্ডার হবে না
  if (!open) return null;

  const isCurrentUserAdmin = currentUserId ? adminIds.includes(currentUserId) : false;

  // যারা অলরেডি গ্রুপের সদস্য না তাদের বের করা
  const nonMembers = allUsers.filter((u) => !members.some((m) => m.id === u.id));

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

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-background border rounded-lg p-6 max-w-md w-full shadow-lg space-y-4 relative">
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
        >
          <X className="h-5 w-5" />
        </button>

        <div>
          <h3 className="text-lg font-bold">{groupName}</h3>
          <p className="text-xs text-muted-foreground">{members.length} Members</p>
        </div>

        {/* Member Add Section for Admins */}
        {isCurrentUserAdmin && (
          <div>
            {!isAddMemberOpen ? (
              <button
                type="button"
                onClick={() => setIsAddMemberOpen(true)}
                className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
              >
                <UserPlus className="h-4 w-4" /> Add New Members
              </button>
            ) : (
              <div className="border rounded-md p-3 space-y-2 bg-muted/30">
                <p className="text-xs font-semibold">Select members to add:</p>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {nonMembers.map((user) => (
                    <label key={user.id} className="flex items-center gap-2 text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedNewUserIds.includes(user.id)}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedNewUserIds([...selectedNewUserIds, user.id]);
                          else setSelectedNewUserIds(selectedNewUserIds.filter((id) => id !== user.id));
                        }}
                      />
                      <span>{user.name}</span>
                    </label>
                  ))}
                </div>
                <div className="flex gap-2 justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => setIsAddMemberOpen(false)}
                    className="px-2 py-1 text-xs border rounded"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleAddMembers}
                    disabled={isAdding || selectedNewUserIds.length === 0}
                    className="px-2 py-1 text-xs bg-primary text-primary-foreground rounded flex items-center gap-1"
                  >
                    {isAdding && <Loader2 className="h-3 w-3 animate-spin" />} Add
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Members List */}
        <div className="space-y-2 max-h-60 overflow-y-auto">
          <p className="text-xs font-semibold text-muted-foreground uppercase">Members List</p>
          {members.map((member) => {
            const isAdmin = adminIds.includes(member.id);
            const isMe = member.id === currentUserId;

            return (
              <div
                key={member.id}
                className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 border text-sm"
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium">
                    {member.name} {isMe && "(You)"}
                  </span>
                  {isAdmin && (
                    <span className="flex items-center gap-0.5 text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-semibold">
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
                        className="p-1 hover:bg-muted rounded text-blue-500 transition-colors"
                      >
                        <ShieldAlert className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemove(member.id)}
                      disabled={isRemoving}
                      title="Remove Member"
                      className="p-1 hover:bg-muted rounded text-red-500 transition-colors"
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
    </div>
  );
}