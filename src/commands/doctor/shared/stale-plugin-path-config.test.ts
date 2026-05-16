import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { OpenClawConfig } from "../../../config/config.js";
import {
  maybeRepairStalePluginPathConfig,
  scanStalePluginPathConfig,
} from "./stale-plugin-path-config.js";

const tempDirs: string[] = [];

function makeTempDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "stale-plugin-path-config-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe("doctor stale plugin path config helpers", () => {
  it("finds stale direct load paths that no longer have a plugin manifest", () => {
    const pluginDir = makeTempDir();
    fs.writeFileSync(path.join(pluginDir, "index.ts"), 'export const plugin = "demo";\n', "utf8");

    const hits = scanStalePluginPathConfig({
      plugins: {
        load: { paths: [pluginDir] },
      },
    } as OpenClawConfig);

    expect(hits).toEqual([
      {
        pathLabel: "plugins.load.paths",
        configuredPath: pluginDir,
        reason: "missing-manifest",
      },
    ]);
  });

  it("removes stale load paths and stale path-install plugin refs", () => {
    const stalePluginDir = makeTempDir();
    fs.writeFileSync(
      path.join(stalePluginDir, "index.ts"),
      'export const plugin = "stale";\n',
      "utf8",
    );

    const cfg = {
      plugins: {
        load: { paths: [stalePluginDir] },
        allow: ["google-gemini-cli-auth"],
        entries: {
          "google-gemini-cli-auth": { enabled: true },
        },
        installs: {
          "google-gemini-cli-auth": {
            source: "path",
            sourcePath: stalePluginDir,
            installPath: stalePluginDir,
          },
        },
      },
    } as OpenClawConfig;

    const result = maybeRepairStalePluginPathConfig(cfg);

    expect(result.changes).toEqual([
      `- plugins.load.paths: removed 1 stale plugin path (${stalePluginDir})`,
      "- plugins.installs.google-gemini-cli-auth: removed stale plugin references (install record, plugin entry, allowlist entry)",
    ]);
    expect(result.config.plugins?.load).toBeUndefined();
    expect(result.config.plugins?.installs).toBeUndefined();
    expect(result.config.plugins?.entries).toBeUndefined();
    expect(result.config.plugins?.allow).toBeUndefined();
  });
});
