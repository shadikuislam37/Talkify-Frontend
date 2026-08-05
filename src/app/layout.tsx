import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import QueryProvider from "@/providers/query-provider";
import { ThemeProvider } from "@/providers/theme-provider";

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
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}