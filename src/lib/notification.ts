import { api } from "@/lib/api";
import { getClientMessaging } from "@/lib/firebase";
import { decryptMessage } from "@/lib/crypto";

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

// ৩. লোকাল ও রিমোট পুশ নোটিফিকেশন দেখানো (মোবাইল, আইপ্যাড ও ডেস্কটপ সাপোর্ট সহ)
export const sendPushNotification = async (
  title: string,
  body: string,
  keys?: { userId: string; encryptedKey: string }[] | null,
  currentUserId?: string,
) => {
  if (typeof window === "undefined") return;

  let displayBody = body;

  try {
    // 🌟 মোবাইল ও আইপ্যাডের জন্য ইউজার আইডি মিসিং থাকলে লোকালস্টোরেজ থেকে ফলব্যাক নেওয়া
    let activeUserId = currentUserId;
    if (!activeUserId) {
      try {
        const storedUser = localStorage.getItem("auth_user") || localStorage.getItem("user_id");
        if (storedUser) {
          activeUserId = storedUser.includes("{") ? JSON.parse(storedUser).id : storedUser;
        }
      } catch (e) {
        // সাইলেন্টলি হ্যান্ডেল করবে
      }
    }

    // যদি বডিটি এনক্রিপ্টেড জেসন হয় এবং ডিক্রিপ্ট করার মতো ডেটা থাকে
    if (
      body &&
      body.trim().startsWith("{") &&
      keys &&
      keys.length > 0 &&
      activeUserId
    ) {
      try {
        const decrypted = await decryptMessage(body, keys, activeUserId);
        if (decrypted && !decrypted.startsWith("{")) {
          displayBody = decrypted;
        } else {
          displayBody = "New encrypted message";
        }
      } catch (err) {
        displayBody = "New message";
      }
    } else if (body && body.trim().startsWith("{")) {
      displayBody = "New message received";
    }
  } catch (e) {
    displayBody = "New message received";
  }

  // সব ডিভাইসে নোটিফিকেশন ট্রিগার করার জন্য সার্ভিস ওয়ার্কার ও ফলব্যাক হ্যান্ডলিং
  if ("Notification" in window && Notification.permission === "granted") {
    try {
      if ("serviceWorker" in navigator && navigator.serviceWorker.ready) {
        const registration = await navigator.serviceWorker.ready;
        await registration.showNotification(title, {
          body: displayBody,
          icon: "/icon.svg",
          badge: "/icon.svg",
        } as NotificationOptions);
      } else {
        new Notification(title, {
          body: displayBody,
          icon: "/icon.svg",
        });
      }
    } catch (error) {
      // ফলব্যাক হিসেবে স্ট্যান্ডার্ড নোটিফিকেশন
      try {
        new Notification(title, {
          body: displayBody,
          icon: "/icon.svg",
        });
      } catch (e) {}
    }
  }
};