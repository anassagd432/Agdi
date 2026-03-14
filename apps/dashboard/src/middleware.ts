import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  verifySessionToken,
  shouldRefreshToken,
  refreshSessionToken,
  COOKIE_NAME,
  SESSION_DURATION_HOURS,
} from "@/lib/auth";
import { CSRF_COOKIE, CSRF_HEADER, validateCsrf } from "@/lib/csrf";
import { logSecurityEvent } from "@/lib/security-log";

// ── Public paths (no auth required) ──────────────────────────────────────
const PUBLIC_PATHS = [
  "/login",
  "/api/auth/login",
  "/api/auth/logout",
  "/api/health",
  "/_next",
  "/favicon.ico",
];

// ── API paths exempt from CSRF (pre-auth) ────────────────────────────────
const CSRF_EXEMPT = ["/api/auth/login", "/api/auth/logout"];

// ── Mutating HTTP methods that require CSRF ──────────────────────────────
const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

// ── Max request body size (1 MB) ─────────────────────────────────────────
const MAX_BODY_BYTES = 1_048_576;

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const method = request.method;

  // ── 1. Allow public paths ──────────────────────────────────────────────
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // ── 2. Input sanitization for API routes ───────────────────────────────
  if (pathname.startsWith("/api/") && MUTATING_METHODS.has(method)) {
    // Reject oversized payloads
    const contentLength = request.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > MAX_BODY_BYTES) {
      logSecurityEvent("input_rejected", {
        ip: getIp(request),
        detail: `Payload too large: ${contentLength} bytes`,
      });
      return NextResponse.json(
        { error: "Request body too large. Maximum 1MB allowed." },
        { status: 413 },
      );
    }

    // Require JSON content-type for API mutations
    const ct = request.headers.get("content-type") || "";
    if (!ct.includes("application/json") && !ct.includes("multipart/form-data")) {
      logSecurityEvent("input_rejected", {
        ip: getIp(request),
        detail: `Invalid content-type: ${ct}`,
      });
      return NextResponse.json(
        { error: "Content-Type must be application/json." },
        { status: 415 },
      );
    }
  }

  // ── 3. Session authentication ──────────────────────────────────────────
  const token = request.cookies.get(COOKIE_NAME)?.value;

  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Verify JWT with fingerprint
  const ua = request.headers.get("user-agent") || "";
  const ip = getIp(request);
  const session = await verifySessionToken(token, { ip, ua });

  if (!session) {
    logSecurityEvent("session_fingerprint_mismatch", {
      ip,
      ua,
      detail: "JWT verification failed — possible token theft or expiry",
    });
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete(COOKIE_NAME);
    response.cookies.delete(CSRF_COOKIE);
    return response;
  }

  // ── 4. Role-based access control ───────────────────────────────────────
  // Viewers are read-only: they cannot use mutating API endpoints
  if (session.role === "viewer") {
    // Admin-only routes
    if (pathname.startsWith("/api/users")) {
      return NextResponse.json(
        { error: "Admin access required." },
        { status: 403 },
      );
    }

    // Block all mutating API calls for viewers
    if (pathname.startsWith("/api/") && MUTATING_METHODS.has(method)) {
      return NextResponse.json(
        { error: "Read-only access. Contact an admin for write permissions." },
        { status: 403 },
      );
    }
  }

  // ── 5. CSRF validation for mutating API routes ─────────────────────────
  if (
    pathname.startsWith("/api/") &&
    MUTATING_METHODS.has(method) &&
    !CSRF_EXEMPT.some((p) => pathname.startsWith(p))
  ) {
    const csrfCookie = request.cookies.get(CSRF_COOKIE)?.value;
    const csrfHeader = request.headers.get(CSRF_HEADER);

    if (!validateCsrf(csrfCookie, csrfHeader ?? undefined)) {
      logSecurityEvent("csrf_rejected", {
        ip,
        detail: `CSRF validation failed on ${method} ${pathname}`,
      });
      return NextResponse.json(
        { error: "CSRF token missing or invalid." },
        { status: 403 },
      );
    }
  }

  // ── 5. Sliding window session refresh ──────────────────────────────────
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-agdi-role", session.role);

  let response = NextResponse.next({ request: { headers: requestHeaders } });

  if (shouldRefreshToken(session)) {
    try {
      const newToken = await refreshSessionToken(session);
      response.cookies.set(COOKIE_NAME, newToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: SESSION_DURATION_HOURS * 60 * 60,
        path: "/",
      });
      logSecurityEvent("session_refreshed", { ip });
    } catch (e) {
      // If refresh fails, the old token is still valid — just don't refresh
      console.warn("[auth] Session refresh failed:", e);
    }
  }

  return response;
}

// ── Helpers ──────────────────────────────────────────────────────────────
function getIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
