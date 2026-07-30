"use client";
import React from "react";
import { useAddGroupMember, useRemoveGroupMember, useMakeGroupAdmin, useUpdateGroupDetails } from "@/hooks/use-group";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Shield, UserMinus, Loader2 } from "lucide-react";

interface GroupDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: string;
  groupName: string;
  members: any[];
  adminIds: string[];
  currentUserId?: string;
}

export default function GroupDetailsModal({
  open,
  onOpenChange,
  conversationId,
  groupName,
  members = [],
  adminIds = [],
  currentUserId,
}: GroupDetailsModalProps) {
  const { mutate: removeMember, isPending: isRemoving } = useRemoveGroupMember();
  const { mutate: makeAdmin } = useMakeGroupAdmin();

  const isAdmin = adminIds.includes(currentUserId || "");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{groupName} - Members ({members.length})</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 max-h-80 overflow-y-auto mt-2">
          {members.map((member) => {
            const isUserAdmin = adminIds.includes(member.id);

            return (
              <div key={member.id} className="flex items-center justify-between p-2 hover:bg-muted rounded-md">
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={member.image} />
                    <AvatarFallback>{member.name?.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">{member.name}</p>
                    <p className="text-[11px] text-muted-foreground">{isUserAdmin ? "Admin" : "Member"}</p>
                  </div>
                </div>

                {isAdmin && member.id !== currentUserId && (
                  <div className="flex items-center gap-1">
                    {!isUserAdmin && (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => makeAdmin({ conversationId, targetUserId: member.id })}
                        title="Make Admin"
                      >
                        <Shield className="h-4 w-4 text-blue-500" />
                      </Button>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      disabled={isRemoving}
                      onClick={() => removeMember({ conversationId, targetUserId: member.id })}
                      title="Remove from group"
                    >
                      <UserMinus className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}