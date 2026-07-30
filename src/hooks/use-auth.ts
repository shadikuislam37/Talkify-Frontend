import { useSyncExternalStore } from "react";
import { useAuthStore } from "@/store/use-auth-store";

// Hydration স্টেট ট্র্যাক করার জন্য হেলপার
const emptySubscribe = () => () => {};

export const useAuth = () => {
  const store = useAuthStore();

  // Client-side রেন্ডারে true এবং Server-side-এ false রিটার্ন করবে (কোনো Effect ছাড়া)
  const isHydrated = useSyncExternalStore(
    emptySubscribe,
    () => true,  // Client snapshot
    () => false  // Server snapshot
  );

  return {
    ...store,
    isHydrated,
  };
};