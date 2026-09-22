#!/usr/bin/env node
/**
 * Install smoke test for the published npm artifact.
 *
 * This is deliberately not the Docker shell-installer smoke in
 * `.github/workflows/install-smoke.yml`. That job proves `scripts/install.sh`
 * works; it never proves the tarball that `npm publish` would upload is
 * installable and runnable. This gate does:
 *
 *   1. Pack the repository with `npm pack --ignore-scripts --json`.
 *   2. Create an operating-system temporary directory OUTSIDE the checkout.
 *   3. Install the exact tarball there with `npm install`.
 *   4. Invoke the installed entrypoint: `--version` and `--help`.
 *   5. Resolve representative `exports` subpaths from inside the installed tree.
 *   6. Assert representative bundled plugin manifests shipped.
 *
 * It does not build. `npm pack` has no prepack/prepare hook in this package, so
 * the tarball reflects whatever is already in `dist/`. A missing entrypoint is
 * reported as a failure, not repaired.
 *
 * Usage:
 *   node scripts/test-package-install-smoke.mjs
 *   node scripts/test-package-install-smoke.mjs --json
 *   node scripts/test-package-install-smoke.mjs --keep
 *   node scripts/test-package-install-smoke.mjs --timeout-ms 600000
 *
 * Exit codes: 0 = every check passed, 1 = at least one check failed.
 */

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const IS_WINDOWS = process.platform === "win32";

/** `exports` subpaths that must resolve from an installed copy. */
const EXPORT_SUBPATHS = ["agdi/plugin-sdk", "agdi/plugin-sdk/core"];

/** Bundled plugin ids that must ship a manifest in the installed tree. */
const REPRESENTATIVE_PLUGINS = ["helloworld", "telegram", "discord"];

const DEFAULT_TIMEOUT_MS = 15 * 60 * 1000;

function parseArgs(argv) {
  const options = { asJson: false, keep: false, timeoutMs: DEFAULT_TIMEOUT_MS };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--json") {
      options.asJson = true;
      continue;
    }
    if (arg === "--keep") {
      options.keep = true;
      continue;
    }
    if (arg === "--timeout-ms") {
      const value = Number(argv[index + 1]);
      if (!Number.isFinite(value) || value <= 0) {
        throw new Error("--timeout-ms requires a positive number");
      }
      options.timeoutMs = value;
      index += 1;
      continue;
    }
    throw new Error(`unknown argument: ${arg}`);
  }
  return options;
}

/**
 * Resolve npm's CLI entrypoint so it can be run through the current Node binary.
 *
 * Node 22 refuses to spawn a `.cmd` shim without a shell, and routing through a
 * shell makes quoting fragile on Windows paths.
 */
function resolveNpmInvocation() {
  const candidates = [
    path.join(path.dirname(process.execPath), "node_modules", "npm", "bin", "npm-cli.js"),
    path.join(
      path.dirname(process.execPath),
      "..",
      "lib",
      "node_modules",
      "npm",
      "bin",
      "npm-cli.js",
    ),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return { command: process.execPath, prefixArgs: [candidate] };
    }
  }
  return { command: IS_WINDOWS ? "npm.cmd" : "npm", prefixArgs: [], shell: IS_WINDOWS };
}

function runNpm(args, options = {}) {
  const { command, prefixArgs, shell } = resolveNpmInvocation();
  return execFileSync(command, [...prefixArgs, ...args], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
    timeout: options.timeoutMs,
    shell: Boolean(shell),
    ...options,
  });
}

function toPosix(value) {
  return value.split(path.sep).join("/");
}

function packTarball(destination, timeoutMs) {
  const raw = runNpm(["pack", "--ignore-scripts", "--json", "--pack-destination", destination], {
    timeoutMs,
  });
  const parsed = JSON.parse(raw);
  const entry = Array.isArray(parsed) ? parsed[0] : parsed;
  if (!entry || typeof entry.filename !== "string") {
    throw new Error("npm pack --json did not return a filename");
  }
  return path.join(destination, entry.filename);
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const checks = [];
  const record = (name, ok, details) => checks.push({ name, ok, details });

  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "agdi-install-smoke-"));
  const consumerDir = path.join(scratch, "consumer");
  fs.mkdirSync(consumerDir, { recursive: true });

  let installed = false;
  let packageRoot = null;

  try {
    // --- 1. Pack ---------------------------------------------------------
    const tarball = packTarball(scratch, options.timeoutMs);
    const tarballStat = fs.statSync(tarball);
    record(
      "tarball produced",
      tarballStat.size > 0,
      `${path.basename(tarball)} (${String(Math.round(tarballStat.size / 1024))} KiB)`,
    );

    // The extraction directory must not live inside the checkout, or a stray
    // `node_modules` could satisfy an import that the published artifact lacks.
    record(
      "scratch directory is outside the repository checkout",
      !scratch.startsWith(REPO_ROOT),
      toPosix(scratch),
    );

    // --- 2. Install into a clean consumer --------------------------------
    fs.writeFileSync(
      path.join(consumerDir, "package.json"),
      `${JSON.stringify({ name: "agdi-install-smoke", version: "0.0.0", private: true }, null, 2)}\n`,
      "utf8",
    );
    runNpm(["install", "--no-save", "--no-audit", "--no-fund", tarball], {
      cwd: consumerDir,
      timeoutMs: options.timeoutMs,
    });

    packageRoot = path.join(consumerDir, "node_modules", "agdi");
    installed = fs.existsSync(packageRoot);
    record(
      "installed from the tarball",
      installed,
      installed ? toPosix(packageRoot) : `expected ${toPosix(packageRoot)} to exist`,
    );

    if (!installed) {
      throw new Error("installation did not produce node_modules/agdi");
    }

    const manifest = JSON.parse(fs.readFileSync(path.join(packageRoot, "package.json"), "utf8"));
    const binTarget = typeof manifest.bin === "object" ? manifest.bin.agdi : manifest.bin;
    const entryPath = path.join(packageRoot, toPosix(binTarget ?? "agdi.mjs"));
    const entryExists = fs.existsSync(entryPath);

    record(
      "bin entrypoint present in the installed tree",
      entryExists,
      `${String(binTarget)} -> ${toPosix(path.relative(packageRoot, entryPath))}`,
    );

    if (entryExists) {
      // --- 3. Invoke the installed entrypoint ----------------------------
      const invoke = (args) =>
        execFileSync(process.execPath, [entryPath, ...args], {
          cwd: consumerDir,
          encoding: "utf8",
          stdio: ["ignore", "pipe", "pipe"],
          timeout: options.timeoutMs,
          env: { ...process.env, AGDI_NO_TELEMETRY: "1", CI: "1" },
        });

      const version = invoke(["--version"]).trim();
      record(
        "--version runs from the installed artifact",
        version.length > 0,
        version.split("\n").slice(-1)[0] || "(empty output)",
      );

      const help = invoke(["--help"]);
      record(
        "--help runs from the installed artifact",
        help.length > 0,
        `${String(help.split("\n").length)} line(s) of output`,
      );
    } else {
      record("--version runs from the installed artifact", false, "skipped: no bin entrypoint");
      record("--help runs from the installed artifact", false, "skipped: no bin entrypoint");
    }

    // --- 4. Resolve declared exports ------------------------------------
    const unresolved = [];
    for (const subpath of EXPORT_SUBPATHS) {
      try {
        execFileSync(
          process.execPath,
          ["-e", `require.resolve(${JSON.stringify(subpath)})`],
          {
            cwd: consumerDir,
            encoding: "utf8",
            stdio: ["ignore", "pipe", "pipe"],
            timeout: options.timeoutMs,
          },
        );
      } catch (error) {
        unresolved.push(`${subpath} (${String(error.status ?? "error")})`);
      }
    }
    record(
      "declared exports resolve from an installed copy",
      unresolved.length === 0,
      unresolved.length === 0
        ? `resolved ${EXPORT_SUBPATHS.join(", ")}`
        : `unresolved: ${unresolved.join(", ")}`,
    );

    // --- 5. Bundled plugin manifests ------------------------------------
    const missingPlugins = REPRESENTATIVE_PLUGINS.filter((id) => {
      const manifestPath = path.join(packageRoot, "dist", "extensions", id, "openclaw.plugin.json");
      return !fs.existsSync(manifestPath);
    });
    record(
      "representative bundled plugin manifests shipped",
      missingPlugins.length === 0,
      missingPlugins.length === 0
        ? `checked ${REPRESENTATIVE_PLUGINS.join(", ")}`
        : `missing: ${missingPlugins.join(", ")} (a full \`pnpm build\` must run before packing)`,
    );
  } catch (error) {
    record(
      "install smoke completed",
      false,
      error instanceof Error ? error.message : String(error),
    );
  } finally {
    if (!options.keep) {
      fs.rmSync(scratch, { recursive: true, force: true });
    }
  }

  const failed = checks.filter((check) => !check.ok);

  if (options.asJson) {
    console.log(
      JSON.stringify(
        {
          checks,
          failedCount: failed.length,
          scratchDirectory: options.keep ? toPosix(scratch) : null,
        },
        null,
        2,
      ),
    );
  } else {
    console.log("Package install smoke test");
    console.log("");
    for (const check of checks) {
      console.log(`  ${check.ok ? "PASS" : "FAIL"}  ${check.name}`);
      console.log(`        ${check.details}`);
    }
    console.log("");
    console.log(
      failed.length === 0
        ? `All ${String(checks.length)} checks passed.`
        : `${String(failed.length)} of ${String(checks.length)} checks FAILED.`,
    );
    if (options.keep) {
      console.log(`Scratch directory kept at ${toPosix(scratch)}`);
    }
  }

  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

try {
  main();
} catch (error) {
  console.error(
    `test-package-install-smoke: ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exitCode = 1;
}
