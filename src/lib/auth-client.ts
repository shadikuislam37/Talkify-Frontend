import { createAuthClient } from "better-auth/react";
import { API_URL } from "./api";
import { emailOTPClient, twoFactorClient } from "better-auth/client/plugins";
/**
 * Better Auth client. The backend mounts Better Auth at `/api/auth`.
 *
 * `API_URL` is usually a relative path (e.g. `/backend-api`) that is proxied
 * to the real backend through Next.js rewrites (see next.config.mjs), so the
 * session cookie is first-party. Better Auth needs an absolute URL, so the
 * relative path is resolved against the current origin here.
 */
function resolveAuthBaseURL(): string {
  const apiBase = /^https?:\/\//.test(API_URL)
    ? API_URL
    : (typeof window !== "undefined"
        ? window.location.origin
        : "http://localhost:3000") + API_URL;
  return `${apiBase}/api/auth`;
}

export const authClient = createAuthClient({
  baseURL: resolveAuthBaseURL(),
  plugins: [emailOTPClient(), twoFactorClient()],
  fetchOptions: {
    credentials: "include",
  },
});

export const {
  signIn,
  signUp,

  resetPassword,
  verifyEmail,
  signOut,
  useSession,
} = authClient;

export const emailOTP = authClient.emailOtp;
export const twoFactor = authClient.twoFactor; // 👈 2FA হেলপার এক্সপোর্ট
