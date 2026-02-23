import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { captureEnv } from "../test-utils/env.js";
import { resolveAGDIAgentDir } from "./agent-paths.js";

describe("resolveAGDIAgentDir", () => {
  const env = captureEnv(["AGDI_STATE_DIR", "AGDI_AGENT_DIR", "PI_CODING_AGENT_DIR"]);
  let tempStateDir: string | null = null;

  afterEach(async () => {
    if (tempStateDir) {
      await fs.rm(tempStateDir, { recursive: true, force: true });
      tempStateDir = null;
    }
    env.restore();
  });

  it("defaults to the multi-agent path when no overrides are set", async () => {
    tempStateDir = await fs.mkdtemp(path.join(os.tmpdir(), "agdi-agent-"));
    process.env.AGDI_STATE_DIR = tempStateDir;
    delete process.env.AGDI_AGENT_DIR;
    delete process.env.PI_CODING_AGENT_DIR;

    const resolved = resolveAGDIAgentDir();

    expect(resolved).toBe(path.join(tempStateDir, "agents", "main", "agent"));
  });

  it("honors AGDI_AGENT_DIR overrides", async () => {
    tempStateDir = await fs.mkdtemp(path.join(os.tmpdir(), "agdi-agent-"));
    const override = path.join(tempStateDir, "agent");
    process.env.AGDI_AGENT_DIR = override;
    delete process.env.PI_CODING_AGENT_DIR;

    const resolved = resolveAGDIAgentDir();

    expect(resolved).toBe(path.resolve(override));
  });
});
