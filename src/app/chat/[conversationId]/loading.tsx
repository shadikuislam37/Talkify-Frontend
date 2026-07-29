import React from "react";
import { Loader2 } from "lucide-react";

export default function ChatLoading() {
  return (
    <div className="h-screen w-full flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm font-medium">Loading chat conversation...</p>
      </div>
    </div>
  );
}