"use client";
import React  from "react";
import { useUploadMedia } from "@/hooks/use-media-upload";
import { Button } from "@/components/ui/button";
import { Paperclip, Loader2 } from "lucide-react"; // ImageIcon এর বদলে Paperclip দেওয়া ভালো
import { useRef } from "react";

interface MediaUploadProps {
  onUploadComplete: (fileData: { url: string; name: string; type: string }) => void;
}

export default function MediaUploadButton({ onUploadComplete }: MediaUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { mutate: uploadFile, isPending } = useUploadMedia();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    uploadFile(file, {
      onSuccess: (url) => {
        // ফাইলের URL-এর সাথে নাম এবং টাইপও পাস করে দিচ্ছি
        onUploadComplete({
          url,
          name: file.name,
          type: file.type,
        });
      },
      onError: (err) => {
        console.error("Upload failed:", err);
        alert("File upload failed!");
      }
    });
  };

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        // accept বাদ দেওয়া হয়েছে যাতে PDF, MP4, MKV, Image সব ধরনের ফাইল সাপোর্ট করে
        className="hidden"
      />
      <Button
        type="button"
        size="icon"
        variant="ghost"
        disabled={isPending}
        onClick={() => fileInputRef.current?.click()}
        title="Upload File"
      >
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
      </Button>
    </>
  );
}
  