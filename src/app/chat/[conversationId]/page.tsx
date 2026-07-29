"use client";

import React, { use } from "react";
import ChatLayout from "../Chatlayout";

interface PageProps {
  params: Promise<{
    conversationId: string;
  }>;
}

export default function SingleConversationPage({ params }: PageProps) {
  const resolvedParams = use(params);

  return (
    <div className="h-screen w-full overflow-hidden">
      <ChatLayout />
    </div>
  );
}