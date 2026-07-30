"use client";
import React from "react";
import { useGetPendingFriendRequests, useHandleFriendRequest } from "@/hooks/use-user-features";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Check, X, Loader2 } from "lucide-react";

export default function FriendRequestsList() {
  const { data: requests, isLoading } = useGetPendingFriendRequests();
  const { mutate: handleRequest, isPending } = useHandleFriendRequest();

  if (isLoading) return <Loader2 className="h-5 w-5 animate-spin mx-auto my-4" />;
  if (!requests || requests.length === 0) return null;

  return (
    <div className="p-4 border rounded-lg bg-background shadow-sm space-y-3">
      <h3 className="font-semibold text-sm">Friend Requests</h3>
      <div className="space-y-2">
        {requests.map((req: any) => (
          <div key={req.id} className="flex items-center justify-between p-2 bg-muted/50 rounded-md">
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={req.sender?.image} />
                <AvatarFallback>{req.sender?.name?.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium">{req.sender?.name}</span>
            </div>

            <div className="flex gap-1">
              <Button
                size="icon"
                variant="outline"
                className="h-7 w-7 text-green-600 hover:text-green-700"
                disabled={isPending}
                onClick={() => handleRequest({ requestId: req.id, status: "ACCEPTED" })}
              >
                <Check className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="outline"
                className="h-7 w-7 text-destructive hover:text-destructive"
                disabled={isPending}
                onClick={() => handleRequest({ requestId: req.id, status: "REJECTED" })}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}