"use client"
import { authClient } from "@/lib/auth-client"; // আপনার অথ হুক
import ChatLayout from "./Chatlayout";
export default function Page() {
  const { data: session } = authClient.useSession();

  return (
    <ChatLayout 
      currentUserId={session?.user?.id} 
      currentUserName={session?.user?.name} 
    />
  );
}