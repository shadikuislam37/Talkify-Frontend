"use client";

import { useEffect } from "react";
import { socket } from "@/lib/socket";
import { authClient } from "@/lib/auth-client";
import { VideoCallModal } from "@/components/chat/video-call-modal";

/**
 * 🌟 কল পুরো অ্যাপ জুড়ে ধরার জন্য wrapper।
 *
 * আগে VideoCallModal শুধু chat layout-এ mount করা ছিল, তাই ইউজার /chat-এর
 * বাইরে (home, profile, settings) থাকলে layout unmount হয়ে যেত — modal-ও
 * unmount, আর receive_call_offer শোনার কেউ থাকতো না। ফলে "website-এ
 * (chat page-এ) থাকলেই কল দেখা যায়" সমস্যাটা হতো।
 *
 * root layout-এ এটা mount করায় এখন যেকোনো page থেকে কল ধরা যাবে।
 */
export const CallProvider = () => {
  // ⚠️ তোমার auth hook যদি অন্য নামে থাকে, শুধু এই দুই লাইন বদলাও।
  const { data: session } = authClient.useSession();
  const userId = session?.user?.id;

  // 🌟 socket-এ autoConnect: false — আগে connect করা হতো useSocket-এর ভেতরে,
  // যেটা চলে শুধু chat page-এ। তাই chat page-এর বাইরে socket connect-ই থাকতো
  // না, কল event আসারও উপায় ছিল না। লগইন থাকলে এখানেই connect করে রাখা হচ্ছে।
  useEffect(() => {
    if (!userId) return;
    if (!socket.connected) socket.connect();
  }, [userId]);

  // 🔔 কল/মেসেজ notification দেখানোর জন্য permission (একবারই চাইবে)
  useEffect(() => {
    if (!userId) return;
    if (typeof Notification === "undefined") return;
    if (Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }
  }, [userId]);

  if (!userId) return null;

  return <VideoCallModal socket={socket} currentUserId={userId} />;
};
