"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "@tanstack/react-form";
import { forgotPasswordSchema } from "@/schemas/auth.schema";
import { emailOTP, authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, KeyRound, ArrowLeft, RefreshCw } from "lucide-react";
import { toast } from "sonner"; // 🌟 Shadcn Sonner Toast ইম্পোর্ট করা হলো

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

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<"EMAIL" | "OTP">("EMAIL");
  const [errorMsg, setErrorMsg] = useState("");
  const [userEmail, setUserEmail] = useState("");

  // Step 2 States
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [resendingOtp, setResendingOtp] = useState(false);

  // Step 1: Send Reset OTP Form
  const form = useForm({
    defaultValues: {
      email: "",
    },
    validators: {
      onChange: forgotPasswordSchema,
    },
    onSubmit: async ({ value }) => {
      setErrorMsg("");
      try {
        const { error } = await emailOTP.sendVerificationOtp({
          email: value.email,
          type: "forget-password",
        });

        if (error) {
          const msg = error.message || "Failed to send OTP code.";
          setErrorMsg(msg);
          toast.error(msg);
          return;
        }

        setUserEmail(value.email);
        setStep("OTP");
        toast.success("Reset OTP code sent to your email! 📩");
      } catch (err) {
        console.error("Forgot password error:", err);
        const msg = "Something went wrong. Please try again.";
        setErrorMsg(msg);
        toast.error(msg);
      }
    },
  });

  // Resend OTP Handler
  const handleResendOTP = async () => {
    setResendingOtp(true);
    setErrorMsg("");
    try {
      const { error } = await emailOTP.sendVerificationOtp({
        email: userEmail,
        type: "forget-password",
      });

      if (error) {
        const msg = error.message || "Failed to resend OTP.";
        setErrorMsg(msg);
        toast.error(msg);
      } else {
        toast.success("A new OTP code has been sent to your email!");
      }
    } catch (err) {
      console.error("Resend OTP error:", err);
      toast.error("Failed to resend OTP.");
    } finally {
      setResendingOtp(false);
    }
  };

  // Step 2: Reset Password Handler
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || otp.length < 6) {
      const msg = "Please enter a valid 6-digit OTP";
      setErrorMsg(msg);
      toast.error(msg);
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      const msg = "Password must be at least 6 characters long.";
      setErrorMsg(msg);
      toast.error(msg);
      return;
    }

    setVerifying(true);
    setErrorMsg("");

    try {
      const { error } = await authClient.emailOtp.resetPassword({
        email: userEmail,
        otp: otp,
        password: newPassword,
      });

      if (error) {
        const msg = error.message || "Invalid OTP code or reset failed!";
        setErrorMsg(msg);
        toast.error(msg);
      } else {
        toast.success("Password reset successfully! Please sign in with your new password. 🎉");
        router.push("/sign-in?reset=success");
      }
    } catch (err) {
      console.error("Reset password OTP error:", err);
      const msg = "Something went wrong. Please try again.";
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setVerifying(false);
    }
  };

  // Step 2 UI: OTP & New Password Entry
  if (step === "OTP") {
    return (
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <KeyRound className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Reset Your Password</h1>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            We sent a 6-digit reset OTP to{" "}
            <span className="font-semibold text-foreground">{userEmail}</span>.
          </p>
        </div>

        <form onSubmit={handleResetPassword} className="space-y-4">
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

          <div className="space-y-2">
            <Label htmlFor="newPassword">New Password</Label>
            <Input
              id="newPassword"
              type="password"
              placeholder="••••••••"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="h-11"
              required
            />
          </div>

          {errorMsg && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm font-medium text-destructive">
              {errorMsg}
            </div>
          )}

          <Button type="submit" className="w-full h-11 text-base" disabled={verifying}>
            {verifying ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "Set New Password"}
          </Button>

          <div className="flex items-center justify-between pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setStep("EMAIL");
                setErrorMsg("");
              }}
            >
              <ArrowLeft className="mr-2 h-4 w-4" /> Change Email
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

  // Step 1 UI: Request OTP Email Form
  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center lg:text-left">
        <h1 className="text-3xl font-bold tracking-tight">Forgot password?</h1>
        <p className="text-muted-foreground">
          Enter your email address to receive a 6-digit OTP code
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
                "Send Reset OTP"
              )}
            </Button>
          )}
        </form.Subscribe>
      </form>

      <div className="text-center">
        <Link
          href="/sign-in"
          className="text-sm font-medium text-primary hover:underline inline-flex items-center"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Sign In
        </Link>
      </div>
    </div>
  );
}