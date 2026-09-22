import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  resolveHostPackageName,
  resolveNpmRunner,
  sanitizeNpmInstallEnv,
  sanitizeBundledManifestForRuntimeInstall,
  stripHostPackageDeclarations,
} from "../../scripts/stage-bundled-plugin-runtime-deps.mjs";

const HOST_PACKAGE_NAME = "agdi";
const tempDirs: string[] = [];

function makePluginDir(manifest: unknown): string {
  const pluginDir = fs.mkdtempSync(path.join(os.tmpdir(), "agdi-staged-plugin-"));
  tempDirs.push(pluginDir);
  fs.writeFileSync(
    path.join(pluginDir, "package.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8",
  );
  return pluginDir;
}

function readManifest(pluginDir: string): Record<string, unknown> {
  return JSON.parse(fs.readFileSync(path.join(pluginDir, "package.json"), "utf8"));
}

function declaresDependencyKey(
  manifest: Record<string, unknown>,
  field: string,
  key: string,
): boolean {
  const container = manifest[field];
  return (
    typeof container === "object" &&
    container !== null &&
    !Array.isArray(container) &&
    Object.hasOwn(container, key)
  );
}

afterEach(() => {
  for (const dir of tempDirs.splice(0, tempDirs.length)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe("resolveNpmRunner", () => {
  it("anchors npm staging to the active node toolchain when npm-cli.js exists", () => {
    const execPath = "/Users/test/.nodenv/versions/24.13.0/bin/node";
    const expectedNpmCliPath = path.posix.resolve(
      path.posix.dirname(execPath),
      "../lib/node_modules/npm/bin/npm-cli.js",
    );

    const runner = resolveNpmRunner({
      execPath,
      env: {},
      existsSync: (candidate: string) => candidate === expectedNpmCliPath,
      platform: "darwin",
    });

    expect(runner).toEqual({
      command: execPath,
      args: [expectedNpmCliPath],
      shell: false,
    });
  });

  it("anchors Windows npm staging to the adjacent npm-cli.js without a shell", () => {
    const execPath = "C:\\nodejs\\node.exe";
    const expectedNpmCliPath = path.win32.resolve(
      path.win32.dirname(execPath),
      "node_modules/npm/bin/npm-cli.js",
    );

    const runner = resolveNpmRunner({
      execPath,
      env: {},
      existsSync: (candidate: string) => candidate === expectedNpmCliPath,
      platform: "win32",
    });

    expect(runner).toEqual({
      command: execPath,
      args: [expectedNpmCliPath],
      shell: false,
    });
  });

  it("uses an adjacent npm.exe on Windows without a shell", () => {
    const execPath = "C:\\nodejs\\node.exe";
    const expectedNpmExePath = path.win32.resolve(path.win32.dirname(execPath), "npm.exe");

    const runner = resolveNpmRunner({
      execPath,
      env: {},
      existsSync: (candidate: string) => candidate === expectedNpmExePath,
      npmArgs: ["install", "--silent"],
      platform: "win32",
    });

    expect(runner).toEqual({
      command: expectedNpmExePath,
      args: ["install", "--silent"],
      shell: false,
    });
  });

  it("wraps an adjacent npm.cmd via cmd.exe without enabling shell mode", () => {
    const execPath = "C:\\nodejs\\node.exe";
    const npmCmdPath = path.win32.resolve(path.win32.dirname(execPath), "npm.cmd");

    const runner = resolveNpmRunner({
      comSpec: "C:\\Windows\\System32\\cmd.exe",
      execPath,
      env: {},
      existsSync: (candidate: string) => candidate === npmCmdPath,
      npmArgs: ["install", "--omit=dev"],
      platform: "win32",
    });

    expect(runner).toEqual({
      command: "C:\\Windows\\System32\\cmd.exe",
      args: ["/d", "/s", "/c", `${npmCmdPath} install --omit=dev`],
      shell: false,
      windowsVerbatimArguments: true,
    });
  });

  it("prefixes PATH with the active node dir when falling back to bare npm", () => {
    expect(
      resolveNpmRunner({
        execPath: "/tmp/node",
        env: {
          PATH: "/usr/bin:/bin",
        },
        existsSync: () => false,
        platform: "linux",
      }),
    ).toEqual({
      command: "npm",
      args: [],
      shell: false,
      env: {
        PATH: `/tmp${path.delimiter}/usr/bin:/bin`,
      },
    });
  });

  it("fails closed on Windows when no toolchain-local npm CLI exists", () => {
    expect(() =>
      resolveNpmRunner({
        execPath: "C:\\node\\node.exe",
        env: {
          Path: "C:\\Windows\\System32",
        },
        existsSync: () => false,
        platform: "win32",
      }),
    ).toThrow("OpenClaw refuses to shell out to bare npm on Windows");
  });
});

describe("sanitizeNpmInstallEnv", () => {
  it("removes pnpm's incompatible allow-scripts setting without losing other configuration", () => {
    expect(
      sanitizeNpmInstallEnv({
        PATH: "C:\\nodejs",
        NPM_CONFIG_ALLOW_SCRIPTS: "esbuild",
        npm_config_registry: "https://registry.npmjs.org/",
      }),
    ).toEqual({
      PATH: "C:\\nodejs",
      npm_config_registry: "https://registry.npmjs.org/",
    });
  });
});

describe("resolveHostPackageName", () => {
  it("derives the host package identity from the repository root manifest", () => {
    const repoRoot = path.resolve(process.cwd());
    const rootManifest = JSON.parse(
      fs.readFileSync(path.join(repoRoot, "package.json"), "utf8"),
    ) as { name?: string };

    expect(resolveHostPackageName({ repoRoot })).toBe(rootManifest.name);
  });

  it("fails closed when the root manifest has no usable name", () => {
    expect(() =>
      resolveHostPackageName({ repoRoot: "/repo", readJson: () => ({ version: "1.0.0" }) }),
    ).toThrow('has no non-empty "name" field');
  });

  it("fails closed when the root manifest cannot be read", () => {
    expect(() =>
      resolveHostPackageName({
        repoRoot: "/repo",
        readJson: () => {
          throw new Error("ENOENT");
        },
      }),
    ).toThrow("cannot derive the host package name");
  });
});

describe("stripHostPackageDeclarations", () => {
  it("removes the host workspace dev dependency but keeps genuine dev dependencies", () => {
    const result = stripHostPackageDeclarations(
      {
        name: "@openclaw/discord",
        devDependencies: { "@mariozechner/pi-agent-core": "0.61.1", agdi: "workspace:*" },
      },
      HOST_PACKAGE_NAME,
    );

    expect(result.changed).toBe(true);
    expect(result.removedFields).toEqual(["devDependencies"]);
    expect(result.packageJson.devDependencies).toEqual({
      "@mariozechner/pi-agent-core": "0.61.1",
    });
  });

  it("removes the host peer dependency and peer metadata and drops the emptied fields", () => {
    const result = stripHostPackageDeclarations(
      {
        peerDependencies: { agdi: ">=2026.3.22" },
        peerDependenciesMeta: { agdi: { optional: true } },
      },
      HOST_PACKAGE_NAME,
    );

    expect(result.changed).toBe(true);
    expect(result.removedFields).toEqual(["peerDependencies", "peerDependenciesMeta"]);
    expect(result.packageJson.peerDependencies).toBeUndefined();
    expect(result.packageJson.peerDependenciesMeta).toBeUndefined();
  });

  it("keeps unrelated dependencies, optional dependencies, and peer dependencies untouched", () => {
    const manifest = {
      dependencies: { "@buape/carbon": "^0.14.0", ws: "^8.20.0" },
      optionalDependencies: { openshell: "0.1.0" },
      peerDependencies: { "@napi-rs/canvas": "^0.1.89" },
      peerDependenciesMeta: { "@napi-rs/canvas": { optional: true } },
    };

    const result = stripHostPackageDeclarations(manifest, HOST_PACKAGE_NAME);

    expect(result.changed).toBe(false);
    expect(result.removedFields).toEqual([]);
    expect(result.packageJson).toEqual(manifest);
  });

  it("preserves the openclaw plugin metadata namespace", () => {
    const openclawMetadata = {
      extensions: ["./index.js"],
      bundle: { stageRuntimeDependencies: true },
      install: { npmSpec: "@openclaw/discord" },
    };

    const result = stripHostPackageDeclarations(
      { devDependencies: { agdi: "workspace:*" }, openclaw: openclawMetadata },
      HOST_PACKAGE_NAME,
    );

    expect(result.packageJson.openclaw).toEqual(openclawMetadata);
  });

  it("does not mutate the manifest it was given", () => {
    const manifest = { devDependencies: { agdi: "workspace:*" } };

    stripHostPackageDeclarations(manifest, HOST_PACKAGE_NAME);

    expect(manifest.devDependencies).toEqual({ agdi: "workspace:*" });
  });

  it("fails closed when the host package is declared as a runtime dependency", () => {
    expect(() =>
      stripHostPackageDeclarations({ dependencies: { agdi: "workspace:*" } }, HOST_PACKAGE_NAME),
    ).toThrow('declares the host package "agdi" in dependencies');
  });

  it("fails closed when the host package is declared as an optional runtime dependency", () => {
    expect(() =>
      stripHostPackageDeclarations(
        { optionalDependencies: { agdi: "workspace:*" } },
        HOST_PACKAGE_NAME,
      ),
    ).toThrow("optionalDependencies");
  });
});

describe("sanitizeBundledManifestForRuntimeInstall", () => {
  it("rewrites the staged manifest so npm no longer sees a workspace protocol", () => {
    const pluginDir = makePluginDir({
      name: "@openclaw/discord",
      dependencies: { "@buape/carbon": "^0.14.0" },
      devDependencies: { agdi: "workspace:*" },
      peerDependencies: { agdi: ">=2026.3.22" },
      peerDependenciesMeta: { agdi: { optional: true } },
    });

    const result = sanitizeBundledManifestForRuntimeInstall({
      pluginDir,
      hostPackageName: HOST_PACKAGE_NAME,
    });

    expect(result.removedFields).toEqual([
      "devDependencies",
      "peerDependencies",
      "peerDependenciesMeta",
    ]);

    const onDisk = readManifest(pluginDir);
    expect(onDisk.devDependencies).toBeUndefined();
    expect(onDisk.peerDependencies).toBeUndefined();
    expect(onDisk.peerDependenciesMeta).toBeUndefined();
    expect(onDisk.dependencies).toEqual({ "@buape/carbon": "^0.14.0" });
    expect(JSON.stringify(onDisk)).not.toContain("workspace:");
  });

  it("is idempotent across repeated staging runs", () => {
    const pluginDir = makePluginDir({ devDependencies: { agdi: "workspace:*" } });

    const first = sanitizeBundledManifestForRuntimeInstall({
      pluginDir,
      hostPackageName: HOST_PACKAGE_NAME,
    });
    const second = sanitizeBundledManifestForRuntimeInstall({
      pluginDir,
      hostPackageName: HOST_PACKAGE_NAME,
    });

    expect(first.changed).toBe(true);
    expect(second.changed).toBe(false);
    expect(second.removedFields).toEqual([]);
  });
});

describe("legacy host package name handling", () => {
  it("has no remaining legacy host dependency declarations left to strip", () => {
    const extensionsRoot = path.resolve(process.cwd(), "extensions");
    const legacyKey = "openclaw";
    const dependencyFields = [
      "dependencies",
      "optionalDependencies",
      "devDependencies",
      "peerDependencies",
      "peerDependenciesMeta",
    ];

    const offenders = fs
      .readdirSync(extensionsRoot, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .flatMap((entry) => {
        const packagePath = path.join(extensionsRoot, entry.name, "package.json");
        if (!fs.existsSync(packagePath)) {
          return [];
        }
        const manifest = JSON.parse(fs.readFileSync(packagePath, "utf8")) as Record<
          string,
          unknown
        >;
        return dependencyFields
          .filter((field) => declaresDependencyKey(manifest, field, legacyKey))
          .map((field) => `${entry.name}: ${field}.${legacyKey}`);
      });

    expect(
      offenders,
      "The staging sanitizer derives the host package from the root manifest instead of hard-coding the legacy `openclaw` name. This test proves that removal is safe today: no bundled plugin declares `openclaw` as a dependency key. If a plugin genuinely needs the legacy host name again, restore explicit handling together with a test that explains why.",
    ).toEqual([]);
  });
});
