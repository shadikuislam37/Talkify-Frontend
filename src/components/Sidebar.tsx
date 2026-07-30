"use client";
import React, { useState } from "react";
import ProfileSettings from "./ProfileSettings";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function SidebarHeader({ currentUser }: { currentUser: any }) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  return (
    <div className="flex items-center justify-between p-3 border-b">
      <div className="flex items-center gap-2">
        {/* ইউজারের প্রোফাইল ছবি ও নাম */}
        <span className="font-semibold text-sm">{currentUser?.name}</span>
      </div>

      {/* Settings Modal Trigger Button */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Settings className="h-4 w-4" />
          </Button>
        </DialogTrigger>

        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Settings & Privacy</DialogTitle>
          </DialogHeader>

          {/* 🌟 এখানে আপনার বানানো ProfileSettings কম্পোনেন্টটি পাস করে দেওয়া হলো */}
          <div className="py-2">
            <ProfileSettings initialVisibility={currentUser?.isActiveStatusVisible ?? true} />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}