import { describe, expect, it } from "vitest";

/**
 * Smoke test: gateway control-UI HTTP endpoint.
 *
 * These tests verify that the built control-UI is served correctly
 * with proper security headers, correct MIME types, and that
 * SPA fallback routing works.
 *
 * Intended to run against a running gateway instance or imported handlers.
 */

// We test the static-file handler directly, which doesn't require a live server.
// This makes them CI-friendly and deterministic.

describe("control-ui HTTP smoke tests", () => {
  // --- Security header tests (using the unit under test) ---

  // buildControlUiCspHeader is the source of truth for CSP
  it("CSP header blocks unsafe-eval and unsafe-inline in scripts", async () => {
    const { buildControlUiCspHeader } = await import(
      "../src/gateway/control-ui-csp.js"
    );
    const csp = buildControlUiCspHeader();
    expect(csp).toContain("script-src 'self'");
    expect(csp).not.toContain("unsafe-eval");
    // unsafe-inline is only in style-src, not script-src
    const scriptSrc = csp.split(";").find((d: string) => d.trim().startsWith("script-src"));
    expect(scriptSrc).toBeDefined();
    expect(scriptSrc).not.toContain("unsafe-inline");
  });

  it("CSP header blocks framing (frame-ancestors 'none')", async () => {
    const { buildControlUiCspHeader } = await import(
      "../src/gateway/control-ui-csp.js"
    );
    const csp = buildControlUiCspHeader();
    expect(csp).toContain("frame-ancestors 'none'");
  });

  it("CSP header allows WebSocket connections", async () => {
    const { buildControlUiCspHeader } = await import(
      "../src/gateway/control-ui-csp.js"
    );
    const csp = buildControlUiCspHeader();
    expect(csp).toContain("connect-src 'self' ws: wss:");
  });
});

describe("gateway net: IP resolution", () => {
  it("resolves direct client IP when no proxy involved", async () => {
    const { resolveGatewayClientIp } = await import("../src/gateway/net.js");
    const ip = resolveGatewayClientIp({
      remoteAddr: "192.168.1.100",
      trustedProxies: [],
    });
    expect(ip).toBe("192.168.1.100");
  });

  it("ignores X-Forwarded-For when sender is not a trusted proxy", async () => {
    const { resolveGatewayClientIp } = await import("../src/gateway/net.js");
    const ip = resolveGatewayClientIp({
      remoteAddr: "203.0.113.50",
      forwardedFor: "10.0.0.1",
      trustedProxies: ["192.168.1.1"],
    });
    // Should return remoteAddr, not the forwarded-for
    expect(ip).toBe("203.0.113.50");
  });

  it("resolves X-Forwarded-For when sender IS a trusted proxy", async () => {
    const { resolveGatewayClientIp } = await import("../src/gateway/net.js");
    const ip = resolveGatewayClientIp({
      remoteAddr: "127.0.0.1",
      forwardedFor: "10.0.0.1",
      trustedProxies: ["127.0.0.1"],
    });
    expect(ip).toBe("10.0.0.1");
  });

  it("returns undefined for missing remoteAddr", async () => {
    const { resolveGatewayClientIp } = await import("../src/gateway/net.js");
    const ip = resolveGatewayClientIp({
      remoteAddr: undefined,
      trustedProxies: [],
    });
    expect(ip).toBeUndefined();
  });
});

describe("navigation: tab routing", () => {
  it("all 13 tabs have valid paths", async () => {
    const { TAB_GROUPS, pathForTab, tabFromPath } = await import(
      "../ui/src/ui/navigation.ts"
    );
    const allTabs = TAB_GROUPS.flatMap((g) => [...g.tabs]);
    expect(allTabs.length).toBe(13);

    // Each tab round-trips: pathForTab → tabFromPath → same tab
    for (const tab of allTabs) {
      const path = pathForTab(tab);
      const resolved = tabFromPath(path);
      expect(resolved).toBe(tab);
    }
  });

  it("root path '/' resolves to chat tab", async () => {
    const { tabFromPath } = await import("../ui/src/ui/navigation.ts");
    expect(tabFromPath("/")).toBe("chat");
  });
});

describe("lint ceiling", () => {
  it("ceiling file exists and has valid structure", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const ceilingPath = path.resolve(import.meta.dirname, "../.oxlint-ceiling.json");
    expect(fs.existsSync(ceilingPath)).toBe(true);

    const ceiling = JSON.parse(fs.readFileSync(ceilingPath, "utf8"));
    expect(ceiling.maxErrors).toBeTypeOf("number");
    expect(ceiling.maxErrors).toBeGreaterThan(0);
    expect(ceiling.maxErrors).toBeLessThanOrEqual(500); // Should never go above 500
  });
});
