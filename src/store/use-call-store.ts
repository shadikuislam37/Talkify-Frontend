import { create } from "zustand";

interface CallState {
  isCalling: boolean;
  incomingCall: { from: string; name: string; sdp: any; isVideo?: boolean } | null;
  callActive: boolean;
  targetUser: { id: string; name: string; image?: string } | null;
  isVideoCall: boolean; // 🌟 কলটি ভিডিও নাকি অডিও তা ট্র্যাক করবে
  setIncomingCall: (call: { from: string; name: string; sdp: any; isVideo?: boolean } | null) => void;
  startCall: (targetUser: { id: string; name: string; image?: string }, isVideo: boolean) => void; // 🌟 isVideo প্যারামিটার যুক্ত করা হয়েছে
  acceptCall: () => void;
  endCall: () => void;
}

export const useCallStore = create<CallState>((set) => ({
  isCalling: false,
  incomingCall: null,
  callActive: false,
  targetUser: null,
  isVideoCall: true,
  setIncomingCall: (call) => 
    set({ incomingCall: call, isVideoCall: call?.isVideo ?? true }),
  startCall: (targetUser, isVideo) => 
    set({ isCalling: true, targetUser, isVideoCall: isVideo }),
  acceptCall: () => 
    set({ callActive: true, incomingCall: null }),
  endCall: () => 
    set({ isCalling: false, incomingCall: null, callActive: false, targetUser: null, isVideoCall: true }),
}));