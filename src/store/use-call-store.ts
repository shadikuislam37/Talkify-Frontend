import { CallState } from "@/types";
import { create } from "zustand";



export const useCallStore = create<CallState>((set) => ({
  isCalling: false,
  incomingCall: null,
  callActive: false,
  targetUser: null,
  setIncomingCall: (call) => set({ incomingCall: call }),
  startCall: (targetUser) => set({ isCalling: true, targetUser }),
  acceptCall: () => set({ callActive: true, incomingCall: null }),
  endCall: () => set({ isCalling: false, incomingCall: null, callActive: false, targetUser: null }),
}));