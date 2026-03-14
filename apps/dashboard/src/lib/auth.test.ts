import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  createSessionToken,
  verifySessionToken,
  checkPassword,
  hashUserAgent,
  getGatewayToken,
} from "./auth";

describe("auth", () => {
  beforeEach(() => {
    vi.stubEnv("DASHBOARD_SECRET", "");
    vi.stubEnv("AGDI_GATEWAY_TOKEN", "");
    vi.stubEnv("NODE_ENV", "development");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("hashUserAgent", () => {
    it("returns a 16-char hex string", () => {
      const hash = hashUserAgent("Mozilla/5.0 Test Browser");
      expect(hash).toHaveLength(16);
      expect(hash).toMatch(/^[0-9a-f]{16}$/);
    });

    it("same UA produces same hash", () => {
      const a = hashUserAgent("TestAgent/1.0");
      const b = hashUserAgent("TestAgent/1.0");
      expect(a).toBe(b);
    });

    it("different UA produces different hash", () => {
      const a = hashUserAgent("TestAgent/1.0");
      const b = hashUserAgent("TestAgent/2.0");
      expect(a).not.toBe(b);
    });
  });

  describe("createSessionToken + verifySessionToken", () => {
    it("creates a valid JWT that can be verified", async () => {
      const token = await createSessionToken();
      const session = await verifySessionToken(token);
      expect(session).not.toBeNull();
      expect(session!.role).toBe("admin");
    });

    it("embeds fingerprint when provided", async () => {
      const token = await createSessionToken({
        ip: "10.0.0.1",
        ua: "TestBrowser/1.0",
      });
      const session = await verifySessionToken(token);
      expect(session).not.toBeNull();
      expect(session!.fpIp).toBe("10.0.0.1");
      expect(session!.fpUa).toBe(hashUserAgent("TestBrowser/1.0"));
    });

    it("rejects a tampered token", async () => {
      const token = await createSessionToken();
      const tampered = token.slice(0, -5) + "XXXXX";
      const session = await verifySessionToken(tampered);
      expect(session).toBeNull();
    });

    it("rejects an empty string", async () => {
      const session = await verifySessionToken("");
      expect(session).toBeNull();
    });

    it("validates fingerprint — rejects UA mismatch", async () => {
      const token = await createSessionToken({
        ip: "10.0.0.1",
        ua: "OriginalBrowser/1.0",
      });
      const session = await verifySessionToken(token, {
        ip: "10.0.0.1",
        ua: "DifferentBrowser/2.0",
      });
      expect(session).toBeNull();
    });

    it("accepts matching fingerprint", async () => {
      const ua = "TestBrowser/3.0";
      const token = await createSessionToken({ ip: "10.0.0.1", ua });
      const session = await verifySessionToken(token, { ip: "10.0.0.1", ua });
      expect(session).not.toBeNull();
      expect(session!.role).toBe("admin");
    });
  });

  describe("checkPassword", () => {
    it("accepts 'local-dev-token' in dev mode", () => {
      expect(checkPassword("local-dev-token")).toBe(true);
    });

    it("rejects wrong password in dev mode", () => {
      expect(checkPassword("wrong")).toBe(false);
    });

    it("rejects everything in production with no secret set", () => {
      vi.stubEnv("NODE_ENV", "production");
      expect(checkPassword("anything")).toBe(false);
    });

    it("accepts correct password when AGDI_GATEWAY_TOKEN is set", () => {
      vi.stubEnv("AGDI_GATEWAY_TOKEN", "my-secret-token");
      expect(checkPassword("my-secret-token")).toBe(true);
    });

    it("rejects wrong password when AGDI_GATEWAY_TOKEN is set", () => {
      vi.stubEnv("AGDI_GATEWAY_TOKEN", "my-secret-token");
      expect(checkPassword("wrong-token")).toBe(false);
    });

    it("uses constant-time comparison (different lengths rejected)", () => {
      vi.stubEnv("AGDI_GATEWAY_TOKEN", "short");
      expect(checkPassword("longer-password")).toBe(false);
    });
  });

  describe("getGatewayToken", () => {
    it("returns 'local-dev-token' in dev mode with no env", () => {
      expect(getGatewayToken()).toBe("local-dev-token");
    });

    it("returns AGDI_GATEWAY_TOKEN when set", () => {
      vi.stubEnv("AGDI_GATEWAY_TOKEN", "real-token");
      expect(getGatewayToken()).toBe("real-token");
    });

    it("returns empty string in production with no env", () => {
      vi.stubEnv("NODE_ENV", "production");
      expect(getGatewayToken()).toBe("");
    });

    it("prefers DASHBOARD_SECRET over AGDI_GATEWAY_TOKEN", () => {
      vi.stubEnv("DASHBOARD_SECRET", "dashboard-secret");
      vi.stubEnv("AGDI_GATEWAY_TOKEN", "gateway-token");
      expect(getGatewayToken()).toBe("dashboard-secret");
    });
  });
});
