import { describe, it, expect } from "vitest";
import { logSecurityEvent, getSecurityEvents } from "./security-log";

// Note: the module uses a singleton buffer + JSONL file, so tests see accumulated state.
// We test in order, accounting for that.

describe("security-log", () => {
  it("logs an event and retrieves it", async () => {
    const beforeCount = (await getSecurityEvents()).length;
    logSecurityEvent("login_success", { ip: "1.2.3.4" });
    const events = await getSecurityEvents();
    expect(events.length).toBe(beforeCount + 1);
    expect(events[0].type).toBe("login_success");
    expect(events[0].ip).toBe("1.2.3.4");
  });

  it("events are returned newest-first", async () => {
    logSecurityEvent("login_failed", { ip: "5.6.7.8" });
    logSecurityEvent("csrf_rejected", { ip: "9.0.1.2" });
    const events = await getSecurityEvents();
    expect(events[0].type).toBe("csrf_rejected");
    expect(events[1].type).toBe("login_failed");
  });

  it("truncates UA to 120 chars", async () => {
    const longUa = "X".repeat(200);
    logSecurityEvent("ws_connected", { ua: longUa });
    const events = await getSecurityEvents();
    expect(events[0].ua!.length).toBeLessThanOrEqual(120);
  });

  it("truncates detail to 256 chars", async () => {
    const longDetail = "D".repeat(500);
    logSecurityEvent("input_rejected", { detail: longDetail });
    const events = await getSecurityEvents();
    expect(events[0].detail!.length).toBeLessThanOrEqual(256);
  });

  it("each event has a unique id and timestamp", async () => {
    logSecurityEvent("login_success");
    logSecurityEvent("login_success");
    const events = await getSecurityEvents();
    expect(events[0].id).not.toBe(events[1].id);
    expect(events[0].ts).toBeGreaterThan(0);
  });

  it("respects max events cap (500)", async () => {
    // Add 510 events to push past the cap
    for (let i = 0; i < 510; i++) {
      logSecurityEvent("login_failed", { detail: `attempt-${i}` });
    }
    const events = await getSecurityEvents();
    expect(events.length).toBeLessThanOrEqual(500);
  });
});
