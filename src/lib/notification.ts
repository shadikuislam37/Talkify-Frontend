// ১. সাউন্ড বাজানো
export const playNotificationSound = () => {
  try {
    const audio = new Audio("/sounds/notification.mp3");
    audio.play().catch(() => {
      // ব্রাউজার অটোপ্লে পলিসি ব্লক করলে ইগনোর করবে
    });
  } catch (error) {
    console.error("Audio playback error:", error);
  }
};

// ২. ব্রাউজার পুশ নোটিফিকেশন পারমিশন চাওয়া
export const requestNotificationPermission = async () => {
  if ("Notification" in window && Notification.permission === "default") {
    await Notification.requestPermission();
  }
};

// ৩. পুশ নোটিফিকেশন পাঠানো
export const sendPushNotification = (title: string, body: string) => {
  if ("Notification" in window && Notification.permission === "granted") {
    new Notification(title, {
      body,
      icon: "/logo.png", // আপনার অ্যাপের লোগো ডিরেক্টরি
    });
  }
};