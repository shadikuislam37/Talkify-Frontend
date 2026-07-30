"use client";
import React, { useState } from "react";
import { useUpdateProfile, useToggleActiveStatus } from "@/hooks/use-user-features";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

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

  // ১. হুকগুলো কল করা হলো (এখানে কোনো সকেট লাগবে না)
  const { mutate: updateProfile, isPending: isUpdatingProfile } = useUpdateProfile();
  const { mutate: toggleStatus, isPending: isTogglingStatus } = useToggleActiveStatus();

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile({ name, image });
  };

  return (
    <div className="space-y-6 py-2">
      {/* প্রোফাইল আপডেট ফর্ম */}
      <form onSubmit={handleSave} className="space-y-4">
        <div className="space-y-1">
          <Label className="text-xs font-medium">Name</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your name"
            required
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs font-medium">Profile Image URL</Label>
          <Input
            value={image}
            onChange={(e) => setImage(e.target.value)}
            placeholder="Enter image URL"
          />
        </div>

        <Button type="submit" disabled={isUpdatingProfile} className="w-full">
          {isUpdatingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update Profile"}
        </Button>
      </form>

      {/* প্রাইভেসি / অ্যাক্টিভ স্ট্যাটাস টগল */}
      <div className="flex items-center justify-between pt-4 border-t">
        <Label htmlFor="active-status" className="text-xs">
          Show Active Status
        </Label>
        <Switch
          id="active-status"
          defaultChecked={initialVisibility}
          disabled={isTogglingStatus}
          onCheckedChange={(checked) => toggleStatus(checked)}
        />
      </div>
    </div>
  );
}