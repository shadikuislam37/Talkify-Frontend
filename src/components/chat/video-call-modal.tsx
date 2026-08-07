"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
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
    { urls: "stun:stun.relay.metered.ca:80" },
    {
      urls: "turn:global.relay.metered.ca:80",
      username: process.env.NEXT_PUBLIC_TURN_USERNAME,
      credential: process.env.NEXT_PUBLIC_TURN_PASSWORD,
    },
    {
      urls: "turns:global.relay.metered.ca:443?transport=tcp",
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
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  const handleCleanup = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    endCall();
  }, [endCall]);

  const startMediaStream = async (videoEnabled: boolean) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: videoEnabled,
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      localStreamRef.current = stream;
      if (myVideoRef.current) {
        myVideoRef.current.srcObject = stream;
        myVideoRef.current.play().catch((e) => console.error("Local video play error:", e));
      }
      return stream;
    } catch (err) {
      console.error("Error accessing media devices:", err);
      return null;
    }
  };

  useEffect(() => {
    if (myVideoRef.current && localStreamRef.current) {
      myVideoRef.current.srcObject = localStreamRef.current;
      myVideoRef.current.play().catch((e) => console.error("Local video effect play error:", e));
    }
  }, [callActive, isCalling, isVideoOff]);

  const createPeerConnection = (targetUserId: string) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    peerConnectionRef.current = pc;

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    // 🌟 রিসিভার ও কলার উভয়ের জন্যই রিমোট সাউন্ড এবং ভিডিও প্লে নিশ্চিত করা
    pc.ontrack = (event) => {
      const remoteStream = event.streams[0];
      
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = remoteStream;
        remoteAudioRef.current.play().catch((e) => console.error("Remote Audio play error:", e));
      }

      if (userVideoRef.current) {
        userVideoRef.current.srcObject = remoteStream;
        userVideoRef.current.play().catch((e) => console.error("Remote Video play error:", e));
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("ice_candidate", {
          targetUserId,
          from: currentUserId,
          candidate: event.candidate,
        });
      }
    };

    return pc;
  };

  // কলার সাইড থেকে অফার পাঠানো
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
          from: currentUserId,
          name: targetUser.name || "Caller",
          image: targetUser.image || "",
          sdp: offer,
          isVideo: isVideoCall,
        });
      })();
    }
  }, [isCalling, isVideoCall, targetUser, socket, currentUserId]);

  // সকেট ইভেন্ট লিসენার
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
  }, [socket, handleCleanup, acceptCall]);

  // 🌟 রিসিভার যখন কল রিসিভ বা অ্যাক্সেপ্ট করবে
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
      from: currentUserId,
      sdp: answer,
    });

    acceptCall();
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsVideoOff(!isVideoOff);
    }
  };

  const handleEndCall = () => {
    const targetId = targetUser?.id || incomingCall?.from;
    if (targetId && socket) {
      socket.emit("end_call", { targetUserId: targetId, from: currentUserId });
    }
    handleCleanup();
  };

  if (!isCalling && !incomingCall && !callActive) return null;

  const activeCallTypeVideo = callActive ? isVideoCall : (incomingCall?.isVideo ?? true);
  
  // 🌟 ফিক্স: কলার বা রিসিভার উভয়ের জন্যই সঠিক নাম ও ছবি ম্যাপ করা হলো যাতে "AC" বা "User" না দেখায়
  const activeUser = targetUser?.name ? targetUser : (incomingCall ? { id: incomingCall.from, name: incomingCall.name || "User", image: incomingCall.image } : null);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex flex-col items-center justify-center p-4">
      {incomingCall && !callActive && (
        <div className="bg-background border rounded-2xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl animate-in fade-in zoom-in">
          <div className="relative w-20 h-20 mx-auto rounded-full overflow-hidden border-2 border-primary flex items-center justify-center bg-muted">
            {incomingCall.image ? (
              <Image src={incomingCall.image} alt={incomingCall.name || "Caller"} fill className="object-cover" unoptimized />
            ) : (
              <Volume2 className="h-8 w-8 text-primary animate-bounce" />
            )}
          </div>
          <div>
            <h3 className="font-bold text-lg">{incomingCall.name || "User"}</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Incoming {incomingCall.isVideo ? "Video" : "Audio"} Call...
            </p>
          </div>
          <div className="flex justify-center gap-4 pt-2">
            <Button variant="destructive" size="icon" className="rounded-full h-12 w-12 cursor-pointer" onClick={handleEndCall}>
              <PhoneOff className="h-5 w-5" />
            </Button>
            <Button variant="default" size="icon" className="rounded-full h-12 w-12 bg-green-600 hover:bg-green-700 cursor-pointer" onClick={handleAccept}>
              <PhoneCall className="h-5 w-5" />
            </Button>
          </div>
        </div>
      )}

      {(isCalling || callActive) && !incomingCall && (
        <div className="relative w-full max-w-4xl h-[80vh] bg-muted/20 rounded-2xl overflow-hidden border flex flex-col items-center justify-center shadow-2xl">
          
          <audio ref={remoteAudioRef} autoPlay playsInline />

          {activeCallTypeVideo ? (
            <div className="relative w-full h-full flex items-center justify-center bg-black">
              <video ref={userVideoRef} autoPlay playsInline className={`w-full h-full object-cover ${isVideoOff && callActive ? "hidden" : ""}`} />

              {(!callActive || isVideoOff) && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950 z-10 space-y-3">
                  <div className="relative w-28 h-28 rounded-full overflow-hidden border-4 border-primary/40 bg-muted flex items-center justify-center shadow-2xl">
                    {activeUser?.image ? (
                      <Image src={activeUser.image} alt={activeUser.name || "User"} fill className="object-cover" unoptimized />
                    ) : (
                      <span className="text-3xl font-bold text-primary">
                        {activeUser?.name ? activeUser.name.slice(0, 2).toUpperCase() : "U"}
                      </span>
                    )}
                  </div>
                  <h3 className="text-xl font-bold text-white">{activeUser?.name || "User"}</h3>
                  <p className="text-xs text-zinc-400 animate-pulse">
                    {!callActive ? "Calling..." : "Camera is turned off"}
                  </p>
                </div>
              )}

              <div className="absolute bottom-24 right-4 w-32 h-44 bg-zinc-900 rounded-xl overflow-hidden border-2 border-background shadow-lg z-20 flex items-center justify-center">
                {isVideoOff ? (
                  <div className="flex flex-col items-center justify-center text-center p-2">
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-sm font-bold text-primary">
                      You
                    </div>
                    <span className="text-[10px] text-zinc-400 mt-1">Camera Off</span>
                  </div>
                ) : (
                  <video ref={myVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                )}
              </div>
            </div>
          ) : (
            <div className="relative w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-zinc-900 to-black space-y-4">
              <div className="relative w-28 h-28 rounded-full overflow-hidden border-4 border-primary/40 animate-pulse bg-muted flex items-center justify-center shadow-2xl">
                {activeUser?.image ? (
                  <Image src={activeUser.image} alt={activeUser.name || "User"} fill className="object-cover" unoptimized />
                ) : (
                  <span className="text-3xl font-bold text-primary">
                    {activeUser?.name ? activeUser.name.slice(0, 2).toUpperCase() : "AC"}
                  </span>
                )}
              </div>
              <div className="text-center">
                <h3 className="text-xl font-bold text-white">{activeUser?.name || "User"}</h3>
                <p className="text-sm text-zinc-400 mt-1">
                  {callActive ? "Ongoing Audio Call..." : "Calling..."}
                </p>
              </div>
            </div>
          )}

          <div className="absolute bottom-6 flex items-center gap-4 bg-background/80 backdrop-blur-md px-6 py-3 rounded-full border shadow-lg z-30">
            <Button
              variant={isMuted ? "destructive" : "outline"}
              size="icon"
              className="rounded-full h-11 w-11 cursor-pointer"
              onClick={toggleMute}
              title={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </Button>

            {activeCallTypeVideo && (
              <Button
                variant={isVideoOff ? "destructive" : "outline"}
                size="icon"
                className="rounded-full h-11 w-11 cursor-pointer"
                onClick={toggleVideo}
                title={isVideoOff ? "Turn Video On" : "Turn Video Off"}
              >
                {isVideoOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
              </Button>
            )}

            <Button
              variant="destructive"
              size="icon"
              className="rounded-full h-12 w-12 bg-red-600 hover:bg-red-700 cursor-pointer"
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