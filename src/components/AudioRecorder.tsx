"use client";

import React, { useState, useRef } from "react";
import { Mic, Send, Trash2, Square } from "lucide-react";
import { mediaApi } from "@/lib/api";

interface AudioRecorderProps {
  conversationId: string;
  onAudioSent: (messageData: any) => void;
}

export function AudioRecorder({ conversationId, onAudioSent }: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        stream.getTracks().forEach((track) => track.stop());
        await uploadAndSendAudio(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error("Microphone permission denied or error:", error);
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
      mediaRecorderRef.current.onstop = null; // যাতে আপলোড না হয়ে বাতিল হয়
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const uploadAndSendAudio = async (audioBlob: Blob) => {
    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append("file", audioBlob, `voice-note-${Date.now()}.webm`);
      formData.append("conversationId", conversationId);
      formData.append("fileType", "audio/webm");

      const response: any = await mediaApi.post("/messages/upload-audio", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      // সফলভাবে আপলোড হলে প্যারেন্ট কম্পোনেন্টে পাঠিয়ে দেওয়া
      if (response) {
        onAudioSent(response);
      }
    } catch (error) {
      console.error("Failed to upload audio note:", error);
    } finally {
      setIsUploading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  if (isUploading) {
    return <span className="text-xs text-muted-foreground animate-pulse">Sending voice note...</span>;
  }

  return (
    <div className="flex items-center gap-2">
      {isRecording ? (
        <div className="flex items-center gap-3 bg-red-500/10 text-red-500 px-3 py-1.5 rounded-full animate-pulse">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
          <span className="text-xs font-semibold">{formatTime(recordingTime)}</span>
          <button type="button" onClick={cancelRecording} className="p-1 hover:bg-red-500/20 rounded-full" title="Cancel">
            <Trash2 className="h-4 w-4" />
          </button>
          <button type="button" onClick={stopRecording} className="p-1 bg-red-500 text-white rounded-full" title="Send">
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