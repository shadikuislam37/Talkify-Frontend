"use client"
import { authClient } from "@/lib/auth-client"; // আপনার অথ হুক
import ChatLayout from "./Chatlayout";
import { VideoCallModal } from "@/components/chat/video-call-modal"; // 🌟 VideoCallModal Import
import { useSocket } from "@/hooks/use-socket"; // 🌟 Socket Hook Import
export default function Page() {
  const { data: session } = authClient.useSession();
  const currentUserId = session?.user?.id;
  const currentUserName = session?.user?.name;

  // 🌟 মেইন সকেট কানেকশন
  const { socket } = useSocket();
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