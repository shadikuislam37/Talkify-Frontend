import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// 🌟 স্মার্ট চ্যাট টাইম ফরম্যাট (আজকের হলে শুধু টাইম, পুরনো হলে তারিখসহ টাইম)
export const formatTime = (dateStr?: string | Date | null) => {
  if (!dateStr) return "";
  
  const date = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
  
  // Invalid Date হ্যান্ডলিং (নিরাপত্তার জন্য)
  if (isNaN(date.getTime())) return "";

  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  if (isToday) {
    // আজকের মেসেজ হলে শুধু সময় দেখাবে (যেমন: 11:18 PM)
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  } else {
    // আগের দিনের মেসেজ হলে ছোট তারিখ এবং সময় দুটোই দেখাবে (যেমন: Aug 8, 11:18 PM)
    const dateFormatted = date.toLocaleDateString([], { 
      month: 'short', 
      day: 'numeric' 
    });
    const timeFormatted = date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    return `${dateFormatted}, ${timeFormatted}`;
  }
};

// 🌟 Last Seen ফরম্যাট ফাংশন
export function formatLastSeen(dateString?: string | Date | null): string {
  if (!dateString) return "Offline";

  const date = new Date(dateString);
  const now = new Date();
  
  if (isNaN(date.getTime())) return "Offline";

  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  // যদি নেগেティブ টাইম হয় (টাইমজোন বা ক্লক সিন্ক ইস্যুর কারণে), তবে Active just now দেখাবে
  if (diffInSeconds < 60) {
    return "Active just now";
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `Active ${diffInMinutes}m ago`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `Active ${diffInHours}h ago`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `Active ${diffInDays}d ago`;
  }

  return `Last seen ${date.toLocaleDateString()}`;
}