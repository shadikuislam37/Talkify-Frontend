import { create } from "zustand";

interface TypingState {
  typingUsers: Record<string, boolean>; // conversationId -> isTyping
  setTyping: (conversationId: string, isTyping: boolean) => void;
}

export const useTypingStore = create<TypingState>((set) => ({
  typingUsers: {},
  setTyping: (conversationId, isTyping) =>
    set((state) => ({
      typingUsers: { ...state.typingUsers, [conversationId]: isTyping },
    })),
}));