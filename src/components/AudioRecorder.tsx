"use client";

import React, { useState, useRef } from "react";
import { Mic, Send, Trash2 } from "lucide-react";
import { useUploadMedia } from "@/hooks/use-media-upload";

interface AudioRecorderProps {
  onAudioSent: (fileUrl: string) => void;
}

export function AudioRecorder({ onAudioSent }: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const { mutateAsync: uploadMedia, isPending: isUploading } = useUploadMedia();

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // 🌟 আইপ্যাড/সাফারি এবং অন্যান্য ডিভাইসের জন্য স্মার্ট ফরম্যাট ডিটেকশন
      const possibleTypes = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/mp4",
        "audio/aac",
      ];

      let selectedMimeType = "";
      for (const type of possibleTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          selectedMimeType = type;
          break;
        }
      }

      // যদি ব্রাউজার কোনো নির্দিষ্ট টাইপ সাপোর্ট না করে, তবে ব্রাউজারের ডিফল্ট নেওয়ার জন্য ব্ল্যাংক রাখা বা ఆપ્শন পাস না করা
      const options = selectedMimeType ? { mimeType: selectedMimeType } : undefined;
      
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // রেকর্ড শেষ হলে রিয়েল মাইন টাইপ বা ফলব্যাক অনুযায়ী এক্সটেনশন নির্ধারণ
        const actualMimeType = mediaRecorder.mimeType || selectedMimeType || "audio/webm";
        const isMp4 = actualMimeType.includes("mp4") || actualMimeType.includes("aac");
        const fileExtension = isMp4 ? "m4a" : "webm";
        const finalMimeType = isMp4 ? "audio/mp4" : "audio/webm";

        const audioBlob = new Blob(audioChunksRef.current, { type: finalMimeType });
        stream.getTracks().forEach((track) => track.stop());
        
        // সঠিক ফরম্যাট ও এক্সটেনশন সহ ফাইল তৈরি
        const file = new File([audioBlob], `voice-note-${Date.now()}.${fileExtension}`, { type: finalMimeType });
        
        try {
          const fileUrl = await uploadMedia(file);
          if (fileUrl) {
            onAudioSent(fileUrl);
          }
        } catch (error) {
          console.error("Failed to upload voice note:", error);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error("Microphone permission denied or not supported:", error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.onstop = null; // যাতে আপলোড না হয়ে ক্যানসেল হয়
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  if (isUploading) {
    return <span className="text-xs text-muted-foreground animate-pulse px-2">Sending voice note...</span>;
  }

  return (
    <div className="flex items-center gap-1">
      {isRecording ? (
        <div className="flex items-center gap-2 bg-red-500/10 text-red-500 px-3 py-1.5 rounded-full animate-pulse">
          <span className="w-2 h-2 rounded-full bg-red-500"></span>
          <span className="text-xs font-semibold">{formatTime(recordingTime)}</span>
          <button type="button" onClick={cancelRecording} className="p-1 hover:bg-red-500/20 rounded-full cursor-pointer" title="Cancel">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
          <button type="button" onClick={stopRecording} className="p-1 bg-red-500 text-white rounded-full cursor-pointer" title="Send">
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={startRecording}
          className="p-2 hover:bg-muted rounded-full text-muted-foreground transition-colors cursor-pointer"
          title="Record voice note"
        >
          <Mic className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}