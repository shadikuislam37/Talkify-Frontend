"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "@tanstack/react-form";
import { signInSchema } from "@/schemas/auth.schema";
import { signIn } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { useAuthStore } from "@/store/use-auth-store";

export default function SignInPage() {
  const router = useRouter();
  const [errorMsg, setErrorMsg] = useState("");
  const setAuthUser = useAuthStore((state) => state.setUser);

  const form = useForm({
    defaultValues: {
      email: "",
      password: "",
    },
    // onChange এর বদলে onSubmit ভ্যালিডেশন দেওয়া হলো
    validators: {
      onSubmit: signInSchema,
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

        if (data?.user) {
          setAuthUser(data.user);
        }

        router.push("/chat");
        router.refresh();
      } catch (err) {
        setErrorMsg("Something went wrong. Please try again.");
      }
    },
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col space-y-2 text-center lg:text-left">
        <h1 className="text-3xl font-bold tracking-tight">Welcome back</h1>
        <p className="text-muted-foreground">Enter your credentials to access your account</p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
        className="space-y-5"
      >
        <form.Field
          name="email"
          children={(field) => (
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
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {field.state.meta.errors.map((err: any) => err?.message || err).join(", ")}
                </p>
              )}
            </div>
          )}
        />
        
        <form.Field
          name="password"
          children={(field) => (
            <div className="space-y-2">
              <Label htmlFor={field.name}>Password</Label>
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
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {field.state.meta.errors.map((err: any) => err?.message || err).join(", ")}
                </p>
              )}
            </div>
          )}
        />

        {errorMsg && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm font-medium text-destructive">
            {errorMsg}
          </div>
        )}

        <form.Subscribe
          selector={(state) => [state.canSubmit, state.isSubmitting]}
          children={([canSubmit, isSubmitting]) => (
            <Button type="submit" className="h-11 w-full text-base" disabled={!canSubmit || isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "Sign In"}
            </Button>
          )}
        />
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