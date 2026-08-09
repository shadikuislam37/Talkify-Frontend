"use client"
import { authClient } from "@/lib/auth-client";
import ChatLayout from "./Chatlayout";
import { VideoCallModal } from "@/components/chat/video-call-modal";
import { useSocket } from "@/hooks/use-socket";
import { useEffect } from "react";
import { requestNotificationPermission } from "@/lib/notification";

export default function Page() {
  const { data: session } = authClient.useSession();
  const currentUserId = session?.user?.id;
  const currentUserName = session?.user?.name;

  const { socket } = useSocket();

  useEffect(() => {
    requestNotificationPermission();
    // 🌟 ফিক্স: আগে এখানে initializeUserKeys() শর্তহীনভাবে কল হতো, যেটা নতুন ডিভাইসে
    // E2EEPinModal-এর RESTORE flow-এর সাথে রেস করত — মডাল কিছু বলার আগেই এখানে নতুন
    // keypair জেনারেট হয়ে যেত, ফলে পুরনো PIN-backup অকেজো হয়ে পুরনো মেসেজ স্থায়ীভাবে
    // অপাঠ্য হয়ে যেত। Key setup/restore-এর দায়িত্ব এখন একমাত্র E2EEPinModal-এর
    // (ChatLayout-এর ভেতরে রেন্ডার হয়), তাই এখান থেকে সরানো হলো।
  }, [currentUserId]);

  return (
    <>
      <ChatLayout
        currentUserId={currentUserId}
        currentUserName={currentUserName}
      />

   
    </>
  );
}
