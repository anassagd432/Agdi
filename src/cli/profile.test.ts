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

  it("leaves gateway --dev for subcommands after leading root options", () => {
    const res = parseCliProfileArgs([
      "node",
      "agdi",
      "--no-color",
      "gateway",
      "--dev",
      "--allow-unconfigured",
    ]);
    if (!res.ok) {
      throw new Error(res.error);
    }
    expect(res.profile).toBeNull();
    expect(res.argv).toEqual([
      "node",
      "agdi",
      "--no-color",
      "gateway",
      "--dev",
      "--allow-unconfigured",
    ]);
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

  it("parses interleaved --profile after the command token", () => {
    const res = parseCliProfileArgs(["node", "agdi", "status", "--profile", "work", "--deep"]);
    if (!res.ok) {
      throw new Error(res.error);
    }
    expect(res.profile).toBe("work");
    expect(res.argv).toEqual(["node", "agdi", "status", "--deep"]);
  });

  it("parses interleaved --dev after the command token", () => {
    const res = parseCliProfileArgs(["node", "agdi", "status", "--dev"]);
    if (!res.ok) {
      throw new Error(res.error);
    }
    expect(res.profile).toBe("dev");
    expect(res.argv).toEqual(["node", "agdi", "status"]);
  });

  it("rejects missing profile value", () => {
    const res = parseCliProfileArgs(["node", "agdi", "--profile"]);
    expect(res.ok).toBe(false);
  });

  it.each([
    ["--dev first", ["node", "agdi", "--dev", "--profile", "work", "status"]],
    ["--profile first", ["node", "agdi", "--profile", "work", "--dev", "status"]],
    ["interleaved after command", ["node", "agdi", "status", "--profile", "work", "--dev"]],
  ])("rejects combining --dev with --profile (%s)", (_name, argv) => {
    const res = parseCliProfileArgs(argv);
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
    expect(env.OPENCLAW_PROFILE).toBe("dev");
    expect(env.AGDI_STATE_DIR).toBe(expectedStateDir);
    expect(env.OPENCLAW_STATE_DIR).toBe(expectedStateDir);
    expect(env.AGDI_CONFIG_PATH).toBe(path.join(expectedStateDir, "agdi.json"));
    expect(env.OPENCLAW_CONFIG_PATH).toBe(path.join(expectedStateDir, "agdi.json"));
    expect(env.AGDI_GATEWAY_PORT).toBe("19001");
    expect(env.OPENCLAW_GATEWAY_PORT).toBe("19001");
  });

  it("does not override explicit env values", () => {
    const env: Record<string, string | undefined> = {
      OPENCLAW_STATE_DIR: "/custom",
      OPENCLAW_GATEWAY_PORT: "19099",
    };
    applyCliProfileEnv({
      profile: "dev",
      env,
      homedir: () => "/home/peter",
    });
    expect(env.AGDI_STATE_DIR).toBe("/custom");
    expect(env.OPENCLAW_STATE_DIR).toBe("/custom");
    expect(env.OPENCLAW_GATEWAY_PORT).toBe("19099");
    expect(env.AGDI_CONFIG_PATH).toBe(path.join("/custom", "agdi.json"));
    expect(env.OPENCLAW_CONFIG_PATH).toBe(path.join("/custom", "agdi.json"));
  });

  it("uses OPENCLAW_HOME when deriving profile state dir", () => {
    const env: Record<string, string | undefined> = {
      OPENCLAW_HOME: "/srv/openclaw-home",
      HOME: "/home/other",
    };
    applyCliProfileEnv({
      profile: "work",
      env,
      homedir: () => "/home/fallback",
    });

    const resolvedHome = path.resolve("/srv/openclaw-home");
    expect(env.AGDI_STATE_DIR).toBe(path.join(resolvedHome, ".agdi-work"));
    expect(env.OPENCLAW_STATE_DIR).toBe(path.join(resolvedHome, ".agdi-work"));
    expect(env.AGDI_CONFIG_PATH).toBe(path.join(resolvedHome, ".agdi-work", "agdi.json"));
    expect(env.OPENCLAW_CONFIG_PATH).toBe(path.join(resolvedHome, ".agdi-work", "agdi.json"));
  });
});

describe("formatCliCommand", () => {
  it.each([
    {
      name: "no profile is set",
      cmd: "agdi doctor --fix",
      env: {},
      expected: "agdi doctor --fix",
    },
    {
      name: "profile is default",
      cmd: "agdi doctor --fix",
      env: { AGDI_PROFILE: "default" },
      expected: "agdi doctor --fix",
    },
    {
      name: "profile is Default (case-insensitive)",
      cmd: "agdi doctor --fix",
      env: { AGDI_PROFILE: "Default" },
      expected: "agdi doctor --fix",
    },
    {
      name: "profile is invalid",
      cmd: "agdi doctor --fix",
      env: { AGDI_PROFILE: "bad profile" },
      expected: "agdi doctor --fix",
    },
    {
      name: "--profile is already present",
      cmd: "agdi --profile work doctor --fix",
      env: { AGDI_PROFILE: "work" },
      expected: "agdi --profile work doctor --fix",
    },
    {
      name: "--dev is already present",
      cmd: "agdi --dev doctor",
      env: { AGDI_PROFILE: "dev" },
      expected: "agdi --dev doctor",
    },
  ])("returns command unchanged when $name", ({ cmd, env, expected }) => {
    expect(formatCliCommand(cmd, env)).toBe(expected);
  });

  it("inserts --profile flag when profile is set", () => {
    expect(formatCliCommand("agdi doctor --fix", { AGDI_PROFILE: "work" })).toBe(
      "agdi --profile work doctor --fix",
    );
  });

  it("trims whitespace from profile", () => {
    expect(formatCliCommand("agdi doctor --fix", { AGDI_PROFILE: "  jbopenclaw  " })).toBe(
      "agdi --profile jbopenclaw doctor --fix",
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

  it("inserts --container when a container hint is set", () => {
    expect(formatCliCommand("agdi gateway status --deep", { AGDI_CONTAINER_HINT: "demo" })).toBe(
      "agdi --container demo gateway status --deep",
    );
  });

  it("preserves both --container and --profile hints", () => {
    expect(
      formatCliCommand("agdi doctor", {
        AGDI_CONTAINER_HINT: "demo",
        AGDI_PROFILE: "work",
      }),
    ).toBe("agdi --container demo doctor");
  });

  it("does not prepend --container for update commands", () => {
    expect(formatCliCommand("agdi update", { AGDI_CONTAINER_HINT: "demo" })).toBe("agdi update");
    expect(
      formatCliCommand("pnpm agdi update --channel beta", { AGDI_CONTAINER_HINT: "demo" }),
    ).toBe("pnpm agdi update --channel beta");
  });

  it("keeps legacy openclaw command names when invoked through the compatibility wrapper", () => {
    const originalArgv = process.argv;
    process.argv = ["node", "openclaw", "status"];
    try {
      expect(formatCliCommand("agdi doctor --fix", { AGDI_PROFILE: "work" })).toBe(
        "openclaw --profile work doctor --fix",
      );
    } finally {
      process.argv = originalArgv;
    }
  });
});
