#!/usr/bin/env node
/**
 * Package/tarball smoke check for AGDI.
 *
 * Proves four things about the artifact that `npm pack` would publish:
 *   1. Required provenance files are present in the tarball.
 *   2. No credentials, session logs, or stray diagnostics are present.
 *   3. Declared entrypoints (main, exports, bin) resolve inside the tarball.
 *   4. The check runs against an extracted tarball, not the source checkout.
 *
 * Forbidden-content rules are split by scope: secrets are checked everywhere,
 * while artifact-hygiene rules only apply to first-party paths. The packaging
 * policy for `node_modules` paths is shared with `scripts/release-check.ts` via
 * `./lib/pack-path-policy.mjs`.
 *
 * It does not build. `npm pack` has no prepack/prepare hook in this package, so
 * the tarball reflects whatever is already in dist/. A missing entrypoint is
 * reported as a failure, not repaired.
 *
 * Usage:
 *   node scripts/check-package-artifact-smoke.mjs
 *   node scripts/check-package-artifact-smoke.mjs --json
 *   node scripts/check-package-artifact-smoke.mjs --keep   (leave the scratch dir)
 *
 * Exit codes: 0 = all checks passed, 1 = at least one check failed.
 */

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  isFirstPartyPackPath,
  isForbiddenVendoredDependencyPath,
} from "./lib/pack-path-policy.mjs";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// On Windows npm is a .cmd shim. Node 22 refuses to spawn .cmd files without a
// shell, so resolve npm's CLI entrypoint and run it through the current Node
// binary instead of relying on shell quoting.
const IS_WINDOWS = process.platform === "win32";

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

/**
 * Provenance and license files that must ship. Paths are tarball-relative
 * (npm strips the leading `package/`).
 */
const REQUIRED_FILES = [
  "LICENSE",
  "THIRD_PARTY_NOTICES.md",
  "README.md",
  "CHANGELOG.md",
  "docs/reference/provenance.md",
  "skills/skill-creator/license.txt",
];

/**
 * Diagnostic extensions that a build never emits. Measured against a real
 * `pnpm build` of this repository, `dist/` contains only `.js`, `.mjs`, `.cjs`,
 * `.json`, `.d.ts`, `.map`, `.md`, `.mdx`, `.prose`, `.hoon`, `.yml`, `.lua`,
 * `.html`, `.css`, `.svg`, `.wasm`, `.node`, and extensionless license files.
 * A file under `dist/` with one of the extensions below is a stray artifact.
 *
 * Only first-party paths are scanned, and that scoping is applied by
 * `classifyForbidden`, not by `isStrayDistDiagnostic` itself. Vendored third-party
 * packages staged under `dist/extensions/<id>/node_modules/` legitimately ship
 * their own `.txt` license files (for example `tslib/LICENSE.txt`), so
 * `isStrayDistDiagnostic` alone would false-positive on them.
 */
const DIST_DIAGNOSTIC_EXTENSIONS = new Set([
  ".log",
  ".txt",
  ".tmp",
  ".bak",
  ".trace",
  ".heapsnapshot",
]);

/**
 * Diagnostic name suffixes that a build never emits.
 *
 * Extension-only detection misses tool-written reports that carry a normal
 * extension, such as `dist/codex-approved-security-audit.json`, which was observed
 * under `dist/` on 2026-09-22 and would not have been flagged by extension alone.
 *
 * The suffix list was measured against a full `pnpm build` (17,959 files under
 * `dist/`): no first-party build output ends in any of these stems. Two plausible
 * candidates were rejected on evidence because they occur in real build output:
 *   - `scan`    -> `dist/extensions/open-prose/skills/prose/examples/38-skill-scan.prose`
 *   - `profile` -> `dist/extensions/slack/node_modules/@slack/types/dist/common/bot-profile.js`
 */
const DIST_DIAGNOSTIC_NAME_SUFFIXES = [
  "audit",
  "debug",
  "diagnostic",
  "diagnostics",
  "dump",
  "heapsnapshot",
  "report",
  "summary",
  "trace",
  "troubleshoot",
];

function hasDiagnosticNameSuffix(file) {
  const base = path.posix.basename(file);
  const extension = path.posix.extname(base).toLowerCase();
  const stem = base.slice(0, base.length - extension.length).toLowerCase();
  return DIST_DIAGNOSTIC_NAME_SUFFIXES.some(
    (suffix) =>
      stem.endsWith(`-${suffix}`) || stem.endsWith(`_${suffix}`) || stem.endsWith(`.${suffix}`),
  );
}

export function isStrayDistDiagnostic(file) {
  if (!file.startsWith("dist/")) {
    return false;
  }
  const lower = file.toLowerCase();
  if (DIST_DIAGNOSTIC_EXTENSIONS.has(path.posix.extname(lower))) {
    return true;
  }
  return hasDiagnosticNameSuffix(file);
}

/**
 * Secrets and private state. These are evaluated for every packed path, including
 * vendored third-party trees: a leaked credential is a leak wherever it lives.
 * Each entry is [label, matcher]; matcher is a RegExp tested against the
 * tarball-relative POSIX path, or a predicate function.
 */
const SECRET_PATTERNS = [
  ["dotenv file", /(^|\/)\.env($|\.)/],
  ["npm/registry credentials", /(^|\/)\.npmrc$/],
  ["private key material", /\.(pem|key|p12|pfx|jks|keystore)$/i],
  ["ssh private key", /(^|\/)id_(rsa|dsa|ecdsa|ed25519)($|\.)/],
  ["ssh directory", /(^|\/)\.ssh\//],
  ["session state", /(^|\/)sessions?\.json$|\.session$/i],
  ["credential dump", /(^|\/)credentials\.json$|\.credentials\.json$/i],
  ["local agent state", /(^|\/)\.workbuddy-ai\//],
];

/**
 * Artifact hygiene for content this repository authors. Evaluated only for
 * first-party paths (see `isFirstPartyPackPath`), because vendored packages ship
 * their own logs, build info, and license text by design.
 */
const ARTIFACT_HYGIENE_PATTERNS = [
  ["build/session log", /\.log$/i],
  ["typescript build info", /\.tsbuildinfo$/i],
  ["git internals", /(^|\/)\.git\//],
  ["coverage output", /(^|\/)coverage\//],
  ["editor/OS noise", /(^|\/)(\.DS_Store|Thumbs\.db|desktop\.ini)$/i],
  ["diagnostic file under dist/", isStrayDistDiagnostic],
];

/**
 * Packaging-policy violations, shared with `scripts/release-check.ts` via
 * `./lib/pack-path-policy.mjs`. Bundled plugin runtime deps staged under
 * `dist/extensions/<id>/node_modules/` are intentional and allowed; every other
 * `node_modules` path in the pack is an accident.
 */
const POLICY_PATTERNS = [["vendored dependencies", isForbiddenVendoredDependencyPath]];

const ALL_PATTERNS = [...SECRET_PATTERNS, ...ARTIFACT_HYGIENE_PATTERNS, ...POLICY_PATTERNS];

function matches(matcher, file) {
  return typeof matcher === "function" ? matcher(file) : matcher.test(file);
}

/**
 * Return every forbidden-content label a packed path matches.
 * Pure function; exported for the unit test.
 */
export function classifyForbidden(file) {
  const labels = [];
  const firstParty = isFirstPartyPackPath(file);

  for (const [label, matcher] of SECRET_PATTERNS) {
    if (matches(matcher, file)) {
      labels.push(label);
    }
  }
  if (firstParty) {
    for (const [label, matcher] of ARTIFACT_HYGIENE_PATTERNS) {
      if (matches(matcher, file)) {
        labels.push(label);
      }
    }
  }
  for (const [label, matcher] of POLICY_PATTERNS) {
    if (matches(matcher, file)) {
      labels.push(label);
    }
  }

  return labels;
}

/** Entrypoint fields whose targets must exist inside the packed artifact. */
const ENTRYPOINT_FIELDS = ["main", "module", "types"];

function run(command, args, options = {}) {
  return execFileSync(command, args, {
    cwd: REPO_ROOT,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
    ...options,
  });
}

function runNpm(args, options = {}) {
  const { command, prefixArgs, shell } = resolveNpmInvocation();
  return run(command, [...prefixArgs, ...args], { shell: Boolean(shell), ...options });
}

function toPosix(value) {
  return value.split(path.sep).join("/");
}

/**
 * Collect every entrypoint target declared in package.json.
 * Returns [{ field, target, kind }].
 */
export function collectEntrypointTargets(manifest) {
  const targets = [];

  for (const field of ENTRYPOINT_FIELDS) {
    const value = manifest[field];
    if (typeof value === "string" && value.length > 0) {
      targets.push({ field, target: toPosix(value), kind: "file" });
    }
  }

  if (manifest.bin && typeof manifest.bin === "object") {
    for (const [name, target] of Object.entries(manifest.bin)) {
      if (typeof target === "string" && target.length > 0) {
        targets.push({ field: `bin.${name}`, target: toPosix(target), kind: "file" });
      }
    }
  } else if (typeof manifest.bin === "string" && manifest.bin.length > 0) {
    targets.push({ field: "bin", target: toPosix(manifest.bin), kind: "file" });
  }

  if (manifest.exports && typeof manifest.exports === "object") {
    for (const [subpath, value] of Object.entries(manifest.exports)) {
      // Node supports both string shorthand and condition maps.
      if (typeof value === "string") {
        targets.push({ field: `exports["${subpath}"]`, target: toPosix(value), kind: "file" });
        continue;
      }
      if (value && typeof value === "object") {
        for (const [condition, conditionTarget] of Object.entries(value)) {
          if (typeof conditionTarget === "string" && conditionTarget.length > 0) {
            targets.push({
              field: `exports["${subpath}"].${condition}`,
              target: toPosix(conditionTarget),
              kind: "file",
            });
          }
        }
      }
    }
  }

  return targets;
}

function dryRunPack() {
  const raw = runNpm(["pack", "--dry-run", "--ignore-scripts", "--json"]);
  const parsed = JSON.parse(raw);
  const entry = Array.isArray(parsed) ? parsed[0] : parsed;
  if (!entry || !Array.isArray(entry.files)) {
    throw new Error("npm pack --dry-run --json did not return a files array");
  }
  return {
    filename: entry.filename,
    fileCount: entry.files.length,
    files: entry.files.map((file) => toPosix(file.path)),
  };
}

function realPack(destination) {
  const raw = runNpm(["pack", "--ignore-scripts", "--json", "--pack-destination", destination]);
  const parsed = JSON.parse(raw);
  const entry = Array.isArray(parsed) ? parsed[0] : parsed;
  if (!entry || typeof entry.filename !== "string") {
    throw new Error("npm pack --json did not return a filename");
  }
  return path.join(destination, entry.filename);
}

function resolveTar() {
  if (IS_WINDOWS) {
    // Prefer the Windows bsdtar. An MSYS/Git-Bash tar on PATH reads "C:\..."
    // as a remote host spec and fails with "Cannot connect to C".
    const systemTar = path.join(process.env.SystemRoot ?? "C:\\Windows", "System32", "tar.exe");
    if (fs.existsSync(systemTar)) {
      return systemTar;
    }
  }
  return "tar";
}

function extractTarball(tarballPath, destination) {
  run(resolveTar(), ["-xzf", tarballPath, "-C", destination], { cwd: destination });
  const packageDir = path.join(destination, "package");
  if (!fs.existsSync(packageDir)) {
    throw new Error(`extracted tarball has no package/ directory at ${packageDir}`);
  }
  return packageDir;
}

function main() {
  const argv = process.argv.slice(2);
  const asJson = argv.includes("--json");
  const keep = argv.includes("--keep");

  const checks = [];
  const record = (name, ok, details) => {
    checks.push({ name, ok, details });
  };

  // --- 1. Dry-run pack: required provenance files -------------------------
  const dry = dryRunPack();
  const packed = new Set(dry.files);

  const missingRequired = REQUIRED_FILES.filter((file) => !packed.has(file));
  record(
    "required provenance files present",
    missingRequired.length === 0,
    missingRequired.length === 0
      ? `all ${REQUIRED_FILES.length} required files present`
      : `missing: ${missingRequired.join(", ")}`,
  );

  // --- 2. Dry-run pack: forbidden content --------------------------------
  const violations = [];
  for (const file of dry.files) {
    for (const label of classifyForbidden(file)) {
      violations.push({ label, file });
    }
  }
  record(
    "no credentials, session logs, or private config",
    violations.length === 0,
    violations.length === 0
      ? `scanned ${dry.files.length} paths against ${ALL_PATTERNS.length} patterns`
      : `${violations.length} violation(s): ${violations
          .slice(0, 12)
          .map((v) => `${v.label} -> ${v.file}`)
          .join("; ")}`,
  );

  // --- 3. Real pack + extract outside the checkout -----------------------
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "agdi-package-smoke-"));
  let packageDir;
  let tarballPath;
  try {
    tarballPath = realPack(scratch);
    packageDir = extractTarball(tarballPath, scratch);

    const manifestPath = path.join(packageDir, "package.json");
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

    const targets = collectEntrypointTargets(manifest);
    const unresolved = [];
    const resolved = [];
    for (const item of targets) {
      const absolute = path.join(packageDir, item.target);
      if (fs.existsSync(absolute)) {
        resolved.push(item);
      } else {
        unresolved.push(item);
      }
    }

    record(
      "declared entrypoints resolve in the extracted artifact",
      unresolved.length === 0,
      unresolved.length === 0
        ? `all ${targets.length} declared targets exist`
        : `${unresolved.length} of ${targets.length} unresolved (${resolved.length} resolve: ${
            resolved.map((item) => item.target).join(", ") || "none"
          }); first missing: ${unresolved
            .slice(0, 6)
            .map((item) => `${item.field} -> ${item.target}`)
            .join("; ")}`,
    );

    // The tarball must not be empty of runtime code.
    const jsFiles = [];
    const walk = (dir) => {
      for (const dirent of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, dirent.name);
        if (dirent.isDirectory()) {
          walk(full);
        } else if (dirent.name.endsWith(".js") || dirent.name.endsWith(".mjs")) {
          jsFiles.push(toPosix(path.relative(packageDir, full)));
        }
      }
    };
    walk(packageDir);
    record(
      "artifact contains runtime JavaScript",
      jsFiles.length > 0,
      jsFiles.length > 0
        ? `${jsFiles.length} .js/.mjs file(s)`
        : "no .js or .mjs files in the tarball; a build step must run before packing",
    );

    record(
      "smoke ran outside the repository checkout",
      !packageDir.startsWith(REPO_ROOT),
      `artifact extracted to ${packageDir}`,
    );
  } finally {
    if (!keep) {
      fs.rmSync(scratch, { recursive: true, force: true });
    }
  }

  const failed = checks.filter((check) => !check.ok);

  if (asJson) {
    console.log(
      JSON.stringify(
        {
          packageFileCount: dry.fileCount,
          tarballFilename: dry.filename,
          checks,
          failedCount: failed.length,
        },
        null,
        2,
      ),
    );
  } else {
    console.log(`Package artifact smoke check`);
    console.log(`  dry-run file count: ${dry.fileCount}`);
    console.log(`  tarball: ${dry.filename}`);
    console.log("");
    for (const check of checks) {
      console.log(`  ${check.ok ? "PASS" : "FAIL"}  ${check.name}`);
      console.log(`        ${check.details}`);
    }
    console.log("");
    console.log(
      failed.length === 0
        ? `All ${checks.length} checks passed.`
        : `${failed.length} of ${checks.length} checks FAILED.`,
    );
  }

  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

// Only run the pack when executed directly, so the pure helpers can be
// imported by the unit test without spawning npm.
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main();
}
