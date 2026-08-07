import React from "react";
import { useMessageRequests } from "@/hooks/useMessageRequests"; // আপনার তৈরি করা হুক
import { Button } from "@/components/ui/button"; // Shadcn UI
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Check, X, Loader2 } from "lucide-react";

export const MessageRequestsTab = () => {
  const { pendingRequests, isRequestsLoading, handleRequest, isHandling } = useMessageRequests();

  if (isRequestsLoading) {
    return (
      <div className="flex justify-center items-center p-6">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (pendingRequests.length === 0) {
    return (
      <div className="text-center p-6 text-sm text-muted-foreground">
        No message requests found.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 p-3 overflow-y-auto max-h-[calc(100vh-150px)]">
      <h3 className="text-xs font-semibold uppercase text-muted-foreground px-2 mb-1">
        Message Requests ({pendingRequests.length})
      </h3>

      {pendingRequests.map((req) => {
        const sender = req.sender;
        return (
          <div
            key={req.id}
            className="flex items-center justify-between p-3 rounded-lg bg-card hover:bg-accent/50 transition-colors border border-border/50"
          >
            {/* Sender Info */}
            <div className="flex items-center gap-3">
              <Avatar className="w-10 h-10">
                <AvatarImage src={sender?.image} alt={sender?.name} />
                <AvatarFallback>{sender?.name?.charAt(0) || "U"}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="font-medium text-sm text-foreground">
                  {sender?.name || "Unknown User"}
                </span>
                <span className="text-xs text-muted-foreground">
                  Wants to send you a message
                </span>
              </div>
            </div>

            {/* Action Buttons (Accept & Reject) */}
            <div className="flex items-center gap-1.5">
              <Button
                size="icon"
                variant="default"
                className="w-8 h-8 rounded-full bg-primary hover:bg-primary/90"
                onClick={() => handleRequest({ requestId: req.id, status: "ACCEPTED" })}
                disabled={isHandling}
                title="Accept"
              >
                <Check className="w-4 h-4 text-primary-foreground" />
              </Button>

              <Button
                size="icon"
                variant="outline"
                className="w-8 h-8 rounded-full hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
                onClick={() => handleRequest({ requestId: req.id, status: "REJECTED" })}
                disabled={isHandling}
                title="Delete"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
};