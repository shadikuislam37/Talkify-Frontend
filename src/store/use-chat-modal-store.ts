import { create } from "zustand";

interface ChatModalState {
  isGroupDetailsOpen: boolean;
  setGroupDetailsOpen: (isOpen: boolean) => void;
  isProfileOpen: boolean;
  setProfileOpen: (isOpen: boolean) => void;
}

export const useChatModalStore = create<ChatModalState>((set) => ({
  isGroupDetailsOpen: false,
  setGroupDetailsOpen: (isOpen) => set({ isGroupDetailsOpen: isOpen }),
  isProfileOpen: false,
  setProfileOpen: (isOpen) => set({ isProfileOpen: isOpen }),
}));