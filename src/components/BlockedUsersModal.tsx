"use client";
import React from "react";
import { useUnblockUser } from "@/hooks/use-user-features";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Unlock } from "lucide-react";

interface BlockedUsersProps {
  blockedUsers: any[];
}

export default function BlockedUsersList({ blockedUsers = [] }: BlockedUsersProps) {
  const { mutate: unblockUser, isPending } = useUnblockUser();

  if (blockedUsers.length === 0) {
    return <p className="text-xs text-muted-foreground text-center py-4">No blocked users.</p>;
  }

  return (
    <div className="space-y-3 max-h-60 overflow-y-auto">
      {blockedUsers.map((user) => (
        <div key={user.id} className="flex items-center justify-between p-2 bg-muted/40 rounded-md">
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src={user.image} />
              <AvatarFallback>{user.name?.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium">{user.name}</span>
          </div>

          <Button
            size="sm"
            variant="outline"
            disabled={isPending}
            onClick={() => unblockUser(user.id)}
            className="gap-1 h-8"
          >
            {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Unlock className="h-3 w-3" />}
            <span>Unblock</span>
          </Button>
        </div>
      ))}
    </div>
  );
}