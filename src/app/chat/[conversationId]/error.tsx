"use client";

import React, { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw } from "lucide-react";

export default function ChatError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Chat Page Error:", error);
  }, [error]);

  return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-background p-4 text-center">
      <div className="max-w-md w-full border rounded-lg p-6 bg-card space-y-4 shadow-sm">
        <div className="flex justify-center text-destructive">
          <AlertCircle className="h-10 w-10" />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-bold">Failed to load conversation</h2>
          <p className="text-xs text-muted-foreground">
            {error.message || "Something went wrong while fetching the messages."}
          </p>
        </div>
        <Button
          onClick={() => reset()}
          variant="outline"
          className="gap-2 w-full"
        >
          <RefreshCw className="h-4 w-4" /> Try Again
        </Button>
      </div>
    </div>
  );
}