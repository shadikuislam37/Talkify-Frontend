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