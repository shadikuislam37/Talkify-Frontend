"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "@tanstack/react-form";
import { signIn, useSession } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { useAuthStore } from "@/store/use-auth-store";
import { AuthUser } from "@/types";


export function ProfileHeader() {
  const { data: session } = useSession();
  
  // Auth response থেকে আসা user-কে আপনার App User টাইপে কাস্ট/কনভার্ট করা
  const currentUser: AuthUser | undefined = session?.user ? {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    image: session.user.image,
  } : undefined;

  return <div>{currentUser?.name}</div>;
}


export default function SignInPage() {
  const router = useRouter();
  const [errorMsg, setErrorMsg] = useState("");
  const setUser = useAuthStore((state) => state.setUser);

  const form = useForm({
    defaultValues: {
      email: "",
      password: "",
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

    // 🌟 যদি ব্যাকএন্ড থেকে ২FA OTP চাওয়া হয়
    if ((data as unknown as { twoFactorRedirect?: boolean })?.twoFactorRedirect) {
      router.push(`/verify-otp?email=${encodeURIComponent(value.email)}`);
      return;
    }

    if (data?.user) {
      setUser(data.user as unknown as Parameters<typeof setUser>[0]);
    }

    router.push("/chat");
    router.refresh();
  } catch {
    setErrorMsg("Something went wrong. Please try again.");
  }
}
  });

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
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                className="h-11"
              />
              {field.state.meta.errors.length > 0 && (
                <p className="text-sm font-medium text-destructive mt-1">
                  {field.state.meta.errors
                    .map((err) =>
                      typeof err === "string"
                        ? err
                        : (err as unknown as { message?: string })?.message || String(err)
                    )
                    .join(", ")}
                </p>
              )}
            </div>
          )}
        </form.Field>

        {/* Password */}
        <form.Field name="password">
          {(field) => (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor={field.name}>Password</Label>
              </div>
              <Input
                id={field.name}
                type="password"
                placeholder="••••••••"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                className="h-11"
              />
              {field.state.meta.errors.length > 0 && (
                <p className="text-sm font-medium text-destructive mt-1">
                  {field.state.meta.errors
                    .map((err) =>
                      typeof err === "string"
                        ? err
                        : (err as unknown as { message?: string })?.message || String(err)
                    )
                    .join(", ")}
                </p>
              )}
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