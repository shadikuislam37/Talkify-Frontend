"use client";
import React, { useState } from "react";
import { useUpdateProfile } from "@/hooks/use-user-features";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface ProfileUpdateProps {
  currentName?: string;
  currentImage?: string;
}

export default function ProfileUpdateModal({ currentName = "", currentImage = "" }: ProfileUpdateProps) {
  const [name, setName] = useState(currentName);
  const [image, setImage] = useState(currentImage);
  const { mutate: updateProfile, isPending } = useUpdateProfile();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile({ name, image });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-2">
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Name</label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          required
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Profile Image URL</label>
        <Input
          value={image}
          onChange={(e) => setImage(e.target.value)}
          placeholder="Image URL"
        />
      </div>

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Changes"}
      </Button>
    </form>
  );
}