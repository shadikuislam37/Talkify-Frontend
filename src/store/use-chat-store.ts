import { create } from "zustand";

interface ChatState {
  // কনভার্সেশন ও চ্যাট সম্পর্কিত স্টেট
  activeConversationId: string | null;
  setActiveConversationId: (id: string | null) => void;
  replyToMessageId: string | null;
  setReplyToMessageId: (id: string | null) => void;

  selectedConversationId: string | null;
  setSelectedConversation: (id: string | null, publicKey?: string | null) => void;
  receiverPublicKey: string | null;
  myPrivateKey: CryptoKey | null;
  setMyPrivateKey: (key: CryptoKey | null) => void;

  myPublicKey: string | null;
  setMyPublicKey: (key: string | null) => void;

  // 🌟 নতুন যোগ করা হলো: Message Request স্টেটসমূহ
  pendingMessageRequests: any[];
  setPendingMessageRequests: (requests: any[]) => void;
  addMessageRequest: (request: any) => void;
  removeMessageRequest: (requestId: string) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  activeConversationId: null,
  setActiveConversationId: (id) => set({ activeConversationId: id, selectedConversationId: id }),
  
  replyToMessageId: null,
  setReplyToMessageId: (id) => set({ replyToMessageId: id }),

  selectedConversationId: null,
  receiverPublicKey: null,
  myPrivateKey: null,
  setSelectedConversation: (id = null, publicKey = null) =>
    set({ activeConversationId: id, selectedConversationId: id, receiverPublicKey: publicKey }),
  setMyPrivateKey: (key) => set({ myPrivateKey: key }),

  myPublicKey: null,
  setMyPublicKey: (key) => set({ myPublicKey: key }),

  // 🌟 Message Request Actions & State Implementation
  pendingMessageRequests: [],
  setPendingMessageRequests: (requests) => set({ pendingMessageRequests: requests }),
  addMessageRequest: (request) => 
    set((state) => ({ pendingMessageRequests: [request, ...state.pendingMessageRequests] })),
  removeMessageRequest: (requestId) => 
    set((state) => ({
      pendingMessageRequests: state.pendingMessageRequests.filter((req) => req.id !== requestId),
    })),
}));