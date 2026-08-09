import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import QueryProvider from "@/providers/query-provider";
import { ThemeProvider } from "@/providers/theme-provider";
import { CallProvider } from "@/providers/call-provider";
import { Toaster } from "sonner";

const inter = Inter({ 
  subsets: ["latin"], 
  variable: "--font-sans" 
});

export const metadata: Metadata = {
  title: "Talkify - Connect with your friends and team",
  description: "A fast, secure, and modern real-time chat platform.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html 
      lang="en" 
      suppressHydrationWarning
      className={cn("h-full", "antialiased", inter.variable)}
    >
      <body className={cn(
        "h-full flex flex-col overflow-hidden bg-background text-foreground font-sans selection:bg-primary selection:text-primary-foreground",
        "subpixel-antialiased"
      )}>
        {/* 🌟 নতুন: ThemeProvider — attribute="class" মানে <html> ট্যাগে "dark" class
            টগল হবে, যেটা আপনার globals.css-এর .dark সিলেক্টরের সাথে ম্যাচ করে */}
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <QueryProvider>
            {children}

            {/* 🌟 নতুন: কল এখন পুরো অ্যাপ জুড়ে ধরা হয়, শুধু chat page-এ না।
                CallProvider ভেতরে socket connect করে আর VideoCallModal mount
                করে, তাই ইউজার যেকোনো route-এ থাকলেও incoming call দেখতে পাবে। */}
            <CallProvider />

            {/* 🌟 Toaster root-এ — permission error / call error-এর toast গুলো
                chat page-এর বাইরেও দেখাতে হবে।
                ⚠️ যদি chat layout-এ ইতিমধ্যে <Toaster /> থাকে, সেখান থেকে
                সরিয়ে দাও — নাহলে দুটো Toaster-এ toast ডাবল দেখাবে। */}
            <Toaster position="top-center" richColors />
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
