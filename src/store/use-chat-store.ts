import { create } from "zustand";

interface ChatState {
  // নতুন প্রপার্টি
  activeConversationId: string | null;
  setActiveConversationId: (id: string | null) => void;
  replyToMessageId: string | null;
  setReplyToMessageId: (id: string | null) => void;

  // পুরনো প্রপার্টি বা এলিয়াস (যাতে অন্য কম্পোনেন্টে এরর বা মিসম্যাচ না করে)
  selectedConversationId: string | null;
  setSelectedConversation: (id: string | null, publicKey?: string | null) => void;
  receiverPublicKey: string | null;
  myPrivateKey: CryptoKey | null;
  setMyPrivateKey: (key: CryptoKey | null) => void;

  myPublicKey: string | null;
  setMyPublicKey: (key: string | null) => void;

}

export const useChatStore = create<ChatState>((set) => ({
  activeConversationId: null,
  setActiveConversationId: (id) => set({ activeConversationId: id, selectedConversationId: id }),
  
  replyToMessageId: null,
  setReplyToMessageId: (id) => set({ replyToMessageId: id }),

  // পুরনো নামগুলোর সাপোর্ট বজায় রাখা হলো
  selectedConversationId: null,
  receiverPublicKey: null,
  myPrivateKey: null,
  setSelectedConversation: (id= null, publicKey = null) =>
    set({ activeConversationId: id, selectedConversationId: id, receiverPublicKey: publicKey }),
  setMyPrivateKey: (key) => set({ myPrivateKey: key }),

  myPublicKey: null,
  setMyPublicKey: (key) => set({ myPublicKey: key }),
}));