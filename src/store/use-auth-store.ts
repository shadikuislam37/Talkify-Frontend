import { AuthUser } from "@/types";
import { create } from "zustand";



interface AuthState {
  isAuthenticated: boolean;
  user: AuthUser | null;
  setUser: (user: AuthUser | null) => void;
  updateEmailVerification: (verified: boolean) => void;
  clearUser: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  user: null,

  // 🌟 ইউজার সেট করার সময় ইমেইল ভেরিফাইড কিনা তা চেক করে isAuthenticated সেট হবে
  setUser: (user) =>
    set({
      user,
      isAuthenticated: Boolean(user && user.emailVerified),
    }),

  // 🌟 ভেরিফিকেশন পেজ থেকে ইমেইল ভেরিফাইড হলে স্টেট আপডেট করার জন্য
  updateEmailVerification: (verified) =>
    set((state) => ({
      user: state.user ? { ...state.user, emailVerified: verified } : null,
      isAuthenticated: verified,
    })),

  clearUser: () => set({ user: null, isAuthenticated: false }),
}));