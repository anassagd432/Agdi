import { SignJWT, jwtVerify } from "jose";
import crypto from "crypto";

// ── Config ────────────────────────────────────────────────────────────────
export const COOKIE_NAME = "agdi-session";
export const SESSION_DURATION_HOURS = 12;
export const REFRESH_THRESHOLD_HOURS = 2; // auto-refresh when <2h remaining

function getSecret() {
  const raw = process.env.DASHBOARD_SECRET || process.env.AGDI_GATEWAY_TOKEN;

  if (!raw) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "SECURITY: DASHBOARD_SECRET or AGDI_GATEWAY_TOKEN must be set in production. " +
          "Set one of these environment variables to a strong random string (32+ chars).",
      );
    }
    console.warn(
      "[auth] WARNING: Using insecure dev-only JWT secret. " +
        "Set DASHBOARD_SECRET or AGDI_GATEWAY_TOKEN for production.",
    );
    return new TextEncoder().encode(
      "local-dev-token".padEnd(32, "0").slice(0, 32),
    );
  }

  return new TextEncoder().encode(raw.padEnd(32, "0").slice(0, 32));
}

// ── Fingerprint helpers ───────────────────────────────────────────────────

/**
 * Create a short hash of the user-agent string for fingerprinting.
 * Not meant to be cryptographically secure — just ties the session to a browser.
 */
export function hashUserAgent(ua: string): string {
  return crypto.createHash("sha256").update(ua).digest("hex").slice(0, 16);
}

export interface SessionPayload {
  userId?: string;
  username?: string;
  role: string;
  fpIp?: string; // fingerprint: client IP
  fpUa?: string; // fingerprint: UA hash
  iat?: number;
  exp?: number;
}

// ── Token helpers ─────────────────────────────────────────────────────────

/**
 * Create a signed JWT with embedded session fingerprint.
 */
export async function createSessionToken(opts?: {
  ip?: string;
  ua?: string;
  userId?: string;
  username?: string;
  role?: string;
}): Promise<string> {
  const claims: Record<string, unknown> = {
    role: opts?.role || "admin",
  };

  if (opts?.userId) claims.userId = opts.userId;
  if (opts?.username) claims.username = opts.username;
  if (opts?.ip) claims.fpIp = opts.ip;
  if (opts?.ua) claims.fpUa = hashUserAgent(opts.ua);

  return new SignJWT(claims)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_HOURS}h`)
    .sign(getSecret());
}

/**
 * Verify a session token. Optionally validates fingerprint.
 * Returns the payload or null if invalid/expired/fingerprint mismatch.
 */
export async function verifySessionToken(
  token: string,
  fingerprint?: { ip?: string; ua?: string },
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    const session = payload as unknown as SessionPayload;

    // Fingerprint validation (if present in token)
    if (fingerprint && session.fpUa) {
      const currentUaHash = fingerprint.ua
        ? hashUserAgent(fingerprint.ua)
        : undefined;
      if (currentUaHash && session.fpUa !== currentUaHash) {
        return null; // UA mismatch — possible token theft
      }
    }

    // IP fingerprint: log but don't reject (IPs change with mobile/VPN)
    // The mismatch is tracked in security-log by the middleware

    return session;
  } catch {
    return null;
  }
}

/**
 * Check if a session token needs to be refreshed (sliding window).
 * Returns true if the token has less than REFRESH_THRESHOLD_HOURS remaining.
 */
export function shouldRefreshToken(session: SessionPayload): boolean {
  if (!session.exp) return false;
  const remainingMs = session.exp * 1000 - Date.now();
  return remainingMs < REFRESH_THRESHOLD_HOURS * 60 * 60 * 1000;
}

/**
 * Issue a fresh JWT preserving the role and fingerprint from the old session.
 */
export async function refreshSessionToken(
  oldSession: SessionPayload,
): Promise<string> {
  const claims: Record<string, unknown> = { role: oldSession.role };
  if (oldSession.userId) claims.userId = oldSession.userId;
  if (oldSession.username) claims.username = oldSession.username;
  if (oldSession.fpIp) claims.fpIp = oldSession.fpIp;
  if (oldSession.fpUa) claims.fpUa = oldSession.fpUa;

  return new SignJWT(claims)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_HOURS}h`)
    .sign(getSecret());
}

/**
 * Verify the dashboard access password against the expected token.
 * Uses constant-time comparison to prevent timing attacks.
 */
export function checkPassword(input: string): boolean {
  const expected =
    process.env.DASHBOARD_SECRET || process.env.AGDI_GATEWAY_TOKEN || "";

  if (!expected) {
    if (process.env.NODE_ENV === "production") return false;
    return input === "local-dev-token";
  }

  if (input.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < input.length; i++) {
    diff |= input.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Get the gateway auth token for WebSocket connections.
 */
export function getGatewayToken(): string {
  return (
    process.env.DASHBOARD_SECRET ||
    process.env.AGDI_GATEWAY_TOKEN ||
    (process.env.NODE_ENV !== "production" ? "local-dev-token" : "")
  );
}
