"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "@tanstack/react-form";
import { signUpSchema } from "@/schemas/auth.schema";
import { signUp } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { useAuthStore } from "@/store/use-auth-store";

export default function SignUpPage() {
  const router = useRouter();
  const [errorMsg, setErrorMsg] = useState("");
  const setAuthUser = useAuthStore((state) => state.setUser);

  const form = useForm({
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      password: "",
    },
    validators: {
      onSubmit: signUpSchema,
    },
    onSubmit: async ({ value }) => {
      setErrorMsg("");
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await signUp.email({
          email: value.email,
          password: value.password,
          name: value.name,
          phone: value.phone,
        } as any);

        if (error) {
          setErrorMsg(error.message || "Failed to create account!");
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
        <form.Field
          name="name"
          children={(field) => (
            <div className="space-y-2">
              <Label htmlFor={field.name}>Full Name</Label>
              <Input
                id={field.name}
                type="text"
                placeholder="John Doe"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                className="h-11"
              />
              {field.state.meta.errors.length > 0 && (
                <p className="text-sm font-medium text-destructive mt-1">
                  {field.state.meta.errors
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    .map((err: any) => (typeof err === "string" ? err : err?.message || JSON.stringify(err)))
                    .join(", ")}
                </p>
              )}
            </div>
          )}
        />

        {/* Phone Number */}
        <form.Field
          name="phone"
          children={(field) => (
            <div className="space-y-2">
              <Label htmlFor={field.name}>Phone Number</Label>
              <Input
                id={field.name}
                type="tel"
                placeholder="017XXXXXXXX"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                className="h-11"
              />
              {field.state.meta.errors.length > 0 && (
                <p className="text-sm font-medium text-destructive mt-1">
                  {field.state.meta.errors
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    .map((err: any) => (typeof err === "string" ? err : err?.message || JSON.stringify(err)))
                    .join(", ")}
                </p>
              )}
            </div>
          )}
        />

        {/* Email Address */}
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
                  {field.state.meta.errors
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    .map((err: any) => (typeof err === "string" ? err : err?.message || JSON.stringify(err)))
                    .join(", ")}
                </p>
              )}
            </div>
          )}
        />
        
        {/* Password */}
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
                  {field.state.meta.errors
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    .map((err: any) => (typeof err === "string" ? err : err?.message || JSON.stringify(err)))
                    .join(", ")}
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
            <Button type="submit" className="h-11 w-full text-base" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "Create Account"}
            </Button>
          )}
        />
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