"use client";
import React, { useRef } from "react";
import { useUploadMedia } from "@/hooks/use-media-upload";
import { Button } from "@/components/ui/button";
import { Image as ImageIcon, Loader2 } from "lucide-react";

interface MediaUploadProps {
  onUploadComplete: (url: string) => void;
}

export default function MediaUploadButton({ onUploadComplete }: MediaUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { mutate: uploadFile, isPending } = useUploadMedia();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    uploadFile(file, {
      onSuccess: (url) => {
        onUploadComplete(url);
      },
    });
  };

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*,application/pdf"
        className="hidden"
      />
      <Button
        type="button"
        size="icon"
        variant="ghost"
        disabled={isPending}
        onClick={() => fileInputRef.current?.click()}
        title="Upload Image or File"
      >
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
      </Button>
    </>
  );
}