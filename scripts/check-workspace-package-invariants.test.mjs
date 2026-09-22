import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { analyzeWorkspacePackages } from "./check-workspace-package-invariants.mjs";

const tempRoots = [];
const checkerPath = fileURLToPath(
  new URL("./check-workspace-package-invariants.mjs", import.meta.url),
);

function createRepo() {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "agdi-package-invariants-"));
  tempRoots.push(repoRoot);
  writeJson(path.join(repoRoot, "package.json"), { name: "agdi", version: "1.0.0" });
  return repoRoot;
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writePlugin(repoRoot, dirName, options = {}) {
  const pluginId = options.pluginId ?? dirName;
  const packageName = options.packageName ?? `@openclaw/${pluginId}`;
  const entrypoint = options.entrypoint ?? "./index.ts";
  const packageJson = options.packageJson ?? {
    name: packageName,
    version: "1.0.0",
    type: "module",
    dependencies: options.dependencies ?? {},
    openclaw: {
      extensions: [entrypoint],
      install: { npmSpec: options.npmSpec ?? packageName },
      ...(options.channelId ? { channel: { id: options.channelId } } : {}),
    },
  };
  const pluginRoot = path.join(repoRoot, "extensions", dirName);
  writeJson(path.join(pluginRoot, "package.json"), packageJson);
  writeJson(path.join(pluginRoot, "openclaw.plugin.json"), {
    id: pluginId,
    configSchema: { type: "object" },
  });
  if (options.createEntrypoint !== false) {
    fs.writeFileSync(path.join(pluginRoot, entrypoint), "export {};\n", "utf8");
  }
}

function codesFor(repoRoot) {
  return analyzeWorkspacePackages({ repoRoot }).violations.map(({ code }) => code);
}

test.after(() => {
  for (const repoRoot of tempRoots) {
    fs.rmSync(repoRoot, { recursive: true, force: true });
  }
});

test("accepts a valid workspace package and plugin", () => {
  const repoRoot = createRepo();
  writePlugin(repoRoot, "discord", { channelId: "discord" });

  assert.deepEqual(analyzeWorkspacePackages({ repoRoot }).violations, []);
});

test("detects duplicate workspace package names", () => {
  const repoRoot = createRepo();
  writeJson(path.join(repoRoot, "packages", "one", "package.json"), { name: "duplicate" });
  writeJson(path.join(repoRoot, "packages", "two", "package.json"), { name: "duplicate" });

  assert.equal(codesFor(repoRoot).filter((code) => code === "DUPLICATE_PACKAGE_NAME").length, 2);
});

test("detects an exact root-manifest copy in a plugin", () => {
  const repoRoot = createRepo();
  const rootPackage = JSON.parse(fs.readFileSync(path.join(repoRoot, "package.json"), "utf8"));
  writePlugin(repoRoot, "copied", { packageJson: rootPackage });

  assert.ok(codesFor(repoRoot).includes("ROOT_MANIFEST_COPY"));
});

test("detects plugin metadata without a package manifest", () => {
  const repoRoot = createRepo();
  writeJson(path.join(repoRoot, "extensions", "metadata-only", "openclaw.plugin.json"), {
    id: "metadata-only",
    configSchema: { type: "object" },
  });

  assert.ok(codesFor(repoRoot).includes("MISSING_PLUGIN_PACKAGE_MANIFEST"));
});

test("detects plugin identity and metadata misalignment", () => {
  const repoRoot = createRepo();
  writePlugin(repoRoot, "discord", {
    pluginId: "chat",
    packageName: "@openclaw/wrong",
    npmSpec: "@openclaw/other",
    channelId: "discord",
  });

  const codes = codesFor(repoRoot);
  assert.ok(codes.includes("PLUGIN_DIRECTORY_ID_MISMATCH"));
  assert.ok(codes.includes("PLUGIN_PACKAGE_NAME_MISMATCH"));
  assert.ok(codes.includes("PLUGIN_INSTALL_SPEC_MISMATCH"));
  assert.ok(codes.includes("PLUGIN_CHANNEL_ID_MISMATCH"));
});

test("detects missing entrypoints", () => {
  const repoRoot = createRepo();
  writePlugin(repoRoot, "missing-entry", { createEntrypoint: false });

  assert.ok(codesFor(repoRoot).includes("MISSING_PLUGIN_ENTRYPOINT_FILE"));
});

test("detects runtime workspace dependencies in installable plugins", () => {
  const repoRoot = createRepo();
  writePlugin(repoRoot, "workspace-runtime", {
    dependencies: { agdi: "workspace:*" },
  });

  assert.ok(codesFor(repoRoot).includes("PLUGIN_RUNTIME_WORKSPACE_DEPENDENCY"));
});

test("requires a host dependency when a plugin imports the host SDK", () => {
  const repoRoot = createRepo();
  writePlugin(repoRoot, "uses-host-sdk");
  const pluginRoot = path.join(repoRoot, "extensions", "uses-host-sdk");
  fs.writeFileSync(
    path.join(pluginRoot, "index.ts"),
    'import { definePlugin } from "agdi/plugin-sdk";\nexport { definePlugin };\n',
    "utf8",
  );

  assert.ok(codesFor(repoRoot).includes("MISSING_PLUGIN_HOST_DEPENDENCY"));

  const packagePath = path.join(pluginRoot, "package.json");
  const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf8"));
  packageJson.peerDependencies = { agdi: ">=1.0.0" };
  writeJson(packagePath, packageJson);

  assert.ok(!codesFor(repoRoot).includes("MISSING_PLUGIN_HOST_DEPENDENCY"));
});

test("report mode stays non-blocking while strict mode fails", () => {
  const repoRoot = createRepo();
  writePlugin(repoRoot, "broken", { createEntrypoint: false });

  const report = spawnSync(
    process.execPath,
    [checkerPath, "--root", repoRoot, "--report", "--json"],
    {
      encoding: "utf8",
    },
  );
  const strict = spawnSync(process.execPath, [checkerPath, "--root", repoRoot, "--json"], {
    encoding: "utf8",
  });

  assert.equal(report.status, 0, report.stderr);
  assert.equal(strict.status, 1, strict.stderr);
  assert.ok(JSON.parse(report.stdout).violationCount > 0);
});
