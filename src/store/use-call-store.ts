import { create } from "zustand";

interface CallState {
  isCalling: boolean;
  incomingCall: { from: string; name: string; sdp: any; isVideo?: boolean; image?: string } | null;
  callActive: boolean;
  targetUser: { id: string; name: string; image?: string } | null;
  isVideoCall: boolean; 
  setIncomingCall: (call: { from: string; name: string; sdp: any; isVideo?: boolean; image?: string } | null) => void;
  startCall: (targetUser: { id: string; name: string; image?: string }, isVideo: boolean) => void; 
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
    set((state) => ({
      callActive: true,
      incomingCall: null,
      targetUser:
        state.targetUser ??
        (state.incomingCall
          ? {
              id: state.incomingCall.from,
              name: state.incomingCall.name,
              image: state.incomingCall.image,
            }
          : null),
    })),
  endCall: () => 
    set({ isCalling: false, incomingCall: null, callActive: false, targetUser: null, isVideoCall: true }),
}));