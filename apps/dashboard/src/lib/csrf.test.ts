import { describe, it, expect } from "vitest";
import { generateCsrfToken, validateCsrf } from "./csrf";

describe("csrf", () => {
  describe("generateCsrfToken", () => {
    it("returns a 64-char hex string", () => {
      const token = generateCsrfToken();
      expect(token).toHaveLength(64);
      expect(token).toMatch(/^[0-9a-f]{64}$/);
    });

    it("generates unique tokens each time", () => {
      const a = generateCsrfToken();
      const b = generateCsrfToken();
      expect(a).not.toBe(b);
    });
  });

  describe("validateCsrf", () => {
    it("returns true when cookie and header match", () => {
      const token = generateCsrfToken();
      expect(validateCsrf(token, token)).toBe(true);
    });

    it("returns false when values differ", () => {
      const a = generateCsrfToken();
      const b = generateCsrfToken();
      expect(validateCsrf(a, b)).toBe(false);
    });

    it("returns false when cookie is undefined", () => {
      expect(validateCsrf(undefined, "abc")).toBe(false);
    });

    it("returns false when header is undefined", () => {
      expect(validateCsrf("abc", undefined)).toBe(false);
    });

    it("returns false when both are undefined", () => {
      expect(validateCsrf(undefined, undefined)).toBe(false);
    });

    it("returns false for different lengths", () => {
      expect(validateCsrf("short", "longvalue")).toBe(false);
    });

    it("returns false for empty strings", () => {
      expect(validateCsrf("", "")).toBe(false);
    });

    it("is constant-time (same-length wrong values don't short-circuit)", () => {
      // Just verify correctness — timing attacks need benchmarks
      const token = "a".repeat(64);
      const wrong = "b".repeat(64);
      expect(validateCsrf(token, wrong)).toBe(false);
    });
  });
});
