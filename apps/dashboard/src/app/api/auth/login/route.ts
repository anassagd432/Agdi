import { NextResponse } from "next/server";
import {
  checkPassword,
  createSessionToken,
  COOKIE_NAME,
  SESSION_DURATION_HOURS,
} from "@/lib/auth";
import { generateCsrfToken, CSRF_COOKIE } from "@/lib/csrf";
import { logSecurityEvent } from "@/lib/security-log";

// ── In-memory rate limiter ────────────────────────────────────────────────
interface RateLimitEntry {
  attempts: number;
  firstAttempt: number;
  lockedUntil: number;
}

const loginAttempts = new Map<string, RateLimitEntry>();

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;
const LOCKOUT_MS = 30 * 60 * 1000;
const LOCKOUT_THRESHOLD = 10;

function cleanupStaleEntries() {
  const now = Date.now();
  for (const [key, entry] of Array.from(loginAttempts)) {
    if (now - entry.firstAttempt > WINDOW_MS && now > entry.lockedUntil) {
      loginAttempts.delete(key);
    }
  }
}

function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const real = request.headers.get("x-real-ip");
  if (real) return real;
  return "unknown";
}

function checkRateLimit(
  ip: string,
): { allowed: boolean; retryAfterSecs?: number } {
  const now = Date.now();
  const entry = loginAttempts.get(ip);

  if (!entry) return { allowed: true };

  if (entry.lockedUntil > now) {
    return {
      allowed: false,
      retryAfterSecs: Math.ceil((entry.lockedUntil - now) / 1000),
    };
  }

  if (now - entry.firstAttempt > WINDOW_MS) {
    loginAttempts.delete(ip);
    return { allowed: true };
  }

  if (entry.attempts >= MAX_ATTEMPTS) {
    const retryAfter = Math.ceil(
      (entry.firstAttempt + WINDOW_MS - now) / 1000,
    );
    return { allowed: false, retryAfterSecs: retryAfter };
  }

  return { allowed: true };
}

function recordFailedAttempt(ip: string) {
  const now = Date.now();
  const entry = loginAttempts.get(ip);

  if (!entry || now - entry.firstAttempt > WINDOW_MS) {
    loginAttempts.set(ip, { attempts: 1, firstAttempt: now, lockedUntil: 0 });
    return;
  }

  entry.attempts += 1;

  if (entry.attempts >= LOCKOUT_THRESHOLD) {
    entry.lockedUntil = now + LOCKOUT_MS;
    logSecurityEvent("login_locked_out", {
      ip,
      detail: `Locked for 30min after ${entry.attempts} failed attempts`,
    });
  }
}

function clearAttempts(ip: string) {
  loginAttempts.delete(ip);
}

// ── Route handler ─────────────────────────────────────────────────────────
export async function POST(request: Request) {
  if (loginAttempts.size > 100) cleanupStaleEntries();

  const ip = getClientIp(request);
  const ua = request.headers.get("user-agent") || "";
  const rateCheck = checkRateLimit(ip);

  if (!rateCheck.allowed) {
    logSecurityEvent("login_rate_limited", { ip, ua });
    return NextResponse.json(
      { error: "Too many login attempts. Please try again later." },
      {
        status: 429,
        headers: { "Retry-After": String(rateCheck.retryAfterSecs ?? 60) },
      },
    );
  }

  try {
    const body = await request.json();
    const { password, username } = body;

    if (!password || typeof password !== "string") {
      return NextResponse.json(
        { error: "Password is required." },
        { status: 400 },
      );
    }

    // ── Multi-user auth: try username + password ─────────────────────────
    let userId: string | undefined;
    let userRole: string = "admin";
    let loginUsername: string = username || "admin";
    let authenticated = false;

    if (username && typeof username === "string") {
      // New flow: authenticate via user store
      const { authenticateUser } = await import("@/lib/users");
      const user = await authenticateUser(username, password);
      if (user) {
        authenticated = true;
        userId = user.id;
        userRole = user.role;
        loginUsername = user.username;
      }
    }

    // ── Legacy fallback: token-only auth (no username) ───────────────────
    if (!authenticated) {
      if (checkPassword(password)) {
        authenticated = true;
        loginUsername = "admin";
        userRole = "admin";
      }
    }

    if (!authenticated) {
      recordFailedAttempt(ip);
      logSecurityEvent("login_failed", { ip, ua, detail: `user: ${loginUsername}` });
      const entry = loginAttempts.get(ip);
      const delay = Math.min(400 * (entry?.attempts ?? 1), 5000);
      await new Promise((r) => setTimeout(r, delay));
      return NextResponse.json(
        { error: "Invalid credentials." },
        { status: 401 },
      );
    }

    // Success
    clearAttempts(ip);
    logSecurityEvent("login_success", { ip, ua, detail: `user: ${loginUsername} role: ${userRole}` });

    // Create JWT with fingerprint + user info
    const token = await createSessionToken({
      ip,
      ua,
      userId,
      username: loginUsername,
      role: userRole,
    });

    // Generate CSRF token
    const csrfToken = generateCsrfToken();

    const response = NextResponse.json({ ok: true });

    // Session cookie (httpOnly — not readable by JS)
    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: SESSION_DURATION_HOURS * 60 * 60,
      path: "/",
    });

    // CSRF cookie (NOT httpOnly — must be readable by JS to include in headers)
    response.cookies.set(CSRF_COOKIE, csrfToken, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: SESSION_DURATION_HOURS * 60 * 60,
      path: "/",
    });

    return response;
  } catch {
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 },
    );
  }
}
