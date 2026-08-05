"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "@tanstack/react-form";
import { signUpSchema, SignUpInput } from "@/schemas/auth.schema";
import { signUp, emailOTP } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, KeyRound, ArrowLeft, Eye, EyeOff } from "lucide-react";

// 🌟 এরর মেসেজ দেখানোর জন্য ছোট রি-ইউজেবল কম্পোনেন্ট
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

export default function SignUpPage() {
  const [step, setStep] = useState<"FORM" | "OTP">("FORM");
  const [errorMsg, setErrorMsg] = useState("");
  const [userEmail, setUserEmail] = useState("");

  // 🌟 OTP স্ক্রিনের জন্য স্টেট
  const [otp, setOtp] = useState("");
  const [verifyingOtp, setVerifyingOtp] = useState(false);

  // 🌟 পাসওয়ার্ড শো/হাইড টগল করার স্টেট (দুটো ফিল্ডের জন্য আলাদা)
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const router = useRouter();

  // 🌟 Step 1: SignUp Form (TanStack Form)
  // confirmPassword এখন signUpSchema-র .refine() দিয়েই ভ্যালিডেট হয়,
  // তাই আলাদা local state/manual check-এর দরকার নেই
  const form = useForm({
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      password: "",
      confirmPassword: "",
    } as SignUpInput,
    validators: {
      onChange: signUpSchema,
    },
    onSubmit: async ({ value }) => {
      setErrorMsg("");

      try {
        const payload = {
          email: value.email,
          password: value.password,
          name: value.name,
          phone: value.phone.trim(),
        };

        // ১. একাউন্ট ক্রিয়েট করা
        const { error } = await signUp.email(payload);

        if (error) {
          setErrorMsg(error.message || "Failed to create account!");
          return;
        }

        // ২. ইমেইলে OTP পাঠানো
        await emailOTP.sendVerificationOtp({
          email: value.email,
          type: "email-verification",
        });

        setUserEmail(value.email);
        setStep("OTP"); // 🌟 OTP স্ক্রিনে ট্রান্সফার
      } catch (err) {
        console.error("Sign up error:", err);
        setErrorMsg("Something went wrong. Please try again.");
      }
    },
  });

  // 🌟 Step 2: Verify OTP Submit Handler
  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || otp.length < 6) {
      setErrorMsg("Please enter a valid 6-digit OTP");
      return;
    }

    setVerifyingOtp(true);
    setErrorMsg("");

    try {
      const { error } = await emailOTP.verifyEmail({
        email: userEmail,
        otp: otp,
      });

      if (error) {
        setErrorMsg(error.message || "Invalid OTP code!");
      } else {
        router.push("/sign-in?verified=true");
      }
    } catch (err) {
      console.error("OTP Verification error:", err);
      setErrorMsg("Verification failed. Please try again.");
    } finally {
      setVerifyingOtp(false);
    }
  };

  // 🌟 Step 2: OTP Verification UI Screen
  if (step === "OTP") {
    return (
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <KeyRound className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Verify Your Email</h1>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            We sent a 6-digit OTP code to{" "}
            <span className="font-semibold text-foreground">{userEmail}</span>.
          </p>
        </div>

        <form onSubmit={handleVerifyOTP} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="otp">Enter 6-Digit OTP Code</Label>
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
            {verifyingOtp ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "Verify & Complete Registration"}
          </Button>

          <Button
            type="button"
            variant="ghost"
            className="w-full h-10"
            onClick={() => {
              setStep("FORM");
              setErrorMsg("");
            }}
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Edit Details
          </Button>
        </form>
      </div>
    );
  }

  // 🌟 Step 1: Sign Up Form UI
  return (
    <div className="space-y-8">
      <div className="flex flex-col space-y-2 text-center lg:text-left">
        <h1 className="text-3xl font-bold tracking-tight">Create an account</h1>
        <p className="text-muted-foreground">Enter your details to get started</p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
        className="space-y-4"
      >
        {/* Full Name */}
        <form.Field name="name">
          {(field) => (
            <div className="space-y-2">
              <Label htmlFor={field.name}>Full Name</Label>
              <Input
                id={field.name}
                type="text"
                placeholder="John Doe"
                value={field.state.value || ""}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                className="h-11"
              />
              <FieldError errors={field.state.meta.errors} />
            </div>
          )}
        </form.Field>

        {/* Phone Number */}
        <form.Field name="phone">
          {(field) => (
            <div className="space-y-2">
              <Label htmlFor={field.name}>Phone Number</Label>
              <Input
                id={field.name}
                type="tel"
                placeholder="017XXXXXXXX"
                value={field.state.value || ""}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                className="h-11"
              />
              <FieldError errors={field.state.meta.errors} />
            </div>
          )}
        </form.Field>

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

        {/* Password — eye icon টগল সহ */}
        <form.Field name="password">
          {(field) => (
            <div className="space-y-2">
              <Label htmlFor={field.name}>Password</Label>
              <div className="relative">
                <Input
                  id={field.name}
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={field.state.value || ""}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  className="h-11 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  tabIndex={-1}
                  className="absolute right-0 top-0 h-11 w-10 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <FieldError errors={field.state.meta.errors} />
            </div>
          )}
        </form.Field>

        {/* Confirm Password — eye icon টগল সহ, schema-র .refine() দিয়ে ভ্যালিডেটেড */}
        <form.Field name="confirmPassword">
          {(field) => (
            <div className="space-y-2">
              <Label htmlFor={field.name}>Confirm Password</Label>
              <div className="relative">
                <Input
                  id={field.name}
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={field.state.value || ""}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  className="h-11 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  tabIndex={-1}
                  className="absolute right-0 top-0 h-11 w-10 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                  title={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
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
              {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "Create Account & Get OTP"}
            </Button>
          )}
        </form.Subscribe>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/sign-in" className="font-semibold text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}