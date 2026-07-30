"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "@tanstack/react-form";
import { signUpSchema, SignUpInput } from "@/schemas/auth.schema";
import { signUp } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, MailCheck } from "lucide-react";

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
  const [errorMsg, setErrorMsg] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [userEmail, setUserEmail] = useState("");

  const form = useForm({
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      password: "",
    } as SignUpInput,
    validators: {
      onChange: signUpSchema, // 🌟 ক্লায়েন্ট সাইড রিয়েল-টাইম ভ্যালিডেশন
    },
    onSubmit: async ({ value }) => {
      setErrorMsg("");
      try {
        const payload = {
          email: value.email,
          password: value.password,
          name: value.name,
          // 🌟 ফোন নম্বর থাকলে ও ট্রিম করলে ভ্যালু থাকলেই কেবল পাঠানো হবে
          phone: value.phone.trim(), // 🌟 সবসময় পাঠানো হচ্ছে
        };

        const { error } = await signUp.email(payload);

        if (error) {
          setErrorMsg(error.message || "Failed to create account!");
          return;
        }

        setUserEmail(value.email);
        setIsSuccess(true);
      } catch (err) {
        console.error("Sign up error:", err);
        setErrorMsg("Something went wrong. Please try again.");
      }
    },
  });

  // 🌟 ইমেইল ভেরিফিকেশন নোটিশ স্ক্রিন
  if (isSuccess) {
    return (
      <div className="space-y-6 text-center py-6">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
          <MailCheck className="h-8 w-8" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">Verify your email</h1>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            We sent a verification link to{" "}
            <span className="font-semibold text-foreground">{userEmail}</span>. 
            Please check your inbox and click the link to activate your account.
          </p>
        </div>
        <div className="pt-4">
          <Link href="/sign-in">
            <Button className="w-full h-11">Go to Sign In</Button>
          </Link>
        </div>
      </div>
    );
  }

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

        {/* Password */}
        <form.Field name="password">
          {(field) => (
            <div className="space-y-2">
              <Label htmlFor={field.name}>Password</Label>
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
              {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "Create Account"}
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