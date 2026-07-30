// src/lib/toast.ts
import { toast } from "sonner";

export const showToast = {
  success: (message: string, description?: string) => {
    toast.success(message, { description });
  },
  error: (message: string, description?: string) => {
    toast.error(message, { description });
  },
  info: (message: string, description?: string) => {
    toast.info(message, { description });
  },
  // 🌟 সবচেয়ে কাজের জিনিস: কোনো প্রমিস (API Call) শেষ হওয়া পর্যন্ত Loading দেখাবে, তারপর Success/Error
  promise: <T>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((err: any) => string);
    }
  ) => {
    return toast.promise(promise, messages);
  },
};