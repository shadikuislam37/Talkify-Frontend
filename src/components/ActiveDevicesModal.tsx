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

  // ১. লগইন হিস্ট্রি ফেচ করার একক useEffect (ডাবল রেন্ডার বা ডাবল কল ফিক্সড)
  useEffect(() => {
    let isMounted = true;

    const loadSessions = async () => {
      try {
        const response: any = await api.get("/users/login-history");
        if (isMounted) {
          setSessions(response.data || response);
        }
      } catch (error) {
        console.error("Failed to fetch login history", error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadSessions();

    return () => {
      isMounted = false;
    };
  }, []);

  // ২. নির্দিষ্ট ডিভাইস বা সেশন রিমোটলি লগআউট (ডিলিট) করার ফাংশন
  const handleRevokeSession = async (sessionId: string) => {
    setRevokingId(sessionId);
    try {
      // ব্যাকএন্ডে সেশন ডিলিট করার রিকোয়েস্ট
      await api.delete(`/users/sessions/${sessionId}`);
      
      // লোকাল স্টেট থেকে ইনস্ট্যান্ট ফিল্টার করে বাদ দেওয়া, যাতে UI সাথে সাথে আপডেট হয়
      setSessions((prevSessions) => prevSessions.filter((s) => s.id !== sessionId));
    } catch (error) {
      console.error("Failed to revoke session", error);
    } finally {
      setRevokingId(null);
    }
  };

  // ৩. ফেসবুক বা জিমেইলের স্টাইলে নিখুঁত রিয়েল ডিভাইস পার্স করার ফাংশন
  const parseDeviceDetails = (deviceString: string = "") => {
    const parser = new UAParser(deviceString);
    const result = parser.getResult();

    const browserName = result.browser.name 
      ? `${result.browser.name}` 
      : "Unknown Browser";

    let osName = result.os.name || "";
    const osVersion = result.os.version || "";

    // উইন্ডোজ ১১ ডিটেকশন হ্যান্ডলিং
    if (osName === "Windows") {
      if (osVersion === "10" || osVersion === "10.0") {
        osName = "Windows 11";
      } else {
        osName = `Windows ${osVersion}`;
      }
    }

    const vendor = result.device.vendor || "";
    const model = result.device.model || "";
    const deviceType = result.device.type;

    let deviceFormatted = "";

    // কাস্টম হ্যান্ডলিং: ইউজার-এজেন্ট স্ট্রিং থেকে ব্র্যান্ড বা মডেল সরাসরি খুঁজে বের করা যদি ইউএ-পার্সার মিস করে
    const lowerUA = deviceString.toLowerCase();

    if (model) {
      deviceFormatted = vendor && !model.toLowerCase().includes(vendor.toLowerCase())
        ? `${vendor} ${model}`
        : model;
    } else {
      // যদি ua-parser মডেল ধরতে না পারে, তবে র-স্ট্রিং চেক করে রিয়েল ডিভাইস ফাইন্ডআউট করা
      if (lowerUA.includes("redmi")) {
        deviceFormatted = "Redmi Device";
      } else if (lowerUA.includes("xiaomi") || lowerUA.includes("mi ")) {
        deviceFormatted = "Xiaomi Device";
      } else if (lowerUA.includes("samsung") || lowerUA.includes("sm-")) {
        deviceFormatted = "Samsung Device";
      } else if (lowerUA.includes("iphone")) {
        deviceFormatted = "iPhone";
      } else if (lowerUA.includes("ipad")) {
        deviceFormatted = "iPad";
      } else if (deviceType === "mobile" || deviceType === "tablet") {
        deviceFormatted = `${osName || "Mobile"} Device`;
      } else {
        const isMobileUA = /mobile|android|iphone|ipad|phone/i.test(deviceString);
        if (isMobileUA && !osName.toLowerCase().includes("windows")) {
          deviceFormatted = "Mobile Device";
        } else {
          deviceFormatted = osName ? `${osName}` : "PC / Laptop";
        }
      }
    }

    // যদি মডেলে অলরেডি ভেন্ডর না থাকে এবং ব্রাউজার স্ট্রিংয়ে ব্র্যান্ড থাকে তা সুন্দর করা
    if (vendor && model && !model.toLowerCase().includes(vendor.toLowerCase())) {
      deviceFormatted = `${vendor} ${model}`;
    }

    return {
      deviceName: deviceFormatted.trim() || "Unknown Device",
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