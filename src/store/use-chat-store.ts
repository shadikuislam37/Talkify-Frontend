// import { create } from "zustand";

// interface ChatState {
//   selectedConversationId: string | null;
//   receiverPublicKey: string | null;
//   myPrivateKey: CryptoKey | null;
//   setSelectedConversation: (id: string | null, publicKey?: string | null) => void;
//   setMyPrivateKey: (key: CryptoKey | null) => void;
// }

// export const useChatStore = create<ChatState>((set) => ({
//   selectedConversationId: null,
//   receiverPublicKey: null,
//   myPrivateKey: null,
//   setSelectedConversation: (id, publicKey = null) =>
//     set({ selectedConversationId: id, receiverPublicKey: publicKey }),
//   setMyPrivateKey: (key) => set({ myPrivateKey: key }),
// }));




import { create } from "zustand";

interface ChatState {
  activeConversationId: string | null;
  setActiveConversationId: (id: string | null) => void;
  replyToMessageId: string | null;
  setReplyToMessageId: (id: string | null) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  activeConversationId: null,
  setActiveConversationId: (id) => set({ activeConversationId: id }),
  replyToMessageId: null,
  setReplyToMessageId: (id) => set({ replyToMessageId: id }),
}));