import React from "react";
import { MessageSquare } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen w-full">
      {/* Left Panel - Premium Design */}
      <div className="relative hidden w-1/2 flex-col justify-between bg-zinc-950 p-10 text-white lg:flex">
        {/* Subtle dot pattern background */}
        <div className="absolute inset-0 bg-[radial-gradient(#27272a_1px,transparent_1px)] [bg-size:16px_16px] opacity-50" />
        
        {/* Top Logo */}
        <div className="relative z-10 flex items-center gap-2 text-2xl font-bold tracking-tight">
          <div className="rounded-xl bg-white/10 p-2 backdrop-blur-sm">
            <MessageSquare className="h-6 w-6 text-white" />
          </div>
          Talkify
        </div>
        
        {/* Bottom Quote / Content */}
        <div className="relative z-10 mt-auto mb-10">
          <blockquote className="space-y-6">
            <p className="text-3xl font-medium leading-relaxed tracking-tight text-zinc-100">
  &quot;Experience seamless, real-time communication. Connecting with your team has never been this effortless.&quot;
</p>
            <footer className="text-base font-medium text-zinc-400">
              — The Talkify Team
            </footer>
          </blockquote>
        </div>
      </div>

      {/* Right Panel - Auth Form */}
      <div className="flex w-full items-center justify-center bg-background px-4 lg:w-1/2 lg:px-8">
        <div className="w-full max-w-md">
          {children}
        </div>
      </div>
    </div>
  );
}