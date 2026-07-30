import { api } from "@/lib/api";

// ১. সাউন্ড বাজানো
export const playNotificationSound = () => {
  if (typeof window === "undefined") return;
  try {
    const audio = new Audio("/sounds/notification.mp3");
    audio.play().catch(() => {
      // ব্রাউজার অটোপ্লে পলিসি ব্লক করলে ইগনোর করবে
    });
  } catch (error) {
    console.error("Audio playback error:", error);
  }
};

// ২. ব্রাউজার পুশ নোটিফিকেশন পারমিশন চাওয়া ও FCM Token ডাটাবেজে পাঠানো
export const requestNotificationPermission = async () => {
  if (typeof window === "undefined") return;

  try {
    if ("Notification" in window) {
      const permission = await Notification.requestPermission();
      
      if (permission === "granted") {
        // ডাইনামিক ইম্পোর্ট (যাতে সার্ভার সাইডে ক্র্যাশ না করে)
        const { getToken } = await import("firebase/messaging");
        const { messaging } = await import("@/lib/firebase");

        const token = await getToken(messaging, {
          vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
        });

        if (token) {
          await api.post("/users/fcm-token", { fcmToken: token });
          console.log("✅ FCM Token generated and saved successfully!");
        }
      }
    }
  } catch (error) {
    console.error("❌ Error requesting notification permission or token:", error);
  }
};

// ৩. লোকাল পুশ নোটিফিকেশন দেখানো
export const sendPushNotification = (title: string, body: string) => {
  if (typeof window === "undefined") return;

  if ("Notification" in window && Notification.permission === "granted") {
    new Notification(title, {
      body,
      icon: "/logo.png",
    });
  }
};