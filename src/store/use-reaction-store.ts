import { create } from "zustand";

interface ReactionState {
  reactionsMap: { [messageId: string]: any[] };
  setReactions: (messageId: string, reactions: any[]) => void;
  addOrUpdateReaction: (messageId: string, reaction: any) => void;
}

export const useReactionStore = create<ReactionState>((set) => ({
  reactionsMap: {},
  setReactions: (messageId, reactions) =>
    set((state) => ({
      reactionsMap: { ...state.reactionsMap, [messageId]: reactions },
    })),
  addOrUpdateReaction: (messageId, reaction) =>
    set((state) => {
      const currentReactions = state.reactionsMap[messageId] || [];
      const existingIndex = currentReactions.findIndex(
        (r: any) => String(r.userId) === String(reaction.userId)
      );

      const updated = [...currentReactions];
      if (existingIndex > -1) {
        if (!reaction.emoji) {
          updated.splice(existingIndex, 1); // ইমোজি রিমুভ
        } else {
          updated[existingIndex] = reaction; // আপডেট
        }
      } else if (reaction.emoji) {
        updated.push(reaction); // নতুন রিঅ্যাকশন
      }

      return {
        reactionsMap: { ...state.reactionsMap, [messageId]: updated },
      };
    }),
}));