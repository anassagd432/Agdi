#!/usr/bin/env node
/**
 * CI gate integrity checker.
 *
 * A required gate must propagate failure. This checker exists because several
 * required AGDI gates were masked with `|| true`, which turned a red gate into a
 * green one without anyone noticing. It makes that class of regression loud:
 *
 *   1. Every script containing `|| true` must be explicitly classified, either
 *      as a documented gate suppression or as a non-gate use.
 *   2. A documented gate suppression must carry a reason, an owner, and a
 *      documentation reference that exists on disk.
 *   3. A documented gate suppression that no longer masks anything is an error,
 *      so the allowlist cannot rot into a permanent hiding place.
 *   4. The informational dead-code job must stay visibly informational: named
 *      `*-informational`, non-blocking via `continue-on-error`, and absent from
 *      the planner's required check names.
 *
 * Exit code is 1 when any violation is found, so this is safe to chain into
 * `pnpm check`.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SUPPRESSION_MARKER = "|| true";

/**
 * Gates that must propagate failure. Each entry is a script that CI or the
 * `check` chain depends on; a `|| true` here is a false green.
 */
export const REQUIRED_GATES = [
  "build:plugin-sdk:dts",
  "check",
  "format:check",
  "test:unit",
  "typecheck",
];

/**
 * Gate scripts whose `|| true` is deliberate. Each entry needs a reason, an
 * owner, and a documentation path. Emptying this map is the goal.
 */
export const DOCUMENTED_GATE_SUPPRESSIONS = {
  "format:check": {
    reason:
      "219 tracked files still differ from Oxfmt under default settings, and 284 under the " +
      "restored (uncommitted) .oxfmtrc.jsonc. Mass-formatting is not approved, so the gate " +
      "cannot be honest yet. The failure is real and reproducible, not a config artifact.",
    owner: "Anass",
    doc: "docs/audits/phase1-ci-integrity.md",
  },
  "test:unit": {
    reason:
      "The unit suite has genuine failures; src/config/schema.base.generated.test.ts fails " +
      "because the committed baseline is stale (version 2026.3.24 vs package 2026.5.9, plus " +
      "an anyOf/type-array schema drift). Regenerating the baseline is out of scope here.",
    owner: "Anass",
    doc: "docs/audits/phase1-ci-integrity.md",
  },
};

/**
 * Scripts that contain `|| true` but are not gates. Masking here does not hide
 * a required check.
 */
export const NON_GATE_SUPPRESSIONS = {
  "ios:run": {
    reason:
      "The `|| true` guards `xcrun simctl boot`, which fails when the simulator is already " +
      "booted. The following launch is the real assertion. Not a CI gate.",
  },
};

/** Job id of the informational dead-code job, and the command it runs. */
const DEADCODE_JOB_SUFFIX = "-informational";
const DEADCODE_COMMAND = "deadcode:knip";

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * Validate the informational dead-code job in the CI workflow.
 * Deliberately text-based: the workflow is small and this avoids a YAML
 * dependency, while still pinning the properties that matter.
 */
function analyzeDeadcodeJob({ ciYml }) {
  const violations = [];
  if (!isNonEmptyString(ciYml)) {
    violations.push({
      code: "ci-workflow-missing",
      message: ".github/workflows/ci.yml is missing or empty.",
    });
    return violations;
  }

  const lines = ciYml.split("\n");
  const commandIndex = lines.findIndex((line) => line.includes(DEADCODE_COMMAND));
  if (commandIndex === -1) {
    violations.push({
      code: "deadcode-job-missing",
      message: `No step running \`${DEADCODE_COMMAND}\` found in the CI workflow.`,
    });
    return violations;
  }

  // A job header is a two-space-indented `name:` line at top level of `jobs:`.
  const jobHeaderPattern = /^ {2}([A-Za-z0-9_-]+):\s*$/u;
  let jobStart = -1;
  let jobId = null;
  for (let index = commandIndex; index >= 0; index -= 1) {
    const match = jobHeaderPattern.exec(lines[index]);
    if (match) {
      jobStart = index;
      jobId = match[1];
      break;
    }
  }
  if (jobId === null) {
    violations.push({
      code: "deadcode-job-unresolved",
      message: "Could not resolve the job id that owns the dead-code step.",
    });
    return violations;
  }

  // The job body runs until the next job header (or end of file).
  let jobEnd = lines.length;
  for (let index = jobStart + 1; index < lines.length; index += 1) {
    if (jobHeaderPattern.test(lines[index])) {
      jobEnd = index;
      break;
    }
  }
  const jobBlock = lines.slice(jobStart, jobEnd).join("\n");

  if (jobBlock.includes(SUPPRESSION_MARKER)) {
    violations.push({
      code: "deadcode-step-suppressed",
      message:
        `The dead-code job still uses \`${SUPPRESSION_MARKER}\`. Use \`continue-on-error: true\` ` +
        "instead so the non-blocking status is visible in the workflow run.",
    });
  }

  if (!jobBlock.includes("continue-on-error: true")) {
    violations.push({
      code: "deadcode-step-not-marked-informational",
      message:
        `The dead-code job ("${jobId}") must declare \`continue-on-error: true\` to stay visibly ` +
        "informational.",
    });
  }

  if (!jobId.endsWith(DEADCODE_JOB_SUFFIX)) {
    violations.push({
      code: "deadcode-job-not-named-informational",
      message:
        `Dead-code job id "${jobId}" must end with "${DEADCODE_JOB_SUFFIX}" so it cannot be ` +
        "mistaken for a required green check.",
    });
  }

  return violations;
}

/**
 * Core analysis, exported so focused tests can drive it with synthetic input.
 */
export function analyzeCiGateIntegrity({
  repoRoot = REPO_ROOT,
  scripts,
  ciYml,
  requiredCheckNames = [],
} = {}) {
  const violations = [];

  if (!scripts || typeof scripts !== "object") {
    violations.push({ code: "scripts-missing", message: "No package.json scripts were provided." });
    return { violations, suppressed: [], required: [...REQUIRED_GATES] };
  }

  const suppressedScripts = Object.entries(scripts)
    .filter(([, command]) => typeof command === "string" && command.includes(SUPPRESSION_MARKER))
    .map(([name]) => name)
    .sort();

  // 1. Every suppression must be classified.
  for (const name of suppressedScripts) {
    if (name in DOCUMENTED_GATE_SUPPRESSIONS || name in NON_GATE_SUPPRESSIONS) {
      continue;
    }
    violations.push({
      code: "unclassified-suppression",
      message:
        `Script "${name}" uses \`${SUPPRESSION_MARKER}\` but is not classified. Either remove ` +
        "the suppression or add a documented entry explaining why it is safe.",
    });
  }

  // 2. A documented gate suppression must be real, justified, and documented.
  for (const [name, entry] of Object.entries(DOCUMENTED_GATE_SUPPRESSIONS)) {
    const command = scripts[name];
    if (typeof command !== "string") {
      violations.push({
        code: "documented-gate-missing",
        message: `Documented gate suppression "${name}" no longer exists in package.json.`,
      });
      continue;
    }
    if (!command.includes(SUPPRESSION_MARKER)) {
      violations.push({
        code: "stale-gate-suppression",
        message:
          `Script "${name}" no longer uses \`${SUPPRESSION_MARKER}\`, so it is now honest. ` +
          "Remove it from DOCUMENTED_GATE_SUPPRESSIONS to keep the allowlist empty.",
      });
    }
    if (!isNonEmptyString(entry.reason)) {
      violations.push({
        code: "gate-suppression-missing-reason",
        message: `Documented gate suppression "${name}" has no reason.`,
      });
    }
    if (!isNonEmptyString(entry.owner)) {
      violations.push({
        code: "gate-suppression-missing-owner",
        message: `Documented gate suppression "${name}" has no owner.`,
      });
    }
    if (!isNonEmptyString(entry.doc) || !fs.existsSync(path.join(repoRoot, entry.doc))) {
      violations.push({
        code: "gate-suppression-missing-doc",
        message: `Documented gate suppression "${name}" must reference a documentation file that exists.`,
      });
    }
  }

  // 3. A non-gate suppression must not secretly be a required gate.
  for (const name of Object.keys(NON_GATE_SUPPRESSIONS)) {
    if (REQUIRED_GATES.includes(name)) {
      violations.push({
        code: "non-gate-suppression-is-required-gate",
        message: `"${name}" is listed both as a required gate and as a non-gate suppression.`,
      });
    }
  }

  // 4. The informational job must not be advertised as required.
  for (const name of requiredCheckNames) {
    if (typeof name === "string" && name.endsWith(DEADCODE_JOB_SUFFIX)) {
      violations.push({
        code: "informational-job-marked-required",
        message:
          `"${name}" is informational but is listed in requiredCheckNames. Remove it so CI ` +
          "cannot claim it as a required green check.",
      });
    }
  }

  violations.push(...analyzeDeadcodeJob({ ciYml }));

  return { violations, suppressed: suppressedScripts, required: [...REQUIRED_GATES] };
}

function readRepoFiles(repoRoot) {
  const packageJson = JSON.parse(fs.readFileSync(path.join(repoRoot, "package.json"), "utf8"));
  let ciYml = "";
  try {
    ciYml = fs.readFileSync(path.join(repoRoot, ".github/workflows/ci.yml"), "utf8");
  } catch {
    ciYml = "";
  }
  return { scripts: packageJson.scripts ?? {}, ciYml };
}

async function loadRequiredCheckNames(repoRoot) {
  try {
    const plannerPath = path.join(repoRoot, "scripts/test-planner/planner.mjs");
    const planner = await import(pathToFileURL(plannerPath).href);
    const manifest = planner.buildCIExecutionManifest(undefined, { env: process.env });
    return manifest.requiredCheckNames ?? [];
  } catch {
    // The planner needs a git working tree; treat an unavailable planner as
    // "nothing to cross-check" rather than a hard failure.
    return [];
  }
}

async function main() {
  const repoRoot = REPO_ROOT;
  const { scripts, ciYml } = readRepoFiles(repoRoot);
  const requiredCheckNames = await loadRequiredCheckNames(repoRoot);
  const { violations, suppressed } = analyzeCiGateIntegrity({
    repoRoot,
    scripts,
    ciYml,
    requiredCheckNames,
  });

  if (violations.length === 0) {
    console.log(
      `[ci-gate-integrity] ok: ${String(suppressed.length)} suppressed script(s), ` +
        `${String(Object.keys(DOCUMENTED_GATE_SUPPRESSIONS).length)} documented gate suppression(s).`,
    );
    for (const name of suppressed) {
      console.log(`[ci-gate-integrity]   suppressed: ${name}`);
    }
    return;
  }

  console.error(`[ci-gate-integrity] ${String(violations.length)} violation(s):`);
  for (const violation of violations) {
    console.error(`  - ${violation.code}: ${violation.message}`);
  }
  process.exitCode = 1;
}

// `pathToFileURL` (not `new URL(..., "file://")`) is required here: the latter
// treats a Windows drive letter as a URL scheme and never matches import.meta.url.
const invokedPath = process.argv[1];
if (invokedPath && import.meta.url === pathToFileURL(invokedPath).href) {
  await main();
}
