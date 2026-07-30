import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 🌟 Better-Auth এর সেশন কুকি চেক (Better-Auth সাধারণত better-auth.session_token বা session_token নামে কুকি রাখে)
  const sessionToken =
    request.cookies.get("better-auth.session_token")?.value ||
    request.cookies.get("__Secure-better-auth.session_token")?.value;

  const isAuthPage = pathname.startsWith("/sign-in") || pathname.startsWith("/sign-up");
  const isProtectedPage = pathname.startsWith("/chat");

  // ১. সেশন নাই কিন্তু প্রটেক্টেড পেজে ঢুকতে চাচ্ছে -> sign-in পেজে পাঠাও
  if (!sessionToken && isProtectedPage) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  // ২. সেশন আছে কিন্তু লগইন/সাইনআপ পেজে ঢুকতে চাচ্ছে -> chat পেজে পাঠাও
  if (sessionToken && isAuthPage) {
    return NextResponse.redirect(new URL("/chat", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/chat/:path*", "/sign-in", "/sign-up"],
};