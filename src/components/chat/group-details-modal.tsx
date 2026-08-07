"use client";

import React, { useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ShieldCheck, UserMinus, ShieldAlert, UserPlus, Loader2, LogOut, Camera, Check, Edit2, Palette } from "lucide-react";
import { AuthUser } from "@/types";
import { useAddGroupMember, useMakeGroupAdmin, useRemoveGroupMember, useUpdateGroupDetails } from "@/hooks/use-conversations";
import { mediaApi } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";
import { ThemePicker } from "./theme-picker";

interface GroupDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: string;
  groupName: string;
  groupImage?: string | null;
  members: AuthUser[];
  adminIds?: string[];
  currentUserId?: string;
  allUsers?: AuthUser[];
}

// 🌟 নতুন থিম পিকার কম্পোনেন্ট (কোনো পুরনো কোড না সরিয়ে আলাদাভাবে যুক্ত করা হয়েছে)

export default function GroupDetailsModal({
  open,
  onOpenChange,
  conversationId,
  groupName,
  groupImage,
  members = [],
  adminIds = [],
  currentUserId,
  allUsers = [],
}: GroupDetailsModalProps) {
  const queryClient = useQueryClient();

  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [selectedNewUserIds, setSelectedNewUserIds] = useState<string[]>([]);

  // গ্রুপ নাম ও ছবি এডিট স্টেট
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(groupName);
  const [image, setImage] = useState(groupImage || "");
  const [isUploading, setIsUploading] = useState(false);

  const { mutateAsync: removeMember, isPending: isRemoving } = useRemoveGroupMember();
  const { mutateAsync: makeAdmin, isPending: isPromoting } = useMakeGroupAdmin();
  const { mutateAsync: addMembers, isPending: isAdding } = useAddGroupMember();
  const { mutateAsync: updateGroup, isPending: isUpdating } = useUpdateGroupDetails();

  const isLeaving = isRemoving;
  const isCurrentUserAdmin = currentUserId ? adminIds.includes(currentUserId) : false;
  const nonMembers = allUsers.filter((u) => !members.some((m) => m.id === u.id));

  const fileInputRef = useRef<HTMLInputElement>(null);

  // গ্রুপ ছবি আপলোড হ্যান্ডলার
  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
  
      setIsUploading(true);
      const formData = new FormData();
      formData.append("files", file);
  
      try {
        const res = await mediaApi.post("/media/upload", formData);
  
        if (res.data?.success && res.data?.data?.[0]?.fileUrl) {
          setImage(res.data.data[0].fileUrl);
        } else {
          alert(res.data?.message || "Failed to upload image.");
        }
      } catch (error: any) {
        console.error("Upload error:", error);
        alert(
          error.response?.data?.message ||
          error.message ||
          "Something went wrong while uploading!"
        );
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };

  // গ্রুপ নাম ও ছবি সেভ হ্যান্ডলার
  const handleSaveGroupDetails = async () => {
    try {
      await updateGroup({ conversationId, name, image });
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ["conversations", conversationId] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    } catch (error) {
      console.error("Failed to update group details", error);
    }
  };

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
    if (selectedNewUserIds.length === 0 || !currentUserId) return;
    await addMembers({ conversationId, userIds: selectedNewUserIds, currentUserId });
    setSelectedNewUserIds([]);
    setIsAddMemberOpen(false);
  };

  const handleLeaveGroup = async () => {
    if (!currentUserId) return;
    if (confirm("Are you sure you want to leave this group?")) {
      await removeMember({ conversationId, targetUserId: currentUserId });
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          {/* গ্রুপ প্রোফাইল ও নাম এডিট সেকশন */}
          <div className="flex flex-col items-center justify-center pb-3 border-b border-border relative">
            <div className="relative group">
              <Avatar className="h-16 w-16">
                <AvatarImage src={image} alt={name} />
                <AvatarFallback className="text-lg font-bold">
                  {name ? name.slice(0, 2).toUpperCase() : "GP"}
                </AvatarFallback>
              </Avatar>

              {isCurrentUserAdmin && isEditing && (
                <label className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full cursor-pointer text-white">
                  {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                </label>
              )}
            </div>

            <div className="mt-2.5 w-full flex items-center justify-center gap-2">
              {isEditing ? (
                <div className="flex items-center gap-2 w-full px-4">
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Group name"
                    className="h-8 text-sm"
                  />
                  <Button size="sm" onClick={handleSaveGroupDetails} disabled={isUpdating} className="h-8 px-2.5">
                    {isUpdating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <DialogTitle className="text-lg font-bold">{name}</DialogTitle>
                  {isCurrentUserAdmin && (
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setIsEditing(true)}>
                      <Edit2 className="h-3 w-3 text-muted-foreground" />
                    </Button>
                  )}
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{members.length} Members</p>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          
          {/* 🌟 নতুন গ্রুপ থিম সেকশন (অরিজিনাল কোড অপরিবর্তিত রেখে এখানে বসানো হয়েছে) */}
          <div className="space-y-2 border-b pb-3">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Palette className="h-3.5 w-3.5" /> Group Theme
            </p>
            <ThemePicker conversationId={conversationId} />
          </div>

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
                                setSelectedNewUserIds([...selectedNewUserIds, user.id]);
                              else
                                setSelectedNewUserIds(selectedNewUserIds.filter((id) => id !== user.id));
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
                      {isAdding && <Loader2 className="h-3 w-3 animate-spin" />}
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
            <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1">
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

          {/* Leave Group Button Section */}
          <div className="pt-2 border-t">
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleLeaveGroup}
              disabled={isLeaving || !currentUserId}
              className="w-full flex items-center justify-center gap-2 h-9"
            >
              {isLeaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
              <span>Leave Group</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}