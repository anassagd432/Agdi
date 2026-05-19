import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const dotenvState = vi.hoisted(() => {
  const state = {
    profileAtDotenvLoad: undefined as string | undefined,
    containerAtDotenvLoad: undefined as string | undefined,
  };
  return {
    state,
    loadDotEnv: vi.fn(() => {
      state.profileAtDotenvLoad = process.env.OPENCLAW_PROFILE;
      state.containerAtDotenvLoad = process.env.OPENCLAW_CONTAINER;
    }),
  };
});

const maybeRunCliInContainerMock = vi.hoisted(() =>
  vi.fn((argv: string[]) => ({ handled: false, argv })),
);

vi.mock("./dotenv.js", () => ({
  loadCliDotEnv: dotenvState.loadDotEnv,
}));

vi.mock("../infra/env.js", () => ({
  normalizeEnv: vi.fn(),
}));

vi.mock("../infra/runtime-guard.js", () => ({
  assertSupportedRuntime: vi.fn(),
}));

vi.mock("../infra/path-env.js", () => ({
  ensureOpenClawCliOnPath: vi.fn(),
}));

vi.mock("./route.js", () => ({
  tryRouteCli: vi.fn(async () => true),
}));

vi.mock("./windows-argv.js", () => ({
  normalizeWindowsArgv: (argv: string[]) => argv,
}));

vi.mock("./container-target.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./container-target.js")>();
  return {
    ...actual,
    maybeRunCliInContainer: maybeRunCliInContainerMock,
  };
});

import { runCli } from "./run-main.js";

describe("runCli profile env bootstrap", () => {
  const originalAgdiProfile = process.env.AGDI_PROFILE;
  const originalProfile = process.env.OPENCLAW_PROFILE;
  const originalAgdiStateDir = process.env.AGDI_STATE_DIR;
  const originalStateDir = process.env.OPENCLAW_STATE_DIR;
  const originalAgdiConfigPath = process.env.AGDI_CONFIG_PATH;
  const originalConfigPath = process.env.OPENCLAW_CONFIG_PATH;
  const originalAgdiContainer = process.env.AGDI_CONTAINER;
  const originalContainer = process.env.OPENCLAW_CONTAINER;
  const originalAgdiGatewayPort = process.env.AGDI_GATEWAY_PORT;
  const originalGatewayPort = process.env.OPENCLAW_GATEWAY_PORT;
  const originalAgdiGatewayUrl = process.env.AGDI_GATEWAY_URL;
  const originalGatewayUrl = process.env.OPENCLAW_GATEWAY_URL;
  const originalAgdiGatewayToken = process.env.AGDI_GATEWAY_TOKEN;
  const originalGatewayToken = process.env.OPENCLAW_GATEWAY_TOKEN;
  const originalAgdiGatewayPassword = process.env.AGDI_GATEWAY_PASSWORD;
  const originalGatewayPassword = process.env.OPENCLAW_GATEWAY_PASSWORD;

  beforeEach(() => {
    delete process.env.AGDI_PROFILE;
    delete process.env.OPENCLAW_PROFILE;
    delete process.env.AGDI_STATE_DIR;
    delete process.env.OPENCLAW_STATE_DIR;
    delete process.env.AGDI_CONFIG_PATH;
    delete process.env.OPENCLAW_CONFIG_PATH;
    delete process.env.AGDI_CONTAINER;
    delete process.env.OPENCLAW_CONTAINER;
    delete process.env.AGDI_GATEWAY_PORT;
    delete process.env.OPENCLAW_GATEWAY_PORT;
    delete process.env.AGDI_GATEWAY_URL;
    delete process.env.OPENCLAW_GATEWAY_URL;
    delete process.env.AGDI_GATEWAY_TOKEN;
    delete process.env.OPENCLAW_GATEWAY_TOKEN;
    delete process.env.AGDI_GATEWAY_PASSWORD;
    delete process.env.OPENCLAW_GATEWAY_PASSWORD;
    dotenvState.state.profileAtDotenvLoad = undefined;
    dotenvState.state.containerAtDotenvLoad = undefined;
    dotenvState.loadDotEnv.mockClear();
    maybeRunCliInContainerMock.mockClear();
  });

  afterEach(() => {
    if (originalAgdiProfile === undefined) {
      delete process.env.AGDI_PROFILE;
    } else {
      process.env.AGDI_PROFILE = originalAgdiProfile;
    }
    if (originalProfile === undefined) {
      delete process.env.OPENCLAW_PROFILE;
    } else {
      process.env.OPENCLAW_PROFILE = originalProfile;
    }
    if (originalAgdiContainer === undefined) {
      delete process.env.AGDI_CONTAINER;
    } else {
      process.env.AGDI_CONTAINER = originalAgdiContainer;
    }
    if (originalContainer === undefined) {
      delete process.env.OPENCLAW_CONTAINER;
    } else {
      process.env.OPENCLAW_CONTAINER = originalContainer;
    }
    if (originalAgdiStateDir === undefined) {
      delete process.env.AGDI_STATE_DIR;
    } else {
      process.env.AGDI_STATE_DIR = originalAgdiStateDir;
    }
    if (originalStateDir === undefined) {
      delete process.env.OPENCLAW_STATE_DIR;
    } else {
      process.env.OPENCLAW_STATE_DIR = originalStateDir;
    }
    if (originalAgdiConfigPath === undefined) {
      delete process.env.AGDI_CONFIG_PATH;
    } else {
      process.env.AGDI_CONFIG_PATH = originalAgdiConfigPath;
    }
    if (originalConfigPath === undefined) {
      delete process.env.OPENCLAW_CONFIG_PATH;
    } else {
      process.env.OPENCLAW_CONFIG_PATH = originalConfigPath;
    }
    if (originalAgdiGatewayPort === undefined) {
      delete process.env.AGDI_GATEWAY_PORT;
    } else {
      process.env.AGDI_GATEWAY_PORT = originalAgdiGatewayPort;
    }
    if (originalGatewayPort === undefined) {
      delete process.env.OPENCLAW_GATEWAY_PORT;
    } else {
      process.env.OPENCLAW_GATEWAY_PORT = originalGatewayPort;
    }
    if (originalAgdiGatewayUrl === undefined) {
      delete process.env.AGDI_GATEWAY_URL;
    } else {
      process.env.AGDI_GATEWAY_URL = originalAgdiGatewayUrl;
    }
    if (originalGatewayUrl === undefined) {
      delete process.env.OPENCLAW_GATEWAY_URL;
    } else {
      process.env.OPENCLAW_GATEWAY_URL = originalGatewayUrl;
    }
    if (originalAgdiGatewayToken === undefined) {
      delete process.env.AGDI_GATEWAY_TOKEN;
    } else {
      process.env.AGDI_GATEWAY_TOKEN = originalAgdiGatewayToken;
    }
    if (originalGatewayToken === undefined) {
      delete process.env.OPENCLAW_GATEWAY_TOKEN;
    } else {
      process.env.OPENCLAW_GATEWAY_TOKEN = originalGatewayToken;
    }
    if (originalAgdiGatewayPassword === undefined) {
      delete process.env.AGDI_GATEWAY_PASSWORD;
    } else {
      process.env.AGDI_GATEWAY_PASSWORD = originalAgdiGatewayPassword;
    }
    if (originalGatewayPassword === undefined) {
      delete process.env.OPENCLAW_GATEWAY_PASSWORD;
    } else {
      process.env.OPENCLAW_GATEWAY_PASSWORD = originalGatewayPassword;
    }
  });

  it("applies --profile before dotenv loading", async () => {
    await runCli(["node", "openclaw", "--profile", "rawdog", "status"]);

    expect(dotenvState.loadDotEnv).toHaveBeenCalledOnce();
    expect(dotenvState.state.profileAtDotenvLoad).toBe("rawdog");
    expect(process.env.AGDI_PROFILE).toBe("rawdog");
    expect(process.env.OPENCLAW_PROFILE).toBe("rawdog");
  });

  it("rejects --container combined with --profile", async () => {
    await expect(
      runCli(["node", "openclaw", "--container", "demo", "--profile", "rawdog", "status"]),
    ).rejects.toThrow("--container cannot be combined with --profile/--dev");

    expect(dotenvState.loadDotEnv).not.toHaveBeenCalled();
    expect(process.env.OPENCLAW_PROFILE).toBe("rawdog");
  });

  it("rejects --container combined with interleaved --profile", async () => {
    await expect(
      runCli(["node", "openclaw", "status", "--container", "demo", "--profile", "rawdog"]),
    ).rejects.toThrow("--container cannot be combined with --profile/--dev");
  });

  it("rejects --container combined with interleaved --dev", async () => {
    await expect(
      runCli(["node", "openclaw", "status", "--container", "demo", "--dev"]),
    ).rejects.toThrow("--container cannot be combined with --profile/--dev");
  });

  it("does not let dotenv change container target resolution", async () => {
    dotenvState.loadDotEnv.mockImplementationOnce(() => {
      process.env.OPENCLAW_CONTAINER = "demo";
      dotenvState.state.profileAtDotenvLoad = process.env.OPENCLAW_PROFILE;
      dotenvState.state.containerAtDotenvLoad = process.env.OPENCLAW_CONTAINER;
    });

    await runCli(["node", "openclaw", "status"]);

    expect(dotenvState.loadDotEnv).toHaveBeenCalledOnce();
    expect(process.env.OPENCLAW_CONTAINER).toBe("demo");
    expect(dotenvState.state.containerAtDotenvLoad).toBe("demo");
    expect(maybeRunCliInContainerMock).toHaveBeenCalledWith(["node", "openclaw", "status"]);
    expect(maybeRunCliInContainerMock).toHaveReturnedWith({
      handled: false,
      argv: ["node", "openclaw", "status"],
    });
  });

  it("allows container mode when AGDI_PROFILE is already set in env", async () => {
    process.env.AGDI_PROFILE = "work";

    await expect(
      runCli(["node", "openclaw", "--container", "demo", "status"]),
    ).resolves.toBeUndefined();
  });

  it.each([
    ["AGDI_GATEWAY_PORT", "19001"],
    ["AGDI_GATEWAY_URL", "ws://127.0.0.1:18789"],
    ["AGDI_GATEWAY_TOKEN", "demo-token"],
    ["AGDI_GATEWAY_PASSWORD", "demo-password"],
  ])("allows container mode when %s is set in env", async (key, value) => {
    process.env[key] = value;

    await expect(
      runCli(["node", "openclaw", "--container", "demo", "status"]),
    ).resolves.toBeUndefined();
  });

  it("allows container mode when only AGDI_STATE_DIR is set in env", async () => {
    process.env.AGDI_STATE_DIR = "/tmp/agdi-host-state";

    await expect(
      runCli(["node", "openclaw", "--container", "demo", "status"]),
    ).resolves.toBeUndefined();
  });

  it("allows container mode when only AGDI_CONFIG_PATH is set in env", async () => {
    process.env.AGDI_CONFIG_PATH = "/tmp/agdi-host-state/agdi.json";

    await expect(
      runCli(["node", "openclaw", "--container", "demo", "status"]),
    ).resolves.toBeUndefined();
  });
});
