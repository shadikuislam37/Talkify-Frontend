"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { useCallStore } from "@/store/use-call-store";
import { Button } from "@/components/ui/button";
import { PhoneOff, PhoneCall, Mic, MicOff, Video, VideoOff, Volume2, VolumeX } from "lucide-react";
import { toast } from "sonner";

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
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  // 🌟 FIX #1-এর অংশ: browser autoplay policy-র কারণে remote audio play() reject
  // হলে এই flag true হয় আর UI-তে "Tap to enable sound" বাটন দেখায়।
  const [needsAudioTap, setNeedsAudioTap] = useState(false);

  const myVideoRef = useRef<HTMLVideoElement | null>(null);
  const userVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const offerSentRef = useRef(false);
  const audioUnlockedRef = useRef(false);

  // 🌟 FIX #2: remote peer-এর id আলাদা ref-এ রাখা।
  // আগে end_call পাঠাতে `targetUser?.id || incomingCall?.from` ব্যবহার হতো —
  // কিন্তু receiver-এর targetUser থাকে না, আর accept করার পর store থেকে
  // incomingCall clear হয়ে গেলে দুটোই undefined হয়ে যেত। ফলে এক দিক থেকে কল
  // কাটলে emit-ই হতো না, উল্টো দিকে কল চলতেই থাকতো (one-sided hangup)।
  // এই ref কল শুরুর মুহূর্তে একবার সেট হয়, cleanup পর্যন্ত টিকে থাকে।
  const remotePeerIdRef = useRef<string | null>(null);

  // ==========================================================================
  // 🔊 AUDIO UNLOCK — mobile-এ এক দিকের sound না আসার আসল কারণ
  // ==========================================================================
  // Chrome/Safari mobile-এ user gesture ছাড়া audio play() করা যায় না।
  // কল শুরুর সময় ইউজার বাটনে ক্লিক করে, কিন্তু remote stream আসে তার কয়েক
  // সেকেন্ড পরে — ততক্ষণে gesture context শেষ, play() reject হয়, আর ওই পাশের
  // ইউজার কিছুই শুনতে পায় না (উল্টো দিকে ঠিকই শোনা যায়, তাই one-way মনে হয়)।
  // সমাধান: gesture-এর ভেতরেই খালি audio element একবার muted play করে "unlock"
  // করে রাখা — তারপর stream attach হলে নিজে থেকেই বাজবে।
  const unlockAudio = useCallback(() => {
    const el = remoteAudioRef.current;
    if (!el || audioUnlockedRef.current) return;

    el.muted = true;
    el.play()
      .then(() => {
        el.muted = false;
        audioUnlockedRef.current = true;
        setNeedsAudioTap(false);
      })
      .catch(() => {
        // unlock করা গেল না — UI-তে tap বাটন দেখানো হবে
      });
  }, []);

  // যেকোনো tap/click-এ unlock করার চেষ্টা (সবচেয়ে নির্ভরযোগ্য fallback)
  useEffect(() => {
    const handler = () => unlockAudio();
    document.addEventListener("pointerdown", handler);
    document.addEventListener("touchend", handler);
    return () => {
      document.removeEventListener("pointerdown", handler);
      document.removeEventListener("touchend", handler);
    };
  }, [unlockAudio]);

  // ==========================================================================
  // 🔔 RINGTONE — Web Audio API দিয়ে, কোনো audio ফাইল লাগে না
  // ==========================================================================
  const ringCtxRef = useRef<AudioContext | null>(null);
  const ringTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopRingtone = useCallback(() => {
    if (ringTimerRef.current) {
      clearInterval(ringTimerRef.current);
      ringTimerRef.current = null;
    }
    if (ringCtxRef.current) {
      ringCtxRef.current.close().catch(() => {});
      ringCtxRef.current = null;
    }
  }, []);

  const startRingtone = useCallback(() => {
    if (ringTimerRef.current) return;
    try {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new Ctx();
      ringCtxRef.current = ctx;

      const beep = () => {
        if (!ringCtxRef.current) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = 480;
        gain.gain.setValueAtTime(0.001, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.85);
      };

      beep();
      ringTimerRef.current = setInterval(beep, 2000);
    } catch {
      // AudioContext block করা থাকলে চুপচাপ skip
    }
  }, []);

  // ==========================================================================

  const handleCleanup = useCallback(() => {
    stopRingtone();

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
    remotePeerIdRef.current = null;
    setRemoteStream(null);
    setNeedsAudioTap(false);
    setIsMuted(false);
    setIsVideoOff(false);
    setIncomingCall(null);
    endCall();
  }, [endCall, setIncomingCall, stopRingtone]);

  const startMediaStream = async (videoEnabled: boolean) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: videoEnabled,
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      localStreamRef.current = stream;
      if (myVideoRef.current) {
        myVideoRef.current.srcObject = stream;
        myVideoRef.current.play().catch(() => {});
      }
      return stream;
    } catch (err: any) {
      // 🌟 FIX: আগে error চুপচাপ গিলে ফেলা হতো — ইউজারের মনে হতো বাটন কাজ করছে না।
      if (err?.name === "NotAllowedError") {
        toast.error("Microphone permission denied. Browser settings theke allow koro.");
      } else if (err?.name === "NotReadableError") {
        toast.error("Mic onno app use korche. Sheta bondho kore abar try koro.");
      } else if (err?.name === "NotFoundError") {
        toast.error("Mic/camera pawa jacche na.");
      } else {
        toast.error("Call shuru kora gelo na. Mic/camera access check koro.");
      }
      console.error("getUserMedia error:", err);
      return null;
    }
  };

  useEffect(() => {
    if (myVideoRef.current && localStreamRef.current) {
      myVideoRef.current.srcObject = localStreamRef.current;
      myVideoRef.current.play().catch(() => {});
    }
  }, [callActive, isCalling, isVideoOff]);

  // remote stream attach — element mount হওয়ার পর
  useEffect(() => {
    if (!remoteStream) return;

    if (remoteAudioRef.current) {
      const el = remoteAudioRef.current;
      el.srcObject = remoteStream;
      el.muted = false;
      el.play()
        .then(() => setNeedsAudioTap(false))
        .catch((e) => {
          console.error("Remote audio play blocked:", e);
          setNeedsAudioTap(true); // UI-তে tap বাটন দেখাও
        });
    }

    if (userVideoRef.current) {
      userVideoRef.current.srcObject = remoteStream;
      userVideoRef.current.play().catch(() => {});
    }
  }, [remoteStream, callActive, isVideoOff, incomingCall]);

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
    remotePeerIdRef.current = targetUserId;

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

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

    pc.oniceconnectionstatechange = () => {
      console.log("ICE STATE:", pc.iceConnectionState);
      if (pc.iceConnectionState === "failed") {
        console.error("❌ ICE failed — TURN credential চেক করো");
        toast.error("Connection establish kora gelo na (network issue).");
      }
    };

    return pc;
  };

  // ==========================================================================
  // 🌟 FIX #3: incoming call এখন এই component নিজেই শোনে
  // ==========================================================================
  // আগে receive_call_offer শুধু useSocket.ts-এ ধরা হতো, আর useSocket চলে
  // chat page-এ। তাই ইউজার অন্য route-এ থাকলে incoming call কোথাও দেখাতো না —
  // "website-এ (chat page-এ) থাকলেই কল দেখা যায়" সমস্যাটা এখান থেকেই।
  // এই listener modal-এর ভেতরে থাকায় modal-টা root layout-এ mount করলে
  // অ্যাপের যেকোনো page থেকে কল ধরা যাবে।
  useEffect(() => {
    if (!socket) return;

    const handleCallOffer = (data: {
      from: string;
      name: string;
      image?: string;
      sdp: any;
      isVideo?: boolean;
    }) => {
      // ইতিমধ্যে কলে থাকলে নতুন কল ignore (busy signal)
      if (callActive || isCalling || incomingCall) {
        socket.emit("end_call", { targetUserId: data.from, from: currentUserId });
        return;
      }

      setIncomingCall(data as any);
      startRingtone();

      // ট্যাব background-এ থাকলে system notification
      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        try {
          new Notification(`${data.name || "Someone"} is calling`, {
            body: data.isVideo ? "Incoming video call" : "Incoming audio call",
            tag: "incoming-call",
          });
        } catch {}
      }
    };

    socket.on("receive_call_offer", handleCallOffer);
    return () => {
      socket.off("receive_call_offer", handleCallOffer);
    };
  }, [socket, callActive, isCalling, incomingCall, setIncomingCall, startRingtone, currentUserId]);

  // কলার সাইড থেকে অফার পাঠানো
  useEffect(() => {
    if (!isCalling || !targetUser || offerSentRef.current) return;

    offerSentRef.current = true;

    // gesture এখনো "তাজা" — এখানেই audio unlock করে রাখা হচ্ছে
    unlockAudio();

    (async () => {
      const stream = await startMediaStream(isVideoCall);
      if (!stream) {
        offerSentRef.current = false;
        endCall();
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
  }, [isCalling, isVideoCall, targetUser, socket, currentUserId, unlockAudio, endCall]);

  // সকেট ইভেন্ট লিসেনার
  useEffect(() => {
    if (!socket) return;

    const handleCallAnswer = async (data: { from: string; sdp: any }) => {
      const pc = peerConnectionRef.current;
      if (!pc) return;

      stopRingtone();
      await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
      await flushPendingCandidates();
      acceptCall();
    };

    const handleIceCandidate = async (data: { from: string; candidate: any }) => {
      if (!data.candidate) return;

      const pc = peerConnectionRef.current;

      // pc নেই (receiver এখনো accept করেনি) বা remoteDescription বসেনি — buffer করো
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
      socket.off("receive_call_answer", handleCallAnswer);
      socket.off("receive_ice_candidate", handleIceCandidate);
      socket.off("receive_end_call", handleEndCallEvent);
    };
  }, [socket, handleCleanup, acceptCall, stopRingtone]);

  const handleAccept = async () => {
    if (!incomingCall) return;

    stopRingtone();

    // 🔊 এই ক্লিকটাই user gesture — এখানেই audio unlock করে রাখা হচ্ছে,
    // কোনো await-এর আগে। পরে stream এলে নিজে থেকেই বাজবে।
    unlockAudio();

    const callTypeVideo = incomingCall.isVideo ?? true;
    const stream = await startMediaStream(callTypeVideo);

    if (!stream) {
      // permission fail — caller-কে জানাও, নাহলে তার দিকে ring বাজতেই থাকবে
      socket.emit("end_call", { targetUserId: incomingCall.from, from: currentUserId });
      handleCleanup();
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
    // 🌟 FIX #2: ref থেকে নেওয়া হচ্ছে — store-এর state clear হয়ে গেলেও টিকে থাকে,
    // তাই দুই দিক থেকেই hangup ঠিকমতো কাজ করে।
    const targetId = remotePeerIdRef.current || targetUser?.id || incomingCall?.from;
    if (targetId && socket) {
      socket.emit("end_call", { targetUserId: targetId, from: currentUserId });
    }
    handleCleanup();
  };

  // ইনকামিং কল reject (এখনো peerConnection তৈরি হয়নি, তাই from সরাসরি)
  const handleReject = () => {
    if (incomingCall && socket) {
      socket.emit("end_call", { targetUserId: incomingCall.from, from: currentUserId });
    }
    handleCleanup();
  };

  if (!isCalling && !incomingCall && !callActive) return null;

  const isRinging = !!incomingCall && !callActive;
  const activeCallTypeVideo = incomingCall ? (incomingCall.isVideo ?? true) : isVideoCall;

  const activeUser = targetUser?.name
    ? targetUser
    : incomingCall
    ? { id: incomingCall.from, name: incomingCall.name || "User", image: incomingCall.image }
    : null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex flex-col items-center justify-center p-4">
      {/* audio element সবসময় render — receiver-এর জন্যও mount থাকা জরুরি */}
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
            <Button variant="destructive" size="icon" className="rounded-full h-12 w-12 cursor-pointer" onClick={handleReject}>
              <PhoneOff className="h-5 w-5" />
            </Button>
            <Button variant="default" size="icon" className="rounded-full h-12 w-12 bg-green-600 hover:bg-green-700 cursor-pointer" onClick={handleAccept}>
              <PhoneCall className="h-5 w-5" />
            </Button>
          </div>
        </div>
      )}

      {(isCalling || callActive) && !isRinging && (
        <div className="relative w-full max-w-4xl h-[80vh] bg-muted/20 rounded-2xl overflow-hidden border flex flex-col items-center justify-center shadow-2xl">

          {/* 🔊 autoplay block হলে ইউজারকে একটা tap দিয়ে sound চালু করার সুযোগ */}
          {needsAudioTap && (
            <button
              onClick={() => {
                audioUnlockedRef.current = false;
                unlockAudio();
                const el = remoteAudioRef.current;
                if (el) {
                  el.muted = false;
                  el.play().then(() => setNeedsAudioTap(false)).catch(() => {});
                }
              }}
              className="absolute top-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 rounded-full bg-yellow-500 px-4 py-2 text-sm font-semibold text-black shadow-lg"
            >
              <VolumeX className="h-4 w-4" />
              Tap to enable sound
            </button>
          )}

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
