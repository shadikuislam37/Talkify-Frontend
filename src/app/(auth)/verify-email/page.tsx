"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { verifyEmail } from "@/lib/auth-client";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { useAuthStore } from "@/store/use-auth-store";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const router = useRouter();
  const updateEmailVerification = useAuthStore((state) => state.updateEmailVerification);

  // 🌟 1. Initial state-এই Token চেক করা হয়েছে (Cascading Render Error ফিক্স)
  const [isLoading, setIsLoading] = useState(Boolean(token));
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState(
    token ? "" : "Invalid or missing verification token."
  );

  useEffect(() => {
    if (!token) return;

    let isMounted = true;

    const handleVerification = async () => {
      try {
        const { error } = await verifyEmail({
          query: { token },
        });

        if (!isMounted) return;

        if (error) {
          setErrorMsg(error.message || "Failed to verify email. The link may have expired.");
          setIsSuccess(false);
        } else {
          // 🌟 2. Zustand Store আপডেট করা
          updateEmailVerification(true);
          setIsSuccess(true);

          setTimeout(() => {
            router.push("/sign-in");
          }, 3000);
        }
      } catch {
        if (isMounted) {
          setErrorMsg("Something went wrong while verifying your email.");
          setIsSuccess(false);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    handleVerification();

    return () => {
      isMounted = false;
    };
  }, [token, router, updateEmailVerification]);

  return (
    <Card className="w-full max-w-md mx-auto shadow-lg border-border">
      <CardHeader className="text-center pb-4">
        <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          {isLoading ? (
            <Loader2 className="h-7 w-7 animate-spin text-primary" />
          ) : isSuccess ? (
            <CheckCircle2 className="h-7 w-7 text-emerald-500" />
          ) : (
            <XCircle className="h-7 w-7 text-destructive" />
          )}
        </div>
        <CardTitle className="text-2xl font-bold">
          {isLoading
            ? "Verifying Email..."
            : isSuccess
            ? "Email Verified!"
            : "Verification Failed"}
        </CardTitle>
        <CardDescription className="text-sm">
          {isLoading
            ? "Please wait while we confirm your email address."
            : isSuccess
            ? "Your email has been successfully verified."
            : "We couldn't verify your email address."}
        </CardDescription>
      </CardHeader>

      <CardContent className="text-center text-sm">
        {isLoading && (
          <p className="text-muted-foreground animate-pulse">
            Connecting to server...
          </p>
        )}

        {isSuccess && (
          <div className="rounded-md bg-emerald-500/10 p-3 text-emerald-600 dark:text-emerald-400 font-medium">
            Redirecting to Sign In page in 3 seconds...
          </div>
        )}

        {!isLoading && !isSuccess && (
          <div className="rounded-md bg-destructive/10 p-3 text-destructive font-medium">
            {errorMsg}
          </div>
        )}
      </CardContent>

      <CardFooter className="flex justify-center pt-2">
        {!isLoading && (
          <Link href="/sign-in" className="w-full">
            <Button className="w-full h-11" variant={isSuccess ? "default" : "outline"}>
              {isSuccess ? "Go to Sign In Now" : "Back to Sign In"}
            </Button>
          </Link>
        )}
      </CardFooter>
    </Card>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <Card className="w-full max-w-md mx-auto shadow-lg p-8 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="mt-2 text-sm text-muted-foreground">Loading verification page...</p>
        </Card>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}