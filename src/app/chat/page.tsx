"use client"
import { authClient } from "@/lib/auth-client"; 
import ChatLayout from "./Chatlayout";
import { VideoCallModal } from "@/components/chat/video-call-modal"; 
import { useSocket } from "@/hooks/use-socket"; 
import { useEffect } from "react";
import { requestNotificationPermission } from "@/lib/notification";
import { initializeUserKeys } from "@/lib/crypto"; // 🌟 ক্রিপ্টো ইউটিলিটি ইম্পোর্ট
import { api } from "@/lib/api";

export default function Page() {
  const { data: session } = authClient.useSession();
  const currentUserId = session?.user?.id;
  const currentUserName = session?.user?.name;

  const { socket } = useSocket();

  useEffect(() => {
    requestNotificationPermission();

    // 🌟 চ্যাট পেজে ঢোকা মাত্রই E2EE-এর জন্য Key Pair জেনারেট ও সিঙ্ক করা
    if (currentUserId) {
      initializeUserKeys(currentUserId, async (publicKey) => {
        try {
          await api.patch("/users/public-key", { publicKey });
        } catch (err) {
          console.error("Failed to sync public key:", err);
        }
      });
    }
  }, [currentUserId]);

  return (
    <>
      <ChatLayout 
        currentUserId={currentUserId} 
        currentUserName={currentUserName} 
      />

      {currentUserId && (
        <VideoCallModal socket={socket} currentUserId={currentUserId} />
      )}
    </>
  );
}