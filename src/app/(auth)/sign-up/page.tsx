"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signUp } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, MessageSquare } from "lucide-react";

export default function SignUpPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    try {
      // Better Auth-এ আপনার কাস্টম phone ফিল্ড পাঠানো হচ্ছে
      const { error } = await signUp.email({
        email,
        password,
        name,
        phone,
      } as any); // (যদি TypeScript 'phone' এর জন্য এরর দেয়, তাই আপাতত as any দেওয়া হলো, তবে আপনার BetterAuth স্কিমাতে phone থাকলে এরর আসবে না)

      if (error) {
        setErrorMsg(error.message || "Failed to create account!");
        setLoading(false);
        return;
      }

      router.push("/chat");
      router.refresh();
    } catch (err) {
      setErrorMsg("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="flex flex-col space-y-2 text-center lg:text-left">
        {/* Mobile Logo */}
        <div className="flex justify-center lg:hidden mb-6">
          <div className="bg-primary p-3 rounded-xl shadow-md">
            <MessageSquare className="w-8 h-8 text-primary-foreground" />
          </div>
        </div>
        
        <h1 className="text-3xl font-bold tracking-tight">Create an account</h1>
        <p className="text-muted-foreground">
          Enter your details below to create your account and get started
        </p>
      </div>

      {/* Form Section */}
      <form onSubmit={handleSignUp} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="name">Full Name</Label>
          <Input
            id="name"
            type="text"
            placeholder="John Doe"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            disabled={loading}
            className="h-11"
          />
        </div>

        {/* Phone Number Field Added */}
        <div className="space-y-2">
          <Label htmlFor="phone">Phone Number</Label>
          <Input
            id="phone"
            type="tel"
            placeholder="+880 1XXX-XXXXXX"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            disabled={loading}
            className="h-11"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email address</Label>
          <Input
            id="email"
            type="email"
            placeholder="name@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
            className="h-11"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
            minLength={6}
            className="h-11"
          />
        </div>

        {errorMsg && (
          <div className="text-sm font-medium text-destructive p-3 bg-destructive/10 rounded-md">
            {errorMsg}
          </div>
        )}

        <Button type="submit" className="w-full h-11 text-base" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Creating account...
            </>
          ) : (
            "Create Account"
          )}
        </Button>
      </form>

      {/* Footer Section */}
      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/sign-in" className="font-semibold text-primary hover:underline transition-colors">
          Sign in
        </Link>
      </p>
    </div>
  );
}