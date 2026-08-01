import { describe, it, expect, beforeEach } from "vitest";
import { create } from "zustand";

interface CallStateTest {
  isCalling: boolean;
  incomingCall: any;
  callActive: boolean;
  targetUser: { id: string; name: string } | null;
  setIncomingCall: (call: any) => void;
  startCall: (user: { id: string; name: string }) => void;
  acceptCall: () => void;
  endCall: () => void;
}

const useTestCallStore = create<CallStateTest>((set) => ({
  isCalling: false,
  incomingCall: null,
  callActive: false,
  targetUser: null,
  setIncomingCall: (call) => set({ incomingCall: call }),
  startCall: (targetUser) => set({ isCalling: true, targetUser }),
  acceptCall: () => set({ callActive: true, incomingCall: null }),
  endCall: () => set({ isCalling: false, incomingCall: null, callActive: false, targetUser: null }),
}));

describe("Zustand Call Store - Comprehensive Tests", () => {
  beforeEach(() => {
    useTestCallStore.setState({
      isCalling: false,
      incomingCall: null,
      callActive: false,
      targetUser: null,
    });
  });

  it("should update state when startCall and endCall are invoked", () => {
    const store = useTestCallStore.getState();
    
    expect(store.callActive).toBe(false);
    expect(store.isCalling).toBe(false);

    store.startCall({ id: "u-2", name: "John Doe" });
    expect(useTestCallStore.getState().isCalling).toBe(true);
    expect(useTestCallStore.getState().targetUser?.name).toBe("John Doe");

    store.endCall();
    expect(useTestCallStore.getState().isCalling).toBe(false);
    expect(useTestCallStore.getState().targetUser).toBeNull();
  });

  // 🌟 নতুন টেস্ট: ইনকামিং কল পাওয়া এবং তা রিসিভ (accept) করা
  it("should handle incoming call and accept it successfully", () => {
    const store = useTestCallStore.getState();

    // ১. অপর ইউজার থেকে ইনকামিং কল আসলো বলে সেট করা
    const mockIncomingCall = {
      from: "user-999",
      name: "Jane Smith",
      sdp: { type: "offer", sdp: "mock-sdp-data" },
      isVideo: true,
    };

    store.setIncomingCall(mockIncomingCall);

    // যাচাই করি ইনকামিং কল স্টেটে সেট হয়েছে কি না
    expect(useTestCallStore.getState().incomingCall).not.toBeNull();
    expect(useTestCallStore.getState().incomingCall?.name).toBe("Jane Smith");
    expect(useTestCallStore.getState().callActive).toBe(false);

    // ২. কল রিসিভ করি (Accept Call)
    store.acceptCall();

    const updatedStore = useTestCallStore.getState();
    // যাচাই করি কল অ্যাক্টিভ হয়েছে এবং ইনকামিং কল রিমুভ হয়ে গেছে কি না
    expect(updatedStore.callActive).toBe(true);
    expect(updatedStore.incomingCall).toBeNull();
  });
});