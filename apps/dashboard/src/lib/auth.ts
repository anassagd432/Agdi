// ── Auth helpers ──────────────────────────────────────────────────────────
// JWT + session validation. Edge-compatible (no Node.js crypto).

const JWT_SECRET = process.env.JWT_SECRET || "agdi-dashboard-dev-secret";
const TOKEN_TTL = 24 * 60 * 60 * 1000; // 24h

export interface JwtPayload {
  sub: string;
  role: "admin" | "viewer";
  iat: number;
  exp: number;
}

function base64url(data: string): string {
  return btoa(data).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64urlDecode(data: string): string {
  const padded = data.replace(/-/g, "+").replace(/_/g, "/");
  return atob(padded);
}

export function createJwt(sub: string, role: "admin" | "viewer"): string {
  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const now = Date.now();
  const payload = base64url(
    JSON.stringify({ sub, role, iat: now, exp: now + TOKEN_TTL }),
  );
  // Simplified HMAC — in production use Web Crypto API
  const sig = base64url(JWT_SECRET + "." + header + "." + payload);
  return `${header}.${payload}.${sig}`;
}

export function verifyJwt(token: string): JwtPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(base64urlDecode(parts[1])) as JwtPayload;
    if (payload.exp < Date.now()) return null;
    // Verify signature
    const expectedSig = base64url(JWT_SECRET + "." + parts[0] + "." + parts[1]);
    if (parts[2] !== expectedSig) return null;
    return payload;
  } catch {
    return null;
  }
}

export const AUTH_COOKIE = "agdi-token";
