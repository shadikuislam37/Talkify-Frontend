import { create } from "zustand";

export interface AuthUser {
  id: string;
  name: string | null;
  email: string | null;
  phone?: string | null;
  image: string | null;
  role?: "ADMIN" | "USER";
  emailVerified: boolean;
  phoneVerified?: boolean;
  createdAt: string;
  updatedAt: string;
}

interface AuthState {
  isAuthenticated: boolean;
  user: AuthUser | null;
  setUser: (user: AuthUser | any) => void;
  clearUser: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  user: null,
  setUser: (user) => set({ user, isAuthenticated: true }),
  clearUser: () => set({ user: null, isAuthenticated: false }),
}));