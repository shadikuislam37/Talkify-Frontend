"use client";

import React from "react";
import { useUpdateChatTheme } from "@/hooks/use-conversations";
import { socket } from "@/lib/socket";

export function ThemePicker({ conversationId }: { conversationId: string }) {
  const { mutate: updateTheme } = useUpdateChatTheme();

  // 🌟 সব নতুন থিম এবং এগুলোর প্রিভিউ কালার বা গ্রেডিয়েন্ট
const themes = [
    { name: "Default", class: "theme-default", preview: "bg-white border-gray-300 dark:bg-zinc-800" },
    { name: "Ocean", class: "theme-ocean", preview: "bg-gradient-to-tr from-blue-600 to-cyan-400" },
    { name: "Sunset", class: "theme-sunset", preview: "bg-gradient-to-tr from-rose-600 to-orange-500" },
    { name: "Cyberpunk", class: "theme-cyberpunk", preview: "bg-gradient-to-tr from-purple-600 to-pink-500" },
    { name: "Emerald", class: "theme-emerald", preview: "bg-gradient-to-tr from-emerald-600 to-teal-400" },
    { name: "Rose", class: "theme-rose", preview: "bg-gradient-to-tr from-pink-600 to-rose-400" },
    { name: "Slate", class: "theme-slate", preview: "bg-gradient-to-tr from-slate-600 to-slate-400" },
   { name: "Indigo", class: "theme-indigo", preview: "bg-gradient-to-tr from-indigo-600 to-indigo-400" },
  ];

  const handleSelectTheme = (themeClass: string) => {
    // ১. ব্যাকএন্ডে আপডেট
    updateTheme({ conversationId, theme: themeClass });

    // ২. সকেট ইভেন্ট
    if (socket && socket.connected) {
      socket.emit("update_theme", { conversationId, theme: themeClass });
    }
  };

  return (
    <div className="flex flex-col gap-2 p-1">
      <p className="text-xs font-semibold text-muted-foreground px-1">Messenger Themes</p>
      <div className="flex flex-wrap gap-2">
        {themes.map((t) => (
          <button
            key={t.name}
            type="button"
            onClick={() => handleSelectTheme(t.class)}
            className={`w-7 h-7 rounded-full border border-gray-400 transition-transform hover:scale-110 shadow-sm ${t.preview}`}
            title={t.name}
          />
        ))}
      </div>
    </div>
  );
}