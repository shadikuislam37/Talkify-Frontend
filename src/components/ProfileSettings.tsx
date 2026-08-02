"use client";
import React, { useState, useRef } from "react";
import { useUpdateProfile, useToggleActiveStatus } from "@/hooks/use-user-features";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Loader2, Camera } from "lucide-react";
import { mediaApi } from "@/lib/api"; // 🌟 raw axios instance (interceptor ছাড়া) — direct backend call
import Image from "next/image";

interface ProfileSettingsProps {
  currentName?: string;
  currentImage?: string;
  initialVisibility?: boolean;
}

export default function ProfileSettingsModal({
  currentName = "",
  currentImage = "",
  initialVisibility = true,
}: ProfileSettingsProps) {
  const [name, setName] = useState(currentName);
  const [image, setImage] = useState(currentImage);
  const [isActive, setIsActive] = useState(initialVisibility);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { mutate: updateProfile, isPending: isUpdatingProfile } = useUpdateProfile();
  const { mutate: toggleStatus, isPending: isTogglingStatus } = useToggleActiveStatus();

  // 🌟 ছবি আপলোডের ফাংশন (ফিক্সড — mediaApi এর raw response structure অনুযায়ী)
  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append("files", file); // ব্যাকএন্ডের upload.array('files') এর সাথে মিল রেখে

    try {
      const res = await mediaApi.post("/media/upload", formData);

      // 🌟 mediaApi raw axios response দেয়, তাই res.data হচ্ছে ব্যাকএন্ডের পুরো body
      if (res.data?.success && res.data?.data?.[0]?.fileUrl) {
        setImage(res.data.data[0].fileUrl);
      } else {
        alert(res.data?.message || "Failed to upload image.");
      }
    } catch (error: any) {
      console.error("Upload error:", error);
      alert(
        error.response?.data?.message ||
        error.message ||
        "Something went wrong while uploading!"
      );
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // প্রোফাইল সেভ করার ফাংশন
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile({ name, image });
  };

  // স্ট্যাটাস টগল করার ফাংশন
  const handleToggleStatus = (checked: boolean) => {
    setIsActive(checked);
    toggleStatus(checked, {
      onError: () => setIsActive(!checked),
    });
  };

  return (
    <div className="space-y-6 py-2">
      {/* প্রোফাইল আপডেট ফর্ম */}
      <form onSubmit={handleSave} className="space-y-5">
        
        {/* প্রোফাইল ইমেজ আপলোড সেকশন */}
        <div className="flex flex-col items-center gap-3">
          <div className="relative h-20 w-20 rounded-full bg-muted overflow-hidden border-2 border-border">
            {image ? (
              <Image 
                src={image} 
                alt="Profile" 
                fill 
                sizes="80px"
                className="object-cover" 
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center bg-secondary text-secondary-foreground">
                <Camera size={24} />
              </div>
            )}

            {isUploading && (
              <div className="absolute inset-0 bg-background/50 flex items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            )}
          </div>

          <Button 
            type="button" 
            variant="outline" 
            size="sm" 
            className="text-xs"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            {isUploading ? "Uploading..." : "Change Picture"}
          </Button>

          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleImageChange} 
            accept="image/*" 
            className="hidden" 
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs font-medium">Name</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your name"
            required
          />
        </div>

        <Button type="submit" disabled={isUpdatingProfile || isUploading} className="w-full">
          {isUpdatingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update Profile"}
        </Button>
      </form>

      {/* প্রাইভেসি / অ্যাক্টিভ স্ট্যাটাস টগল */}
      <div className="flex items-center justify-between pt-4 border-t">
        <Label htmlFor="active-status" className="text-xs cursor-pointer">
          Show Active Status
        </Label>
        <Switch
          id="active-status"
          checked={isActive}
          disabled={isTogglingStatus}
          onCheckedChange={handleToggleStatus}
        />
      </div>
    </div>
  );
}