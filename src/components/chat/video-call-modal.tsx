"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { useCallStore } from "@/store/use-call-store";
import { Button } from "@/components/ui/button";
import { PhoneOff, PhoneCall, Mic, MicOff, Video, VideoOff, Volume2 } from "lucide-react";

interface VideoCallModalProps {
  socket: any;
  currentUserId: string;
}

const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    {
      urls: process.env.NEXT_PUBLIC_TURN_URL || "turn:global.metered.ca:80",
      username: process.env.NEXT_PUBLIC_TURN_USERNAME,
      credential: process.env.NEXT_PUBLIC_TURN_PASSWORD,
    },
  ],
};

export const VideoCallModal = ({ socket, currentUserId }: VideoCallModalProps) => {
  const { isCalling, incomingCall, callActive, targetUser, isVideoCall, setIncomingCall, acceptCall, endCall } =
    useCallStore();

  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  const myVideoRef = useRef<HTMLVideoElement | null>(null);
  const userVideoRef = useRef<HTMLVideoElement | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  // ১. মিডিয়া স্ট্রিম (অডিও কলের জন্য শুধু মাইক, ভিডিও কলের জন্য মাইক + ক্যামেরা)
  const startMediaStream = async (videoEnabled: boolean) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: videoEnabled,
        audio: true,
      });
      localStreamRef.current = stream;
      if (videoEnabled && myVideoRef.current) {
        myVideoRef.current.srcObject = stream;
      }
      return stream;
    } catch (err) {
      console.error("Error accessing media devices.", err);
      return null;
    }
  };

  // ২. পিয়ার কানেকশন সেটআপ
  const createPeerConnection = (targetUserId: string) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    peerConnectionRef.current = pc;

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    pc.ontrack = (event) => {
      if (userVideoRef.current) {
        userVideoRef.current.srcObject = event.streams[0];
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("ice_candidate", {
          targetUserId,
          candidate: event.candidate,
        });
      }
    };

    return pc;
  };

  // ৩. কল শুরু করা (সেন্ডার এন্ড)
  useEffect(() => {
    if (isCalling && targetUser) {
      (async () => {
        const stream = await startMediaStream(isVideoCall);
        if (!stream) return;

        const pc = createPeerConnection(targetUser.id);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        socket.emit("call_offer", {
          targetUserId: targetUser.id,
          name: "Caller",
          sdp: offer,
          isVideo: isVideoCall,
        });
      })();
    }
  }, [isCalling]);

  // ৪. সকেট লিসেনার
  useEffect(() => {
    if (!socket) return;

    socket.on("receive_call_answer", async (data: { from: string; sdp: any }) => {
      if (peerConnectionRef.current) {
        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.sdp));
        acceptCall();
      }
    });

    socket.on("receive_ice_candidate", async (data: { from: string; candidate: any }) => {
      if (peerConnectionRef.current && data.candidate) {
        try {
          await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (e) {
          console.error("Error adding ice candidate", e);
        }
      }
    });

    socket.on("receive_end_call", () => {
      handleCleanup();
    });

    return () => {
      socket.off("receive_call_answer");
      socket.off("receive_ice_candidate");
      socket.off("receive_end_call");
    };
  }, [socket]);

  // ৫. কল রিসিভ করা (রিসিভার এন্ড)
  const handleAccept = async () => {
    if (!incomingCall) return;

    const callTypeVideo = incomingCall.isVideo ?? true;
    const stream = await startMediaStream(callTypeVideo);
    if (!stream) return;

    const pc = createPeerConnection(incomingCall.from);
    await pc.setRemoteDescription(new RTCSessionDescription(incomingCall.sdp));

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    socket.emit("call_answer", {
      targetUserId: incomingCall.from,
      sdp: answer,
    });

    acceptCall();
  };

  // মিউট টগল করার ফাংশন
  const toggleMute = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  // ভিডিও টগল করার ফাংশন
  const toggleVideo = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsVideoOff(!isVideoOff);
    }
  };

  const handleCleanup = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    endCall();
  };

  const handleEndCall = () => {
    const targetId = targetUser?.id || incomingCall?.from;
    if (targetId && socket) {
      socket.emit("end_call", { targetUserId: targetId });
    }
    handleCleanup();
  };

  if (!isCalling && !incomingCall && !callActive) return null;

  const activeCallTypeVideo = callActive ? isVideoCall : (incomingCall?.isVideo ?? true);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex flex-col items-center justify-center p-4">
      {/* ইনকামিং কল পপআপ */}
      {incomingCall && !callActive && (
        <div className="bg-background border rounded-2xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl animate-in fade-in zoom-in">
          <div className="relative w-20 h-20 mx-auto rounded-full overflow-hidden border-2 border-primary flex items-center justify-center bg-muted">
            <Volume2 className="h-8 w-8 text-primary animate-bounce" />
          </div>
          <div>
            <h3 className="font-bold text-lg">{incomingCall.name}</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Incoming {incomingCall.isVideo ? "Video" : "Audio"} Call...
            </p>
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

      {/* অ্যাক্টিভ কল স্ক্রিন (অডিও বা ভিডিও) */}
      {(isCalling || callActive) && !incomingCall && (
        <div className="relative w-full max-w-4xl h-[80vh] bg-muted/20 rounded-2xl overflow-hidden border flex flex-col items-center justify-center shadow-2xl">
          
          {activeCallTypeVideo ? (
            // ভিডিও কল UI
            <div className="relative w-full h-full flex items-center justify-center bg-black">
              <video ref={userVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
              
              {!callActive && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/90 space-y-3">
                  <p className="font-medium text-lg animate-pulse">Calling {targetUser?.name}...</p>
                </div>
              )}

              {/* নিজের ছোট ভিডিও প্রিভিউ */}
              <div className="absolute bottom-24 right-4 w-32 h-44 bg-zinc-900 rounded-xl overflow-hidden border-2 border-background shadow-lg">
                <video ref={myVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              </div>
            </div>
          ) : (
            // অডিও কল UI (সুন্দর অ্যাভাতার সহ)
            <div className="relative w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-zinc-900 to-black space-y-4">
              <div className="relative w-28 h-28 rounded-full overflow-hidden border-4 border-primary/40 animate-pulse bg-muted flex items-center justify-center">
                <span className="text-3xl font-bold text-primary">
                  {targetUser?.name ? targetUser.name.slice(0, 2).toUpperCase() : "AC"}
                </span>
              </div>
              <div className="text-center">
                <h3 className="text-xl font-bold text-white">{targetUser?.name || "User"}</h3>
                <p className="text-sm text-zinc-400 mt-1">
                  {callActive ? "Ongoing Audio Call..." : "Calling..."}
                </p>
              </div>
              {/* রিমোট অডিও চালানোর জন্য হিডেন বা সাইলেন্ট অডিও এলিমেন্ট */}
              <audio ref={userVideoRef as any} autoPlay playsInline />
            </div>
          )}

          {/* কন্ট্রোল বাটনস (Mute, Video Toggle, End Call) */}
          <div className="absolute bottom-6 flex items-center gap-4 bg-background/80 backdrop-blur-md px-6 py-3 rounded-full border shadow-lg z-10">
            <Button
              variant={isMuted ? "destructive" : "outline"}
              size="icon"
              className="rounded-full h-11 w-11"
              onClick={toggleMute}
              title={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </Button>

            {activeCallTypeVideo && (
              <Button
                variant={isVideoOff ? "destructive" : "outline"}
                size="icon"
                className="rounded-full h-11 w-11"
                onClick={toggleVideo}
                title={isVideoOff ? "Turn Video On" : "Turn Video Off"}
              >
                {isVideoOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
              </Button>
            )}

            <Button
              variant="destructive"
              size="icon"
              className="rounded-full h-12 w-12 bg-red-600 hover:bg-red-700"
              onClick={handleEndCall}
              title="End Call"
            >
              <PhoneOff className="h-6 w-6" />
            </Button>
          </div>

        </div>
      )}
    </div>
  );
};