import { api } from "@/lib/api";
import { getClientMessaging } from "@/lib/firebase";
import { decryptMessage } from "@/lib/crypto"; // ডিক্রিপশনের জন্য ইম্পোর্ট করা হলো

// ১. সাউন্ড বাজানো (ফাইল না থাকলে ক্র্যাশ করবে না)
export const playNotificationSound = () => {
  if (typeof window === "undefined") return;
  try {
    const audio = new Audio("/sounds/notification.mp3");
    audio.play().catch(() => {
      // ব্রাউজার অটোপ্লে পলিসি ব্লক করলে ইগনোর করবে
    });
  } catch (error) {
    // সাউন্ড ফাইল না থাকলে সাইলেন্টলি হ্যান্ডেল করবে
  }
};

// ২. ব্রাউজার পুশ নোটিফিকেশন পারমিশন ও FCM Token সেভ
export const requestNotificationPermission = async () => {
  if (typeof window === "undefined") return;

  try {
    if ("Notification" in window) {
      const permission = await Notification.requestPermission();
      
      if (permission === "granted") {
        const messaging = await getClientMessaging();
        
        if (!messaging) {
          console.warn("Firebase Messaging is not supported in this browser.");
          return;
        }

        const { getToken } = await import("firebase/messaging");

        const token = await getToken(messaging, {
          vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
        });

        if (token) {
          await api.post("/users/fcm-token", { fcmToken: token });
        }
      }
    }
  } catch (error) {
    console.error("❌ Error requesting notification permission:", error);
  }
};

// ৩. লোকাল পুশ নোটিফিকেশন দেখানো (এনক্রিপ্টেড টেক্সট ফিক্স সহ)
export const sendPushNotification = async (title: string, body: string, keys?: any[], currentUserId?: string) => {
  if (typeof window === "undefined") return;

  let displayBody = body;

  try {
    // যদি বডিটি এনক্রিপ্টেড জেসন বা সিপার্থটেক্সট হয় এবং ডিক্রিপ্ট করার মতো keys ও currentUserId থাকে
    if (body && body.trim().startsWith("{") && keys && keys.length > 0 && currentUserId) {
      try {
        const decrypted = await decryptMessage(body, keys, currentUserId);
        if (decrypted && !decrypted.startsWith("{")) {
          displayBody = decrypted;
        } else {
          displayBody = "New encrypted message";
        }
      } catch (err) {
        displayBody = "New encrypted message";
      }
    } else if (body && body.trim().startsWith("{")) {
      // কি বা ইউজার আইডি না থাকলে হিজিবিজি কোড না দেখিয়ে ক্লিন টেক্সট দেখাবে
      displayBody = "New message received";
    }
  } catch (e) {
    displayBody = "New message received";
  }

  if ("Notification" in window && Notification.permission === "granted") {
    new Notification(title, {
      body: displayBody,
      icon: "/icon.svg", 
    });
  }
};