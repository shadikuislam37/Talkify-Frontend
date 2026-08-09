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

  // 🌟 FIX #2-এর অংশ: remote stream state-এ রাখা হচ্ছে।
  // আগে ontrack সরাসরি ref-এ srcObject বসাতো — কিন্তু ওই মুহূর্তে <audio>/<video>
  // element DOM-এ mount না থাকলে ref null, আর stream চিরতরে হারিয়ে যেত।
  // state-এ রাখলে element mount হওয়ার পর useEffect দিয়ে attach করা যায়।
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  const myVideoRef = useRef<HTMLVideoElement | null>(null);
  const userVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  // 🌟 FIX #1: ICE candidate buffer।
  // Caller offer পাঠানোর সাথে সাথেই ICE candidate generate করতে শুরু করে, কিন্তু
  // receiver-এর peerConnection তৈরি হয় শুধু Accept চাপার পর। মাঝের এই কয়েক
  // সেকেন্ডে আসা সব candidate আগে চুপচাপ drop হয়ে যেত (pc null ছিল), ফলে
  // connection কখনো establish হতো না — ring হতো, sound আসতো না।
  // এখন pc তৈরি না হওয়া পর্যন্ত (বা remoteDescription বসার আগে) candidate গুলো
  // এখানে জমা থাকে, তারপর একসাথে flush হয়।
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);

  // একই call-এ দুইবার offer তৈরি ঠেকানোর গার্ড (useEffect re-run হলে)
  const offerSentRef = useRef(false);

  const handleCleanup = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    pendingCandidatesRef.current = [];
    offerSentRef.current = false;
    setRemoteStream(null);
    setIsMuted(false);
    setIsVideoOff(false);
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

  // 🌟 FIX #2: remote stream attach করা হয় element mount হওয়ার পর।
  // audio element এখন সবসময় render হয় (নিচে দেখো), তাই callActive হওয়ার সাথে
  // সাথেই এখানে attach হয়ে যায় — caller আর receiver দুজনের জন্যই।
  useEffect(() => {
    if (!remoteStream) return;

    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = remoteStream;
      remoteAudioRef.current
        .play()
        .catch((e) => console.error("Remote audio play error:", e));
    }

    if (userVideoRef.current) {
      userVideoRef.current.srcObject = remoteStream;
      userVideoRef.current
        .play()
        .catch((e) => console.error("Remote video play error:", e));
    }
  }, [remoteStream, callActive, isVideoOff, incomingCall]);

  // buffer-এ জমা candidate গুলো remoteDescription বসার পর একসাথে যোগ করা
  const flushPendingCandidates = async () => {
    const pc = peerConnectionRef.current;
    if (!pc || !pc.remoteDescription) return;

    const queued = pendingCandidatesRef.current;
    pendingCandidatesRef.current = [];

    for (const candidate of queued) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (e) {
        console.error("Error adding buffered ice candidate", e);
      }
    }
  };

  const createPeerConnection = (targetUserId: string) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    peerConnectionRef.current = pc;

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    // 🌟 রিসিভার ও কলার উভয়ের জন্যই রিমোট stream state-এ রাখা হচ্ছে (attach উপরের useEffect-এ)
    pc.ontrack = (event) => {
      setRemoteStream(event.streams[0]);
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

    // 🌟 DEBUG: connection আসলে establish হচ্ছে কিনা দেখার সবচেয়ে সহজ উপায়।
    // "failed" দেখালে বুঝতে হবে TURN credential কাজ করছে না (relay path নেই)।
    pc.oniceconnectionstatechange = () => {
      console.log("ICE STATE:", pc.iceConnectionState);
      if (pc.iceConnectionState === "failed") {
        console.error("❌ ICE failed — TURN server / credential চেক করো");
      }
    };

    return pc;
  };

  // কলার সাইড থেকে অফার পাঠানো
  useEffect(() => {
    if (!isCalling || !targetUser || offerSentRef.current) return;

    offerSentRef.current = true;

    (async () => {
      const stream = await startMediaStream(isVideoCall);
      if (!stream) {
        offerSentRef.current = false;
        return;
      }

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
  }, [isCalling, isVideoCall, targetUser, socket, currentUserId]);

  // সকেট ইভেন্ট লিসেনার
  useEffect(() => {
    if (!socket) return;

    const handleCallAnswer = async (data: { from: string; sdp: any }) => {
      const pc = peerConnectionRef.current;
      if (!pc) return;

      await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
      await flushPendingCandidates();
      acceptCall();
    };

    const handleIceCandidate = async (data: { from: string; candidate: any }) => {
      if (!data.candidate) return;

      const pc = peerConnectionRef.current;

      // 🌟 FIX #1: pc নেই (receiver এখনো accept করেনি) বা remoteDescription
      // এখনো বসেনি — দুই ক্ষেত্রেই addIceCandidate ব্যর্থ হয়। তাই drop না করে
      // buffer-এ রাখা হচ্ছে, পরে flush হবে।
      if (!pc || !pc.remoteDescription) {
        pendingCandidatesRef.current.push(data.candidate);
        return;
      }

      try {
        await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
      } catch (e) {
        console.error("Error adding ice candidate", e);
      }
    };

    const handleEndCallEvent = () => {
      handleCleanup();
    };

    socket.on("receive_call_answer", handleCallAnswer);
    socket.on("receive_ice_candidate", handleIceCandidate);
    socket.on("receive_end_call", handleEndCallEvent);

    return () => {
      // 🌟 FIX: আগে socket.off("receive_ice_candidate") handler ছাড়া কল করা হতো,
      // যা ওই event-এর সব listener মুছে দেয় — useSocket.ts-এ registered
      // listener গুলোও। এখন নির্দিষ্ট handler reference দিয়ে remove করা হচ্ছে।
      socket.off("receive_call_answer", handleCallAnswer);
      socket.off("receive_ice_candidate", handleIceCandidate);
      socket.off("receive_end_call", handleEndCallEvent);
    };
  }, [socket, handleCleanup, acceptCall]);

  // 🌟 রিসিভার যখন কল রিসিভ বা অ্যাক্সেপ্ট করবে
  const handleAccept = async () => {
    if (!incomingCall) return;

    const callTypeVideo = incomingCall.isVideo ?? true;

    // 🔍 TEMPORARY DEBUG — কোন error-এ getUserMedia fail করছে সেটা দেখার জন্য
    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: callTypeVideo,
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      localStreamRef.current = stream;
      if (myVideoRef.current) {
        myVideoRef.current.srcObject = stream;
        myVideoRef.current.play().catch(() => {});
      }
    } catch (err: any) {
      alert(`MIC ERROR: ${err?.name} — ${err?.message}`);
      return;
    }

    const pc = createPeerConnection(incomingCall.from);
    await pc.setRemoteDescription(new RTCSessionDescription(incomingCall.sdp));

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    socket.emit("call_answer", {
      targetUserId: incomingCall.from,
      from: currentUserId,
      sdp: answer,
    });

    await flushPendingCandidates();

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

  // 🌟 FIX #3: receiver-এর জন্য call type ও ringing state আলাদা করা।
  // isRinging = incoming call এসেছে কিন্তু এখনো accept করা হয়নি।
  const isRinging = !!incomingCall && !callActive;
  const activeCallTypeVideo = incomingCall ? (incomingCall.isVideo ?? true) : isVideoCall;

  // 🌟 ফিক্স: কলার বা রিসিভার উভয়ের জন্যই সঠিক নাম ও ছবি ম্যাপ করা হলো যাতে "AC" বা "User" না দেখায়
  const activeUser = targetUser?.name
    ? targetUser
    : incomingCall
    ? { id: incomingCall.from, name: incomingCall.name || "User", image: incomingCall.image }
    : null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex flex-col items-center justify-center p-4">
      {/*
        🌟 FIX #2: audio element এখন সবসময় render হয়, শর্তের বাইরে।
        আগে এটা `(isCalling || callActive) && !incomingCall` ব্লকের ভেতরে ছিল —
        অর্থাৎ receiver-এর ক্ষেত্রে (যার incomingCall সেট থাকে) এই element
        কখনো DOM-এ আসতো না, remoteAudioRef চিরকাল null থাকতো, আর remote
        audio কোথাও attach হতো না। এটাই ছিল "call connect হয় কিন্তু sound নেই"
        এর সবচেয়ে সরাসরি কারণ।
      */}
      <audio ref={remoteAudioRef} autoPlay playsInline />

      {isRinging && (
        <div className="bg-background border rounded-2xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl animate-in fade-in zoom-in">
          <div className="relative w-20 h-20 mx-auto rounded-full overflow-hidden border-2 border-primary flex items-center justify-center bg-muted">
            {incomingCall?.image ? (
              <Image src={incomingCall.image} alt={incomingCall.name || "Caller"} fill className="object-cover" unoptimized />
            ) : (
              <Volume2 className="h-8 w-8 text-primary animate-bounce" />
            )}
          </div>
          <div>
            <h3 className="font-bold text-lg">{incomingCall?.name || "User"}</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Incoming {incomingCall?.isVideo ? "Video" : "Audio"} Call...
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

      {/*
        🌟 FIX #3: শর্ত থেকে `!incomingCall` সরানো হলো।
        আগে receiver accept করার পর callActive=true হতো কিন্তু incomingCall
        store-এ থেকেই যেত — ফলে ringing UI-ও হাইড হতো, আর এই main UI-ও render
        হতো না। receiver শুধু কালো স্ক্রিন দেখতো, কোনো control বা video ছিল না।
        এখন isRinging দিয়ে দুটো state আলাদা করা হয়েছে।
      */}
      {(isCalling || callActive) && !isRinging && (
        <div className="relative w-full max-w-4xl h-[80vh] bg-muted/20 rounded-2xl overflow-hidden border flex flex-col items-center justify-center shadow-2xl">

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
