// ── CSRF Protection ───────────────────────────────────────────────────────
// Double-submit cookie pattern (Edge-compatible).

export const CSRF_COOKIE = "agdi-csrf";
export const CSRF_HEADER = "x-csrf-token";

function generateToken(): string {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function createCsrfToken(): string {
  return generateToken();
}

export function validateCsrf(cookieVal: string | undefined, headerVal: string | null): boolean {
  if (!cookieVal || !headerVal) return false;
  return cookieVal === headerVal;
}
