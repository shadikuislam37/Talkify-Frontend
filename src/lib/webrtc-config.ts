// lib/webrtc-config.ts
import { api } from "@/lib/api";

const STUN_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

const FALLBACK_ICE: RTCConfiguration = { iceServers: STUN_SERVERS };

interface CfIce {
  urls: string[];
  username: string;
  credential: string;
}

let cached: { servers: RTCConfiguration; expiresAt: number } | null = null;

export async function getIceServers(): Promise<RTCConfiguration> {
  if (cached && Date.now() < cached.expiresAt) return cached.servers;

  try {
    const ice = await api.get<CfIce>("/turn/credentials");

    if (!ice?.urls) throw new Error("Invalid TURN response");

    const servers: RTCConfiguration = {
      iceServers: [
        ...STUN_SERVERS,
        { urls: ice.urls, username: ice.username, credential: ice.credential },
      ],
    };

    console.log("[WEBRTC] TURN credentials loaded ✅", ice.urls.length, "urls");

    cached = { servers, expiresAt: Date.now() + 23 * 60 * 60 * 1000 };
    return servers;
  } catch (e) {
    console.warn("[WEBRTC] TURN fetch failed, STUN only:", e);
    return FALLBACK_ICE;
  }
}