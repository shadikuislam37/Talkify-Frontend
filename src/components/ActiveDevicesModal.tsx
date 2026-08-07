"use client";

import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Laptop, Smartphone, Trash2, Loader2, ShieldCheck, Globe, Clock } from "lucide-react";
import { UAParser } from "ua-parser-js";

export default function ActiveDevicesModal() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  // 🌟 ১. লগইন হিস্ট্রি ফেচ করার ফাংশন
  const fetchSessions = async () => {
    try {
      const response = await api.get("/users/login-history");
      setSessions(response.data.data || response.data);
    } catch (error) {
      console.error("Failed to fetch login history", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  // 🌟 ২. নির্দিষ্ট ডিভাইস বা সেশন রিমোটলি লগআউট করার ফাংশন
  const handleRevokeSession = async (sessionId: string) => {
    setRevokingId(sessionId);
    try {
      await api.delete(`/users/sessions/${sessionId}`);
      setSessions(sessions.filter((s) => s.id !== sessionId));
    } catch (error) {
      console.error("Failed to revoke session", error);
    } finally {
      setRevokingId(null);
    }
  };

  // রিয়েল ডিভাইস পার্স করার হেল্পার
  const parseDeviceDetails = (deviceString: string = "") => {
    const parser = new UAParser(deviceString);
    const result = parser.getResult();

    const browserName = result.browser.name 
      ? `${result.browser.name} ${result.browser.version ? `(${result.browser.version.split('.')[0]})` : ''}` 
      : "Unknown Browser";

    const vendor = result.device.vendor || "";
    const model = result.device.model || "";
    const osName = result.os.name || "";
    const osVersion = result.os.version || "";

    let deviceName = "";
    if (model) {
      deviceName = vendor && !model.toLowerCase().includes(vendor.toLowerCase()) 
        ? `${vendor} ${model}` 
        : model;
    } else if (result.device.type) {
      deviceName = `${result.device.type.charAt(0).toUpperCase() + result.device.type.slice(1)}`;
    } else {
      deviceName = osName ? `${osName} ${osVersion}` : "Desktop PC";
    }

    return {
      deviceName: deviceName.trim() || "Unknown Device",
      browserName: browserName.trim(),
    };
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-10 space-y-2">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p className="text-xs text-muted-foreground">Loading active sessions...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
      <div className="flex items-center gap-2.5 p-3 rounded-xl bg-primary/5 border border-primary/10 text-xs text-muted-foreground">
        <ShieldCheck className="h-5 w-5 text-primary shrink-0" />
        <span>Review the devices and locations where your account is currently logged in or has active history.</span>
      </div>

      <div className="space-y-2.5">
        {sessions.length === 0 ? (
          <div className="text-center py-8 space-y-1">
            <p className="text-sm font-medium">No login history found</p>
            <p className="text-xs text-muted-foreground">Your active sessions will appear here.</p>
          </div>
        ) : (
          sessions.map((session, index) => {
            const { deviceName, browserName } = parseDeviceDetails(session.device);
            const isMobile = deviceName.toLowerCase().includes("iphone") || deviceName.toLowerCase().includes("android") || deviceName.toLowerCase().includes("ipad") || deviceName.toLowerCase().includes("mobile");
            const isCurrent = index === 0;

            return (
              <div 
                key={session.id} 
                className="flex items-center justify-between p-3.5 border rounded-2xl bg-muted/20 hover:bg-muted/40 transition-all duration-200"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="p-3 rounded-xl bg-background border shadow-xs shrink-0 flex items-center justify-center">
                    {isMobile ? (
                      <Smartphone className="h-5 w-5 text-primary" />
                    ) : (
                      <Laptop className="h-5 w-5 text-primary" />
                    )}
                  </div>
                  <div className="min-w-0 space-y-0.5">
                    <p className="text-xs font-semibold truncate text-foreground">
                      {deviceName} • <span className="font-normal text-muted-foreground">{browserName}</span>
                    </p>
                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Globe className="h-3 w-3" /> {session.ipAddress || "IP: N/A"}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {new Date(session.loginAt).toLocaleDateString()} ({new Date(session.loginAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                      </span>
                    </div>
                  </div>
                </div>

                {isCurrent ? (
                  <span className="text-[10px] bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-2.5 py-1 rounded-full font-semibold shrink-0">
                    Current
                  </span>
                ) : (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0 cursor-pointer rounded-xl"
                    onClick={() => handleRevokeSession(session.id)}
                    disabled={revokingId === session.id}
                    title="Log out this device"
                  >
                    {revokingId === session.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}