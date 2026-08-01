"use client";
import React from "react";
import { useUserStore } from "@/store/use-user-store";
import { useSearchUsers, useSendFriendRequest } from "@/hooks/use-user-features";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, UserPlus } from "lucide-react";

export default function UserSearchBox() {
  // ১. Zustand Store থেকে স্টেট ও অ্যাকশন নেওয়া
  const searchQuery = useUserStore((state) => state.searchQuery);
  const setSearchQuery = useUserStore((state) => state.setSearchQuery);

  // ২. TanStack Query Hook ব্যবহার করে ডাটা ফেচ করা
  const { data: users, isLoading } = useSearchUsers(searchQuery);

  // ৩. মিউটেশন হুক (ফ্রেন্ড রিকোয়েস্ট পাঠানোর জন্য)
  const { mutate: sendRequest, isPending: isSending } = useSendFriendRequest();

  return (
    <div className="w-full max-w-md mx-auto p-4 border rounded-lg bg-background shadow-sm space-y-4">
      <h3 className="font-semibold text-lg">Find People</h3>

      {/* Search Input */}
      <Input
        placeholder="Search users by name or email..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="w-full"
      />

      {/* Results Area */}
      <div className="space-y-2 max-h-60 overflow-y-auto">
        {isLoading && (
          <div className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {users && users.length === 0 && searchQuery.trim().length > 0 && (
          <p className="text-center text-sm text-muted-foreground py-4">No users found.</p>
        )}

        {users?.map((user: any) => (
          <div
            key={user.id}
            className="flex items-center justify-between p-2 hover:bg-muted rounded-md transition-colors"
          >
            <div className="flex items-center gap-3">
              <Avatar className="h-9 w-9">
                <AvatarImage src={user.image} />
                <AvatarFallback>{user.name?.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium">{user.name}</p>
              </div>
            </div>

            {/* Friend Request Action Button */}
            <Button
              size="sm"
              variant="outline"
              disabled={isSending}
              onClick={() => sendRequest(user.id)}
              className="gap-1"
            >
              <UserPlus className="h-3.5 w-3.5" />
              <span>Add</span>
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}