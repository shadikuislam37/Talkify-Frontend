import { create } from "zustand";
import { Message } from "@/types";

interface MessageCacheState {
  decryptedCache: Record<string, Message[]>;
  setDecryptedMessages: (conversationId: string, messages: Message[]) => void;
  getDecryptedMessages: (conversationId: string) => Message[] | undefined;
}

export const useMessageCacheStore = create<MessageCacheState>((set, get) => ({
  decryptedCache: {},
  setDecryptedMessages: (conversationId, messages) =>
    set((state) => ({
      decryptedCache: { ...state.decryptedCache, [conversationId]: messages },
    })),
  getDecryptedMessages: (conversationId) => get().decryptedCache[conversationId],
}));