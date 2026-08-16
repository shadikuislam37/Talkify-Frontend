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
  const [needsAudioTap, setNeedsAudioTap] = useState(false);

  // 🌟 FIX: remote peer-এর camera অবস্থা আলাদা state-এ।
  // আগে remote video hide/overlay সবই `isVideoOff` (নিজের state) দিয়ে হতো,
  // তাই এক পাশ camera বন্ধ করলে সে নিজের স্ক্রিনে উল্টো পাশের ভিডিওটাও হারিয়ে
  // ফেলতো — মনে হতো দুই দিকের camera বন্ধ হয়ে গেছে।
  // remote track disable হলে browser ওই track-এ "mute" event ফায়ার করে, সেটা
  // ধরেই এই state আপডেট হয় — কোনো extra socket event লাগে না।
  const [remoteVideoOff, setRemoteVideoOff] = useState(false);

  const myVideoRef = useRef<HTMLVideoElement | null>(null);
  const userVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const offerSentRef = useRef(false);
    // resume path একবারই চলবে — নইলে receiver-এর প্রতিটা call_ready
  // নতুন offer তৈরি করে আর একাধিক PeerConnection জমে যায়
  const reOfferedRef = useRef(false);
  const audioUnlockedRef = useRef(false);
  const remotePeerIdRef = useRef<string | null>(null);

  // ==========================================================================
  // 🔊 AUDIO UNLOCK — mobile-এ এক দিকের sound না আসার কারণ
  // ==========================================================================
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
      .catch(() => {});
  }, []);

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
  // 🔔 RINGTONE — Web Audio API, কোনো audio ফাইল লাগে না
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
    } catch {}
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
    reOfferedRef.current = false;
    remotePeerIdRef.current = null;
    setRemoteStream(null);
    setNeedsAudioTap(false);
    setIsMuted(false);
    setIsVideoOff(false);
    setRemoteVideoOff(false);
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
          setNeedsAudioTap(true);
        });
    }

    if (userVideoRef.current) {
      userVideoRef.current.srcObject = remoteStream;
      userVideoRef.current.play().catch(() => {});
    }
  }, [remoteStream, callActive, remoteVideoOff, incomingCall]);

  // 🌟 FIX (v4): remote camera state এখন socket signaling দিয়ে আসে।
  //
  // v3-তে remote track-এর "mute"/"unmute" event শুনে বোঝার চেষ্টা করা হয়েছিল।
  // কাগজে ওটাই standard উপায়, কিন্তু বাস্তবে TURN relay-র উপর দিয়ে গেলে সব
  // browser ওই event নির্ভরযোগ্যভাবে ফায়ার করে না — ফলে remoteVideoOff কখনো
  // আপডেটই হতো না। তাই এখন উল্টো পাশ camera toggle করলে সরাসরি socket-এ
  // জানিয়ে দেয় (toggle_video → remote_video_toggled)। এটা deterministic।
  //
  // track না থাকা (audio-only call) কেসটা আলাদা করে ধরা হচ্ছে নিচে।
  useEffect(() => {
    if (!remoteStream) {
      setRemoteVideoOff(false);
      return;
    }

    const videoTrack = remoteStream.getVideoTracks()[0];
    if (!videoTrack) {
      setRemoteVideoOff(true); // audio-only call — দেখানোর মতো video নেই
      return;
    }

    const onEnded = () => setRemoteVideoOff(true);
    videoTrack.addEventListener("ended", onEnded);
    return () => videoTrack.removeEventListener("ended", onEnded);
  }, [remoteStream]);

  // উল্টো পাশ camera on/off করলে server এই event পাঠায়
  useEffect(() => {
    if (!socket) return;

    const handleRemoteVideoToggled = (data: { from: string; isVideoOff: boolean }) => {
      setRemoteVideoOff(!!data.isVideoOff);
    };

    socket.on("remote_video_toggled", handleRemoteVideoToggled);
    return () => {
      socket.off("remote_video_toggled", handleRemoteVideoToggled);
    };
  }, [socket]);

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
  // incoming call — এই component নিজেই শোনে, তাই যেকোনো page থেকে কল ধরা যায়
  // ==========================================================================
  useEffect(() => {
    if (!socket) return;

    const handleCallOffer = (data: {
      from: string;
      name: string;
      image?: string;
      sdp: any;
      isVideo?: boolean;
    }) => {
      if (callActive || isCalling || incomingCall) {
        socket.emit("end_call", { targetUserId: data.from, from: currentUserId });
        return;
      }

      setIncomingCall(data as any);
      startRingtone();

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


    // রিসিভার killed অবস্থা থেকে জেগে উঠেছে। পুরনো offer আর তার ICE
    // candidate গুলো ততক্ষণে বাসি — কেউ শুনছিল না — তাই peer connection
    // নতুন করে বানিয়ে আবার offer পাঠানো হয়।
    const handleCallReady = async (data: { from: string; callUUID?: string }) => {
      if (!targetUser || data.from !== targetUser.id) return;
      if (reOfferedRef.current) return;
      reOfferedRef.current = true;

      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }
      pendingCandidatesRef.current = [];

      if (!localStreamRef.current) return;

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
        callUUID: data.callUUID,
      });
    };


    const handleEndCallEvent = () => {
      handleCleanup();
    };

    socket.on("receive_call_answer", handleCallAnswer);
    socket.on("receive_ice_candidate", handleIceCandidate);
    socket.on("receive_call_ready", handleCallReady);
    socket.on("receive_end_call", handleEndCallEvent);

    return () => {
     socket.off("receive_call_answer", handleCallAnswer);
    socket.off("receive_ice_candidate", handleIceCandidate);
    socket.off("receive_call_ready", handleCallReady);
    socket.off("receive_end_call", handleEndCallEvent);
    };
 }, [socket, handleCleanup, acceptCall, stopRingtone, targetUser, currentUserId, isVideoCall]);

  const handleAccept = async () => {
    if (!incomingCall) return;

    stopRingtone();
    unlockAudio();

    const callTypeVideo = incomingCall.isVideo ?? true;
    const stream = await startMediaStream(callTypeVideo);

    if (!stream) {
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
    if (!localStreamRef.current) return;

    const next = !isVideoOff;

    localStreamRef.current.getVideoTracks().forEach((track) => {
      track.enabled = !next;
    });
    setIsVideoOff(next);

    // 🌟 উল্টো পাশকে জানিয়ে দাও — নাহলে সে বুঝবে না camera বন্ধ হয়েছে
    const targetId = remotePeerIdRef.current;
    if (targetId && socket) {
      socket.emit("toggle_video", { targetUserId: targetId, isVideoOff: next });
    }
  };

  const handleEndCall = () => {
    const targetId = remotePeerIdRef.current || targetUser?.id || incomingCall?.from;
    if (targetId && socket) {
      socket.emit("end_call", { targetUserId: targetId, from: currentUserId });
    }
    handleCleanup();
  };

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
              {/*
                🌟 FIX: hidden করার শর্ত `isVideoOff` (নিজের) থেকে `remoteVideoOff`
                (উল্টো পাশের) করা হলো। আগে নিজের camera বন্ধ করলে উল্টো পাশের
                ভিডিওটাও hidden হয়ে যেত।
              */}
              <video
                ref={userVideoRef}
                autoPlay
                playsInline
                className={`w-full h-full object-cover ${remoteVideoOff && callActive ? "hidden" : ""}`}
              />

              {/*
                🌟 FIX: এই overlay-টা উল্টো পাশের ভিডিও ঢেকে দেয়, তাই এর শর্তও
                remote-এর অবস্থার উপর হওয়া উচিত — নিজের `isVideoOff`-এর উপর না।
              */}
              {(!callActive || remoteVideoOff) && (
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

              {/* self preview — এখানেই শুধু নিজের isVideoOff কাজে লাগে */}
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
