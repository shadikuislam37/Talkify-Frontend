import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MessageSquare, ArrowRight } from "lucide-react";

export default function HomePage() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background font-sans">
      
      {/* Modern Background Pattern & Glow Effect */}
      <div className="absolute inset-0 -z-10 h-full w-full bg-background bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
      <div className="absolute left-1/2 top-1/2 -z-10 h-400 w-400 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/20 opacity-50 blur-[100px]"></div>

      <div className="z-10 flex w-full max-w-4xl flex-col items-center justify-center px-6 text-center">
        
        {/* Animated Logo/Icon */}
        <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-2xl ring-4 ring-primary/20 transition-transform hover:scale-105">
          <MessageSquare className="h-8 w-8" />
        </div>
        
        {/* Hero Text */}
        <h1 className="mb-6 text-balance text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl md:text-6xl lg:text-7xl">
          Connect effortlessly with <span className="text-primary">Talkify</span>
        </h1>
        
        <p className="mb-10 max-w-2xl text-balance text-lg text-muted-foreground sm:text-xl">
          Experience seamless, real-time communication. Fast, secure, and designed for modern teams and friends to stay in touch.
        </p>
        
        {/* Action Buttons (Fixed Width for Desktop) */}
        <div className="flex w-full flex-col items-center justify-center gap-4 sm:w-auto sm:flex-row">
          <Link href="/sign-in">
            <Button size="lg" className="h-12 rounded-full px-8 text-base shadow-lg transition-all hover:shadow-primary/25">
              Get Started <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          <Link href="/sign-up">
            <Button size="lg" variant="outline" className="h-12 rounded-full border-2 px-8 text-base transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800">
              Create Account
            </Button>
          </Link>
        </div>

      </div>
    </div>
  );
}