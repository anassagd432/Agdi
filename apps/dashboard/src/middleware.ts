import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  verifyJwt,
  AUTH_COOKIE,
} from "@/lib/auth";
import { CSRF_COOKIE, CSRF_HEADER, validateCsrf } from "@/lib/csrf";
import { logSecurityEvent } from "@/lib/security-log";

const PUBLIC_PATHS = ["/login", "/api/auth/login", "/api/auth/refresh"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip public paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Skip static assets
  if (pathname.startsWith("/_next") || pathname.startsWith("/favicon") || pathname === "/manifest.json") {
    return NextResponse.next();
  }

  // Check JWT auth
  const token = request.cookies.get(AUTH_COOKIE)?.value;
  if (!token) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const payload = verifyJwt(token);
  if (!payload) {
    logSecurityEvent("session_fingerprint_mismatch", {
      ip: request.headers.get("x-forwarded-for") || "unknown",
    });
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // CSRF check for mutations
  if (["POST", "PUT", "PATCH", "DELETE"].includes(request.method)) {
    const csrfCookie = request.cookies.get(CSRF_COOKIE)?.value;
    const csrfHeader = request.headers.get(CSRF_HEADER);
    if (!validateCsrf(csrfCookie, csrfHeader)) {
      logSecurityEvent("csrf_rejected", {
        ip: request.headers.get("x-forwarded-for") || "unknown",
      });
      return NextResponse.json({ error: "CSRF validation failed" }, { status: 403 });
    }
  }

  // Redirect root to dashboard
  if (pathname === "/") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
