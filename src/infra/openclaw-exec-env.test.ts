import { describe, expect, it } from "vitest";
import {
  AGDI_CLI_ENV_VALUE,
  AGDI_CLI_ENV_VAR,
  ensureAgdiExecMarkerOnProcess,
  markAgdiExecEnv,
  OPENCLAW_CLI_ENV_VAR,
} from "./openclaw-exec-env.js";

describe("markAgdiExecEnv", () => {
  it("returns a cloned env object with both AGDI_CLI and OPENCLAW_CLI markers set", () => {
    const env = { PATH: "/usr/bin", AGDI_CLI: "0" };
    const marked = markAgdiExecEnv(env);

    expect(marked).toEqual({
      PATH: "/usr/bin",
      AGDI_CLI: AGDI_CLI_ENV_VALUE,
      OPENCLAW_CLI: AGDI_CLI_ENV_VALUE,
    });
    expect(marked).not.toBe(env);
    expect(env.AGDI_CLI).toBe("0");
  });
});

describe("ensureAgdiExecMarkerOnProcess", () => {
  it("mutates and returns the provided process env with both markers", () => {
    const env: NodeJS.ProcessEnv = { PATH: "/usr/bin" };

    expect(ensureAgdiExecMarkerOnProcess(env)).toBe(env);
    expect(env[AGDI_CLI_ENV_VAR]).toBe(AGDI_CLI_ENV_VALUE);
    expect(env[OPENCLAW_CLI_ENV_VAR]).toBe(AGDI_CLI_ENV_VALUE);
  });

  it("defaults to mutating process.env when no env object is provided", () => {
    const previousAgdi = process.env[AGDI_CLI_ENV_VAR];
    const previousLegacy = process.env[OPENCLAW_CLI_ENV_VAR];
    delete process.env[AGDI_CLI_ENV_VAR];
    delete process.env[OPENCLAW_CLI_ENV_VAR];

    try {
      expect(ensureAgdiExecMarkerOnProcess()).toBe(process.env);
      expect(process.env[AGDI_CLI_ENV_VAR]).toBe(AGDI_CLI_ENV_VALUE);
      expect(process.env[OPENCLAW_CLI_ENV_VAR]).toBe(AGDI_CLI_ENV_VALUE);
    } finally {
      if (previousAgdi === undefined) {
        delete process.env[AGDI_CLI_ENV_VAR];
      } else {
        process.env[AGDI_CLI_ENV_VAR] = previousAgdi;
      }
      if (previousLegacy === undefined) {
        delete process.env[OPENCLAW_CLI_ENV_VAR];
      } else {
        process.env[OPENCLAW_CLI_ENV_VAR] = previousLegacy;
      }
    }
  });
});
