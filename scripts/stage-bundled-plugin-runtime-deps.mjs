import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const WINDOWS_UNSAFE_CMD_CHARS_RE = /[&|<>^%\r\n]/;

/**
 * Dependency fields where a bundled plugin legitimately declares the host package.
 *
 * Inside the monorepo the host is a `workspace:*` devDependency (so plugin sources
 * type-check against the local host) and an optional `peerDependencies` entry (so
 * published installs can satisfy it). Neither form is resolvable once the manifest is
 * copied into `dist/extensions/<id>/`: `workspace:*` only resolves inside the pnpm
 * workspace, and the host is not a real npm dependency of its own bundled plugins.
 * `npm install --omit=dev` rejects the leftover `workspace:` protocol outright with
 * EUNSUPPORTEDPROTOCOL, which is what broke bundled runtime staging.
 */
const HOST_PACKAGE_STRIPPABLE_FIELDS = [
  "devDependencies",
  "peerDependencies",
  "peerDependenciesMeta",
];

/**
 * Dependency fields where a host-package declaration is a real defect rather than
 * expected monorepo metadata. A bundled plugin must never depend on the host at
 * runtime, so staging fails loudly here instead of quietly rewriting the manifest
 * into something installable but wrong.
 */
const HOST_PACKAGE_FORBIDDEN_FIELDS = ["dependencies", "optionalDependencies"];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function removePathIfExists(targetPath) {
  fs.rmSync(targetPath, { recursive: true, force: true });
}

function listBundledPluginRuntimeDirs(repoRoot) {
  const extensionsRoot = path.join(repoRoot, "dist", "extensions");
  if (!fs.existsSync(extensionsRoot)) {
    return [];
  }

  return fs
    .readdirSync(extensionsRoot, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => path.join(extensionsRoot, dirent.name))
    .filter((pluginDir) => fs.existsSync(path.join(pluginDir, "package.json")));
}

function hasRuntimeDeps(packageJson) {
  return (
    Object.keys(packageJson.dependencies ?? {}).length > 0 ||
    Object.keys(packageJson.optionalDependencies ?? {}).length > 0
  );
}

// `openclaw` here is the bundled plugin metadata namespace (the same one used by
// `openclaw.plugin.json` and `openclaw.install`), not the host npm package name. Do not
// confuse it with the host package identity resolved by `resolveHostPackageName`.
function shouldStageRuntimeDeps(packageJson) {
  return packageJson.openclaw?.bundle?.stageRuntimeDependencies === true;
}

function hasOwnDependency(container, name) {
  return (
    container !== null &&
    typeof container === "object" &&
    !Array.isArray(container) &&
    Object.hasOwn(container, name)
  );
}

/**
 * Derive the host package identity from authoritative repository metadata (the root
 * manifest `name`) instead of hard-coding it. A hard-coded list silently goes stale on
 * a host rename, which is exactly how the `openclaw` -> `agdi` rename left `agdi:
 * workspace:*` behind in every staged bundled plugin manifest.
 */
export function resolveHostPackageName(params = {}) {
  const repoRoot = params.repoRoot ?? process.cwd();
  const readJsonImpl = params.readJson ?? readJson;
  const manifestPath = path.join(repoRoot, "package.json");

  let manifest;
  try {
    manifest = readJsonImpl(manifestPath);
  } catch (error) {
    throw new Error(
      `cannot derive the host package name: failed to read ${manifestPath} (${
        error instanceof Error ? error.message : String(error)
      })`,
    );
  }

  const name = typeof manifest?.name === "string" ? manifest.name.trim() : "";
  if (name.length === 0) {
    throw new Error(
      `cannot derive the host package name: ${manifestPath} has no non-empty "name" field.`,
    );
  }
  return name;
}

/**
 * Remove the host package from a staged bundled plugin manifest.
 *
 * Only the resolved host package is touched. Genuine plugin dependencies and peer
 * dependencies are preserved verbatim, including the `openclaw` plugin metadata
 * namespace (`openclaw.plugin.json` / `openclaw.install` / `openclaw.bundle`), which is
 * a plugin manifest convention and is unrelated to the npm host package name.
 *
 * Returns a new manifest object; the input is never mutated.
 */
export function stripHostPackageDeclarations(packageJson, hostPackageName) {
  const forbiddenFields = HOST_PACKAGE_FORBIDDEN_FIELDS.filter((field) =>
    hasOwnDependency(packageJson?.[field], hostPackageName),
  );
  if (forbiddenFields.length > 0) {
    throw new Error(
      `bundled plugin manifest declares the host package "${hostPackageName}" in ${forbiddenFields.join(
        ", ",
      )}. A bundled plugin must not depend on the host at runtime; fix the plugin manifest rather than relying on staging to strip it.`,
    );
  }

  const nextManifest = { ...packageJson };
  const removedFields = [];
  for (const field of HOST_PACKAGE_STRIPPABLE_FIELDS) {
    if (!hasOwnDependency(nextManifest[field], hostPackageName)) {
      continue;
    }
    const remaining = { ...nextManifest[field] };
    delete remaining[hostPackageName];
    if (Object.keys(remaining).length === 0) {
      delete nextManifest[field];
    } else {
      nextManifest[field] = remaining;
    }
    removedFields.push(field);
  }

  return {
    packageJson: nextManifest,
    changed: removedFields.length > 0,
    removedFields,
  };
}

export function sanitizeBundledManifestForRuntimeInstall(params) {
  const manifestPath = path.join(params.pluginDir, "package.json");
  const result = stripHostPackageDeclarations(readJson(manifestPath), params.hostPackageName);
  if (result.changed) {
    writeJson(manifestPath, result.packageJson);
  }
  return result;
}

export function resolveNpmRunner(params = {}) {
  const execPath = params.execPath ?? process.execPath;
  const npmArgs = params.npmArgs ?? [];
  const existsSync = params.existsSync ?? fs.existsSync;
  const env = params.env ?? process.env;
  const platform = params.platform ?? process.platform;
  const comSpec = params.comSpec ?? env.ComSpec ?? "cmd.exe";
  const pathImpl = platform === "win32" ? path.win32 : path.posix;
  const nodeDir = pathImpl.dirname(execPath);
  const npmToolchain = resolveToolchainNpmRunner({
    comSpec,
    existsSync,
    nodeDir,
    npmArgs,
    pathImpl,
    platform,
  });
  if (npmToolchain) {
    return npmToolchain;
  }
  if (platform === "win32") {
    const expectedPaths = [
      pathImpl.resolve(nodeDir, "../lib/node_modules/npm/bin/npm-cli.js"),
      pathImpl.resolve(nodeDir, "node_modules/npm/bin/npm-cli.js"),
      pathImpl.resolve(nodeDir, "npm.exe"),
      pathImpl.resolve(nodeDir, "npm.cmd"),
    ];
    throw new Error(
      `failed to resolve a toolchain-local npm next to ${execPath}. ` +
        `Checked: ${expectedPaths.join(", ")}. ` +
        "OpenClaw refuses to shell out to bare npm on Windows; install a Node.js toolchain that bundles npm or run with a matching Node installation.",
    );
  }
  const pathKey = resolvePathEnvKey(env);
  const currentPath = env[pathKey];
  return {
    command: "npm",
    args: npmArgs,
    shell: false,
    env: {
      ...env,
      [pathKey]:
        typeof currentPath === "string" && currentPath.length > 0
          ? `${nodeDir}${path.delimiter}${currentPath}`
          : nodeDir,
    },
  };
}

function resolveToolchainNpmRunner(params) {
  const npmCliCandidates = [
    params.pathImpl.resolve(params.nodeDir, "../lib/node_modules/npm/bin/npm-cli.js"),
    params.pathImpl.resolve(params.nodeDir, "node_modules/npm/bin/npm-cli.js"),
  ];
  const npmCliPath = npmCliCandidates.find((candidate) => params.existsSync(candidate));
  if (npmCliPath) {
    return {
      command:
        params.platform === "win32"
          ? params.pathImpl.join(params.nodeDir, "node.exe")
          : params.pathImpl.join(params.nodeDir, "node"),
      args: [npmCliPath, ...params.npmArgs],
      shell: false,
    };
  }
  if (params.platform !== "win32") {
    return null;
  }
  const npmExePath = params.pathImpl.resolve(params.nodeDir, "npm.exe");
  if (params.existsSync(npmExePath)) {
    return {
      command: npmExePath,
      args: params.npmArgs,
      shell: false,
    };
  }
  const npmCmdPath = params.pathImpl.resolve(params.nodeDir, "npm.cmd");
  if (params.existsSync(npmCmdPath)) {
    return {
      command: params.comSpec,
      args: ["/d", "/s", "/c", buildCmdExeCommandLine(npmCmdPath, params.npmArgs)],
      shell: false,
      windowsVerbatimArguments: true,
    };
  }
  return null;
}

function resolvePathEnvKey(env) {
  return Object.keys(env).find((key) => key.toLowerCase() === "path") ?? "PATH";
}

/**
 * pnpm may export this setting while running workspace scripts. npm 11 rejects it
 * for project-scoped installs, even when the child explicitly uses
 * `--ignore-scripts`. The staged plugin install is intentionally isolated and
 * script-free, so do not leak that pnpm-only setting into npm.
 */
export function sanitizeNpmInstallEnv(env) {
  return Object.fromEntries(
    Object.entries(env).filter(([key]) => key.toLowerCase() !== "npm_config_allow_scripts"),
  );
}

function escapeForCmdExe(arg) {
  if (WINDOWS_UNSAFE_CMD_CHARS_RE.test(arg)) {
    throw new Error(`unsafe Windows cmd.exe argument detected: ${JSON.stringify(arg)}`);
  }
  if (!arg.includes(" ") && !arg.includes('"')) {
    return arg;
  }
  return `"${arg.replace(/"/g, '""')}"`;
}

function buildCmdExeCommandLine(command, args) {
  return [escapeForCmdExe(command), ...args.map(escapeForCmdExe)].join(" ");
}

function installPluginRuntimeDeps(params) {
  const npmRunner = resolveNpmRunner({
    npmArgs: [
      "install",
      "--omit=dev",
      "--silent",
      "--ignore-scripts",
      "--legacy-peer-deps",
      "--package-lock=false",
    ],
  });
  const result = spawnSync(npmRunner.command, npmRunner.args, {
    cwd: params.pluginDir,
    encoding: "utf8",
    env: sanitizeNpmInstallEnv(npmRunner.env ?? process.env),
    stdio: "pipe",
    shell: npmRunner.shell,
    windowsVerbatimArguments: npmRunner.windowsVerbatimArguments,
  });
  if (result.status === 0) {
    return;
  }
  const output = [result.error?.message, result.stderr, result.stdout]
    .filter(Boolean)
    .join("\n")
    .trim();
  throw new Error(
    `failed to stage bundled runtime deps for ${params.pluginId}: ${output || "npm install failed"}`,
  );
}

export function stageBundledPluginRuntimeDeps(params = {}) {
  const repoRoot = params.cwd ?? params.repoRoot ?? process.cwd();
  const hostPackageName = params.hostPackageName ?? resolveHostPackageName({ repoRoot });

  for (const pluginDir of listBundledPluginRuntimeDirs(repoRoot)) {
    const pluginId = path.basename(pluginDir);
    removePathIfExists(path.join(pluginDir, "node_modules"));

    // Normalize every staged manifest, not only the ones that install here, so the
    // packed artifact never carries a `workspace:` host declaration at any plugin path.
    const sanitized = sanitizeBundledManifestForRuntimeInstall({ pluginDir, hostPackageName });
    if (!hasRuntimeDeps(sanitized.packageJson) || !shouldStageRuntimeDeps(sanitized.packageJson)) {
      continue;
    }

    installPluginRuntimeDeps({ pluginDir, pluginId });
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  stageBundledPluginRuntimeDeps();
}
