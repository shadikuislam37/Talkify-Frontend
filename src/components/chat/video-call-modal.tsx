"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useCallStore } from "@/store/use-call-store";
import { Button } from "@/components/ui/button";
import { PhoneOff, PhoneCall, Mic, MicOff } from "lucide-react";

interface VideoCallModalProps {
  socket: any;
  currentUserId: string;
}

export const VideoCallModal = ({ socket, currentUserId }: VideoCallModalProps) => {
  const { isCalling, incomingCall, callActive, targetUser, setIncomingCall, acceptCall, endCall } =
    useCallStore();

  const [isMuted, setIsMuted] = useState(false);
  const myVideoRef = useRef<HTMLVideoElement | null>(null);
  const userVideoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (!socket) return;

    socket.on("receive_call_offer", (data: any) => {
      setIncomingCall(data);
    });

    socket.on("receive_end_call", () => {
      endCall();
    });

    return () => {
      socket.off("receive_call_offer");
      socket.off("receive_end_call");
    };
  }, [socket, setIncomingCall, endCall]);

  const handleAccept = () => {
    acceptCall();
    socket.emit("call_answer", {
      targetUserId: incomingCall?.from,
      sdp: "accepted_sdp_signal",
    });
  };

  const handleEndCall = () => {
    const targetId = targetUser?.id || incomingCall?.from;
    if (targetId) {
      socket.emit("end_call", { targetUserId: targetId });
    }
    endCall();
  };

  if (!isCalling && !incomingCall && !callActive) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex flex-col items-center justify-center p-4">
      {/* Incoming Call Dialog */}
      {incomingCall && !callActive && (
        <div className="bg-background border rounded-lg p-6 max-w-sm w-full text-center space-y-4 shadow-xl animate-in fade-in zoom-in">
          <div className="relative w-20 h-20 mx-auto rounded-full overflow-hidden border-2 border-primary">
            <Image
              src="/avatar-placeholder.png"
              alt={incomingCall.name || "Caller"}
              fill
              className="object-cover"
            />
          </div>
          <div>
            <h3 className="font-semibold text-lg">{incomingCall.name}</h3>
            <p className="text-sm text-muted-foreground">Incoming Video Call...</p>
          </div>
          <div className="flex justify-center gap-4 pt-2">
            <Button variant="destructive" size="icon" className="rounded-full h-12 w-12" onClick={handleEndCall}>
              <PhoneOff className="h-5 w-5" />
            </Button>
            <Button variant="default" size="icon" className="rounded-full h-12 w-12 bg-green-600 hover:bg-green-700" onClick={handleAccept}>
              <PhoneCall className="h-5 w-5" />
            </Button>
          </div>
        </div>
      )}

      {/* Active Call UI */}
      {(isCalling || callActive) && !incomingCall && (
        <div className="relative w-full max-w-4xl h-[80vh] bg-muted/20 rounded-xl overflow-hidden border flex flex-col items-center justify-center">
          <div className="relative w-full h-full flex items-center justify-center">
            <video ref={userVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
            {!callActive && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/90 space-y-3">
                <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-primary">
                  <Image
                    src={targetUser?.image || "/avatar-placeholder.png"}
                    alt={targetUser?.name || "User"}
                    fill
                    className="object-cover"
                  />
                </div>
                <p className="font-medium text-lg">Calling {targetUser?.name}...</p>
              </div>
            )}
          </div>

          <div className="absolute bottom-20 right-4 w-36 h-48 bg-black rounded-lg overflow-hidden border-2 border-background shadow-lg">
            <video ref={myVideoRef} autoPlay playsInline mutedclassName="w-full h-full object-cover" />
          </div>

          <div className="absolute bottom-4 flex items-center gap-4 bg-background/80 backdrop-blur px-6 py-3 rounded-full border">
            <Button 
              variant={isMuted ? "destructive" : "outline"} 
              size="icon" 
              className="rounded-full"
              onClick={() => setIsMuted(!isMuted)}
            >
              {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>
            <Button variant="destructive" size="icon" className="rounded-full h-12 w-12" onClick={handleEndCall}>
              <PhoneOff className="h-5 w-5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};