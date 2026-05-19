import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const getTailnetHostname = vi.hoisted(() => vi.fn());

vi.mock("../infra/tailscale.js", () => ({ getTailnetHostname }));

import { formatBonjourInstanceName, resolveTailnetDnsHint } from "./server-discovery.js";

describe("formatBonjourInstanceName", () => {
  test("uses Agdi for empty display names", () => {
    expect(formatBonjourInstanceName("  ")).toBe("Agdi");
  });

  test("brands plain machine names as Agdi", () => {
    expect(formatBonjourInstanceName("Studio")).toBe("Studio (Agdi)");
  });

  test("preserves explicitly Agdi-branded names", () => {
    expect(formatBonjourInstanceName("Studio (Agdi)")).toBe("Studio (Agdi)");
  });

  test("preserves legacy OpenClaw-branded names", () => {
    expect(formatBonjourInstanceName("Studio (OpenClaw)")).toBe("Studio (OpenClaw)");
  });
});

describe("resolveTailnetDnsHint", () => {
  const prevTailnetDns = { value: undefined as string | undefined };

  beforeEach(() => {
    prevTailnetDns.value = process.env.OPENCLAW_TAILNET_DNS;
    delete process.env.OPENCLAW_TAILNET_DNS;
    getTailnetHostname.mockClear();
  });

  afterEach(() => {
    if (prevTailnetDns.value === undefined) {
      delete process.env.OPENCLAW_TAILNET_DNS;
    } else {
      process.env.OPENCLAW_TAILNET_DNS = prevTailnetDns.value;
    }
  });

  test("returns env hint when disabled", async () => {
    process.env.OPENCLAW_TAILNET_DNS = "studio.tailnet.ts.net.";
    const value = await resolveTailnetDnsHint({ enabled: false });
    expect(value).toBe("studio.tailnet.ts.net");
    expect(getTailnetHostname).not.toHaveBeenCalled();
  });

  test("skips tailscale lookup when disabled", async () => {
    const value = await resolveTailnetDnsHint({ enabled: false });
    expect(value).toBeUndefined();
    expect(getTailnetHostname).not.toHaveBeenCalled();
  });

  test("uses tailscale lookup when enabled", async () => {
    getTailnetHostname.mockResolvedValue("host.tailnet.ts.net");
    const value = await resolveTailnetDnsHint({ enabled: true });
    expect(value).toBe("host.tailnet.ts.net");
    expect(getTailnetHostname).toHaveBeenCalledTimes(1);
  });
});
