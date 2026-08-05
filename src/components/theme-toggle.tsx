// components/theme-toggle.tsx
"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  // 🌟 হাইড্রেশন মিসম্যাচ এড়ানোর জন্য — সার্ভারে theme জানা থাকে না,
  // তাই ক্লায়েন্টে mount হওয়ার আগ পর্যন্ত আইকন রেন্ডার না করা
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className="h-8 w-8 shrink-0" />; // placeholder, layout shift এড়াতে
  }

  const isDark = theme === "dark";

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0"
      title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}