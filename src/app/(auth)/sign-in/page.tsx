"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "@tanstack/react-form";
import { signInSchema, SignInInput } from "@/schemas/auth.schema";
import { signIn, authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ShieldCheck, ArrowLeft, RefreshCw } from "lucide-react";
import { useAuthStore } from "@/store/use-auth-store";

// 🌟 Reusable Field Error Component
const FieldError = ({ errors }: { errors: unknown[] }) => {
  if (!errors || errors.length === 0) return null;
  const message = errors
    .map((err) =>
      typeof err === "string"
        ? err
        : (err as { message?: string })?.message || String(err)
    )
    .join(", ");

  return <p className="text-sm font-medium text-destructive mt-1">{message}</p>;
};

export default function SignInPage() {
  const router = useRouter();
  const [step, setStep] = useState<"CREDENTIALS" | "OTP">("CREDENTIALS");
  const [errorMsg, setErrorMsg] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [resendingOtp, setResendingOtp] = useState(false);

  const setUser = useAuthStore((state) => state.setUser);

  // 🌟 Step 1: Sign-In Form (TanStack Form)
  const form = useForm({
    defaultValues: {
      email: "",
      password: "",
    } as SignInInput,
    validators: {
      onChange: signInSchema,
    },
    onSubmit: async ({ value }) => {
      setErrorMsg("");
      try {
        const { data, error } = await signIn.email({
          email: value.email,
          password: value.password,
        });

        if (error) {
          setErrorMsg(error.message || "Invalid email or password!");
          return;
        }

        // 🌟 যদি ব্যাকএন্ড থেকে ২FA/OTP ট্রিগার করা হয়ে থাকে
        if ((data as unknown as { twoFactorRedirect?: boolean })?.twoFactorRedirect) {
          setUserEmail(value.email);
          
          // 🚀 এখানে ব্যাকএন্ডকে OTP ইমেইল সেন্ড করতে বলুন!
          const { error: otpErr } = await authClient.twoFactor.sendOtp();
          if (otpErr) {
            setErrorMsg(otpErr.message || "Failed to send OTP code to email.");
          }

          setStep("OTP");
          return;
        }

        if (data?.user) {
          setUser(data.user as unknown as Parameters<typeof setUser>[0]);
        }

        router.push("/chat");
        router.refresh();
      } catch (err) {
        console.error("Sign in error:", err);
        setErrorMsg("Something went wrong. Please try again.");
      }
    },
  });

  // 🌟 Step 2: Login OTP Verification Handler
  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || otp.length < 6) {
      setErrorMsg("Please enter a valid 6-digit OTP code");
      return;
    }

    setVerifyingOtp(true);
    setErrorMsg("");

    try {
      const { data, error } = await authClient.twoFactor.verifyOtp({
        code: otp,
      });

      if (error) {
        setErrorMsg(error.message || "Invalid or expired OTP code!");
      } else {
        if (data?.user) {
          setUser(data.user as unknown as Parameters<typeof setUser>[0]);
        }
        router.push("/chat");
        router.refresh();
      }
    } catch (err) {
      console.error("OTP verification error:", err);
      setErrorMsg("Verification failed. Please try again.");
    } finally {
      setVerifyingOtp(false);
    }
  };

  // 🌟 Resend OTP Function
  const handleResendOTP = async () => {
    setResendingOtp(true);
    setErrorMsg("");
    try {
      const { error } = await authClient.twoFactor.sendOtp();
      if (error) {
        setErrorMsg(error.message || "Failed to resend OTP.");
      } else {
        alert("A new OTP code has been sent to your email!");
      }
    } catch (err) {
      console.error("Resend OTP Error:", err);
      setErrorMsg("Failed to resend OTP.");
    } finally {
      setResendingOtp(false);
    }
  };

  // 🌟 Step 2 Screen: Login OTP Input
  if (step === "OTP") {
    return (
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Security OTP Verification</h1>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            We sent a 6-digit login verification code to{" "}
            <span className="font-semibold text-foreground">{userEmail}</span>.
          </p>
        </div>

        <form onSubmit={handleVerifyOTP} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="otp">6-Digit OTP Code</Label>
            <Input
              id="otp"
              type="text"
              placeholder="123456"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              className="h-11 text-center text-lg tracking-[8px] font-mono"
              required
            />
          </div>

          {errorMsg && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm font-medium text-destructive">
              {errorMsg}
            </div>
          )}

          <Button type="submit" className="w-full h-11 text-base" disabled={verifyingOtp}>
            {verifyingOtp ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "Verify & Log In"}
          </Button>

          <div className="flex items-center justify-between pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setStep("CREDENTIALS");
                setErrorMsg("");
              }}
            >
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleResendOTP}
              disabled={resendingOtp}
            >
              {resendingOtp ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Resend OTP
            </Button>
          </div>
        </form>
      </div>
    );
  }

  // 🌟 Step 1 Screen: Sign In Credentials Form
  return (
    <div className="space-y-8">
      <div className="flex flex-col space-y-2 text-center lg:text-left">
        <h1 className="text-3xl font-bold tracking-tight">Sign in</h1>
        <p className="text-muted-foreground">
          Enter your email and password to access your account
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
        className="space-y-4"
      >
        {/* Email Address */}
        <form.Field name="email">
          {(field) => (
            <div className="space-y-2">
              <Label htmlFor={field.name}>Email address</Label>
              <Input
                id={field.name}
                type="email"
                placeholder="name@example.com"
                value={field.state.value || ""}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                className="h-11"
              />
              <FieldError errors={field.state.meta.errors} />
            </div>
          )}
        </form.Field>

        {/* Password */}
        <form.Field name="password">
          {(field) => (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor={field.name}>Password</Label>
                <Link
                  href="/forgot-password"
                  className="text-xs font-medium text-primary hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <Input
                id={field.name}
                type="password"
                placeholder="••••••••"
                value={field.state.value || ""}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                className="h-11"
              />
              <FieldError errors={field.state.meta.errors} />
            </div>
          )}
        </form.Field>

        {errorMsg && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm font-medium text-destructive">
            {errorMsg}
          </div>
        )}

        <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
          {([, isSubmitting]) => (
            <Button type="submit" className="h-11 w-full text-base" disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                "Sign In"
              )}
            </Button>
          )}
        </form.Subscribe>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link href="/sign-up" className="font-semibold text-primary hover:underline">
          Sign up
        </Link>
      </p>
    </div>
  );
}