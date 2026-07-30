import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import QueryProvider from "@/providers/query-provider";
import { Toaster } from "sonner";

const inter = Inter({ 
  subsets: ["latin"], 
  variable: "--font-sans" 
});

export const metadata: Metadata = {
  title: "ChatApp - Connect with your friends and team",
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
        "min-h-full flex flex-col bg-background text-foreground font-sans selection:bg-primary selection:text-primary-foreground",
        "subpixel-antialiased"
      )}>
        <QueryProvider>
          {children}
          <Toaster 
          position="top-right" 
          richColors 
          closeButton 
          duration={3500}
        />
        </QueryProvider>
      </body>
    </html>
  );
}