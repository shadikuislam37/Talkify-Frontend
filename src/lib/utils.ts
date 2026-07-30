import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}



export const formatTime = (dateStr?: string | Date | null) => {
  if (!dateStr) return "";
  
  const date = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
  
  // Invalid Date হ্যান্ডলিং (নিরাপত্তার জন্য)
  if (isNaN(date.getTime())) return "";

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
};


// lib/utils.ts

export function formatLastSeen(dateString?: string | Date): string {
  if (!dateString) return "Offline";

  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

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