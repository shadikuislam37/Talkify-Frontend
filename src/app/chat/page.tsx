"use client"
import { authClient } from "@/lib/auth-client"; // আপনার অথ হুক
import ChatLayout from "./Chatlayout";
import { VideoCallModal } from "@/components/chat/video-call-modal"; // 🌟 VideoCallModal Import
import { useSocket } from "@/hooks/use-socket"; // 🌟 Socket Hook Import
import { useEffect } from "react";
import { requestNotificationPermission } from "@/lib/notification";
export default function Page() {
  const { data: session } = authClient.useSession();
  const currentUserId = session?.user?.id;
  const currentUserName = session?.user?.name;

  // 🌟 মেইন সকেট কানেকশন
  const { socket } = useSocket();
   useEffect(() => {
      // ইউজার চ্যাট পেজে ঢোকা মাত্রই নোটিফিকেশন পারমিশন চাইবে ও টোকেন সেভ করবে
      requestNotificationPermission();
    }, []);
  return (
    <>
      <ChatLayout 
        currentUserId={currentUserId} 
        currentUserName={currentUserName} 
      />

      {/* 🌟 ভিডিও কল ডায়ালগ/মডাল মাউন্ট করে দেওয়া হলো */}
      {currentUserId && (
        <VideoCallModal socket={socket} currentUserId={currentUserId} />
      )}
    </>
  );
}