// ── CSRF Double-Submit Cookie ─────────────────────────────────────────────
// Generates a random token stored in a JS-readable cookie.
// API mutations must include it as X-CSRF-Token header.

import crypto from "crypto";

export const CSRF_COOKIE = "agdi-csrf";
export const CSRF_HEADER = "x-csrf-token";

/**
 * Generate a random 32-byte hex CSRF token.
 */
export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Validate the CSRF token from a request header against the cookie value.
 * Returns true if both exist and match.
 */
export function validateCsrf(
  cookieValue: string | undefined,
  headerValue: string | undefined,
): boolean {
  if (!cookieValue || !headerValue) return false;
  if (cookieValue.length !== headerValue.length) return false;

  // Constant-time comparison
  let diff = 0;
  for (let i = 0; i < cookieValue.length; i++) {
    diff |= cookieValue.charCodeAt(i) ^ headerValue.charCodeAt(i);
  }
  return diff === 0;
}
