import path from "node:path";
import { describe, expect, it } from "vitest";
import { formatCliCommand } from "./command-format.js";
import { applyCliProfileEnv, parseCliProfileArgs } from "./profile.js";

describe("parseCliProfileArgs", () => {
  it("leaves gateway --dev for subcommands", () => {
    const res = parseCliProfileArgs(["node", "agdi", "gateway", "--dev", "--allow-unconfigured"]);
    if (!res.ok) {
      throw new Error(res.error);
    }
    expect(res.profile).toBeNull();
    expect(res.argv).toEqual(["node", "agdi", "gateway", "--dev", "--allow-unconfigured"]);
  });

  it("still accepts global --dev before subcommand", () => {
    const res = parseCliProfileArgs(["node", "agdi", "--dev", "gateway"]);
    if (!res.ok) {
      throw new Error(res.error);
    }
    expect(res.profile).toBe("dev");
    expect(res.argv).toEqual(["node", "agdi", "gateway"]);
  });

  it("parses --profile value and strips it", () => {
    const res = parseCliProfileArgs(["node", "agdi", "--profile", "work", "status"]);
    if (!res.ok) {
      throw new Error(res.error);
    }
    expect(res.profile).toBe("work");
    expect(res.argv).toEqual(["node", "agdi", "status"]);
  });

  it("rejects missing profile value", () => {
    const res = parseCliProfileArgs(["node", "agdi", "--profile"]);
    expect(res.ok).toBe(false);
  });

  it("rejects combining --dev with --profile (dev first)", () => {
    const res = parseCliProfileArgs(["node", "agdi", "--dev", "--profile", "work", "status"]);
    expect(res.ok).toBe(false);
  });

  it("rejects combining --dev with --profile (profile first)", () => {
    const res = parseCliProfileArgs(["node", "agdi", "--profile", "work", "--dev", "status"]);
    expect(res.ok).toBe(false);
  });
});

describe("applyCliProfileEnv", () => {
  it("fills env defaults for dev profile", () => {
    const env: Record<string, string | undefined> = {};
    applyCliProfileEnv({
      profile: "dev",
      env,
      homedir: () => "/home/peter",
    });
    const expectedStateDir = path.join(path.resolve("/home/peter"), ".agdi-dev");
    expect(env.AGDI_PROFILE).toBe("dev");
    expect(env.AGDI_STATE_DIR).toBe(expectedStateDir);
    expect(env.AGDI_CONFIG_PATH).toBe(path.join(expectedStateDir, "agdi.json"));
    expect(env.AGDI_GATEWAY_PORT).toBe("19001");
  });

  it("does not override explicit env values", () => {
    const env: Record<string, string | undefined> = {
      AGDI_STATE_DIR: "/custom",
      AGDI_GATEWAY_PORT: "19099",
    };
    applyCliProfileEnv({
      profile: "dev",
      env,
      homedir: () => "/home/peter",
    });
    expect(env.AGDI_STATE_DIR).toBe("/custom");
    expect(env.AGDI_GATEWAY_PORT).toBe("19099");
    expect(env.AGDI_CONFIG_PATH).toBe(path.join("/custom", "agdi.json"));
  });

  it("uses AGDI_HOME when deriving profile state dir", () => {
    const env: Record<string, string | undefined> = {
      AGDI_HOME: "/srv/agdi-home",
      HOME: "/home/other",
    };
    applyCliProfileEnv({
      profile: "work",
      env,
      homedir: () => "/home/fallback",
    });

    const resolvedHome = path.resolve("/srv/agdi-home");
    expect(env.AGDI_STATE_DIR).toBe(path.join(resolvedHome, ".agdi-work"));
    expect(env.AGDI_CONFIG_PATH).toBe(path.join(resolvedHome, ".agdi-work", "agdi.json"));
  });
});

describe("formatCliCommand", () => {
  it("returns command unchanged when no profile is set", () => {
    expect(formatCliCommand("agdi doctor --fix", {})).toBe("agdi doctor --fix");
  });

  it("returns command unchanged when profile is default", () => {
    expect(formatCliCommand("agdi doctor --fix", { AGDI_PROFILE: "default" })).toBe(
      "agdi doctor --fix",
    );
  });

  it("returns command unchanged when profile is Default (case-insensitive)", () => {
    expect(formatCliCommand("agdi doctor --fix", { AGDI_PROFILE: "Default" })).toBe(
      "agdi doctor --fix",
    );
  });

  it("returns command unchanged when profile is invalid", () => {
    expect(formatCliCommand("agdi doctor --fix", { AGDI_PROFILE: "bad profile" })).toBe(
      "agdi doctor --fix",
    );
  });

  it("returns command unchanged when --profile is already present", () => {
    expect(formatCliCommand("agdi --profile work doctor --fix", { AGDI_PROFILE: "work" })).toBe(
      "agdi --profile work doctor --fix",
    );
  });

  it("returns command unchanged when --dev is already present", () => {
    expect(formatCliCommand("agdi --dev doctor", { AGDI_PROFILE: "dev" })).toBe(
      "agdi --dev doctor",
    );
  });

  it("inserts --profile flag when profile is set", () => {
    expect(formatCliCommand("agdi doctor --fix", { AGDI_PROFILE: "work" })).toBe(
      "agdi --profile work doctor --fix",
    );
  });

  it("trims whitespace from profile", () => {
    expect(formatCliCommand("agdi doctor --fix", { AGDI_PROFILE: "  jbagdi  " })).toBe(
      "agdi --profile jbagdi doctor --fix",
    );
  });

  it("handles command with no args after agdi", () => {
    expect(formatCliCommand("agdi", { AGDI_PROFILE: "test" })).toBe("agdi --profile test");
  });

  it("handles pnpm wrapper", () => {
    expect(formatCliCommand("pnpm agdi doctor", { AGDI_PROFILE: "work" })).toBe(
      "pnpm agdi --profile work doctor",
    );
  });
});
