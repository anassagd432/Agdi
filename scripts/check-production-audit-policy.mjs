#!/usr/bin/env node
/**
 * Evaluate a `pnpm audit --prod --json` report against a versioned exception policy.
 *
 * Why this exists: a raw advisory count is not a decision. `pnpm audit` exits 1
 * whenever any advisory exists, which is unactionable, and a permanently red job
 * gets ignored. This gate makes the decision explicit: every critical or high
 * production finding must either be gone, or be covered by an exception that
 * names an owner, a rationale, a reachability statement, a compensating control,
 * a residual risk, an approver, and an expiry date.
 *
 * Fail-closed rules:
 *   1. A critical/high advisory with no matching exception fails the gate.
 *   2. An exception whose `expiresOn` has passed fails the gate.
 *   3. An exception that matches no current advisory fails the gate, so the
 *      registry has to shrink as findings are fixed. An exception is not a
 *      permanent allowance.
 *   4. An exception missing any required field fails the gate.
 *
 * Usage:
 *   pnpm audit --prod --json > audit.json
 *   node scripts/check-production-audit-policy.mjs < audit.json
 *   node scripts/check-production-audit-policy.mjs --input audit.json
 *   node scripts/check-production-audit-policy.mjs --input audit.json --json
 *   node scripts/check-production-audit-policy.mjs --input audit.json --policy path/to/policy.json
 *
 * Exit codes: 0 = policy satisfied, 1 = violation or the check could not run.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_POLICY_PATH = path.join(REPO_ROOT, ".github", "production-audit-exceptions.json");

/** Severities that must be handled before a release. */
const BLOCKING_SEVERITIES = new Set(["critical", "high"]);

/** Fields every exception must carry. Missing any one of them is a violation. */
const REQUIRED_EXCEPTION_FIELDS = [
  "id",
  "module",
  "advisory",
  "severity",
  "owner",
  "grantedOn",
  "expiresOn",
  "rationale",
  "reachability",
  "compensatingControl",
  "residualRisk",
  "approvedBy",
];

function parseArgs(argv) {
  const options = { input: null, policy: DEFAULT_POLICY_PATH, asJson: false, today: null };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--json") {
      options.asJson = true;
      continue;
    }
    if (arg === "--input") {
      options.input = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === "--policy") {
      options.policy = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === "--today") {
      options.today = argv[index + 1];
      index += 1;
      continue;
    }
    throw new Error(`unknown argument: ${arg}`);
  }
  return options;
}

function readStdin() {
  try {
    return fs.readFileSync(0, "utf8");
  } catch {
    return "";
  }
}

/**
 * Normalise the audit report into `[{ module, advisory, severity }]`.
 *
 * pnpm has shipped the advisory list both as an object keyed by numeric id and as
 * an array, and a given advisory can affect several installed copies of one
 * module, so results are de-duplicated on module + advisory.
 */
function collectAdvisories(report) {
  const raw = report.advisories;
  const list = Array.isArray(raw) ? raw : raw ? Object.values(raw) : [];
  const seen = new Map();

  for (const entry of list) {
    if (!entry || typeof entry !== "object") {
      continue;
    }
    const moduleName = entry.module_name ?? entry.moduleName ?? "unknown";
    const advisory = entry.github_advisory_id ?? entry.advisory ?? entry.id ?? "unknown";
    const severity = String(entry.severity ?? "unknown").toLowerCase();
    const key = `${moduleName}::${advisory}`;
    if (!seen.has(key)) {
      seen.set(key, {
        module: moduleName,
        advisory,
        severity,
        vulnerableVersions: entry.vulnerable_versions ?? null,
        patchedVersions: entry.patched_versions ?? null,
      });
    }
  }

  return [...seen.values()].toSorted(
    (left, right) =>
      left.module.localeCompare(right.module) || left.advisory.localeCompare(right.advisory),
  );
}

function matches(exception, advisory) {
  const moduleMatches = exception.module === "*" || exception.module === advisory.module;
  const advisoryMatches = exception.advisory === "*" || exception.advisory === advisory.advisory;
  return moduleMatches && advisoryMatches;
}

function daysBetween(fromIso, toIso) {
  const from = Date.parse(`${fromIso}T00:00:00Z`);
  const to = Date.parse(`${toIso}T00:00:00Z`);
  if (Number.isNaN(from) || Number.isNaN(to)) {
    return null;
  }
  return Math.round((to - from) / 86_400_000);
}

function main() {
  const options = parseArgs(process.argv.slice(2));

  if (!fs.existsSync(options.policy)) {
    throw new Error(`policy file not found: ${path.relative(REPO_ROOT, options.policy)}`);
  }
  const policy = JSON.parse(fs.readFileSync(options.policy, "utf8"));
  const exceptions = Array.isArray(policy.exceptions) ? policy.exceptions : [];

  const rawInput = options.input ? fs.readFileSync(options.input, "utf8") : readStdin();
  if (rawInput.trim() === "") {
    throw new Error(
      "no audit report on stdin or --input. Run `pnpm audit --prod --json > audit.json` first.",
    );
  }
  const report = JSON.parse(rawInput);
  const advisories = collectAdvisories(report);

  const today = options.today ?? new Date().toISOString().slice(0, 10);

  const violations = [];
  const warnings = [];

  // Rule 4: every exception must be complete.
  const incomplete = [];
  for (const exception of exceptions) {
    const missing = REQUIRED_EXCEPTION_FIELDS.filter((field) => {
      const value = exception[field];
      return value === undefined || value === null || String(value).trim() === "";
    });
    if (missing.length > 0) {
      incomplete.push({ exception, missing });
      violations.push(
        `exception ${exception.id ?? "(no id)"} is missing required field(s): ${missing.join(", ")}`,
      );
    }
  }

  // Rule 2: expiry is a hard stop.
  const expired = [];
  for (const exception of exceptions) {
    if (!exception.expiresOn) {
      continue;
    }
    const remaining = daysBetween(today, exception.expiresOn);
    if (remaining === null) {
      violations.push(`exception ${exception.id}: unparseable expiresOn "${exception.expiresOn}"`);
      continue;
    }
    if (remaining < 0) {
      expired.push({ exception, remaining });
      violations.push(
        `exception ${exception.id} expired on ${exception.expiresOn} (${-remaining} day(s) ago); ` +
          "the finding is release-blocking again unless the exception is renewed with fresh evidence",
      );
    }
  }

  // Rule 1: unhandled blocking findings.
  const blocking = advisories.filter((advisory) => BLOCKING_SEVERITIES.has(advisory.severity));
  const unhandled = [];
  const coveredBy = new Map();

  for (const advisory of blocking) {
    const exception = exceptions.find(
      (candidate) =>
        matches(candidate, advisory) &&
        (!candidate.expiresOn || (daysBetween(today, candidate.expiresOn) ?? -1) >= 0),
    );
    if (exception) {
      const list = coveredBy.get(exception.id) ?? [];
      list.push(advisory);
      coveredBy.set(exception.id, list);
    } else {
      unhandled.push(advisory);
    }
  }

  for (const advisory of unhandled) {
    violations.push(
      `unhandled ${advisory.severity} advisory: ${advisory.module} ${advisory.advisory}` +
        (advisory.patchedVersions && advisory.patchedVersions !== "<0.0.0"
          ? ` (patched: ${advisory.patchedVersions})`
          : " (no patched version published)"),
    );
  }

  // Rule 3: the registry must shrink as findings are fixed.
  const stale = [];
  for (const exception of exceptions) {
    const used = coveredBy.get(exception.id) ?? [];
    if (used.length === 0) {
      stale.push(exception);
      violations.push(
        `stale exception ${exception.id}: no current advisory matches ${exception.module} / ${exception.advisory}. ` +
          "Remove it, or the registry never shrinks.",
      );
    }
  }

  const bySeverity = advisories.reduce((accumulator, advisory) => {
    accumulator[advisory.severity] = (accumulator[advisory.severity] ?? 0) + 1;
    return accumulator;
  }, {});

  const moderateOrBelow = advisories.filter(
    (advisory) => !BLOCKING_SEVERITIES.has(advisory.severity),
  );
  if (moderateOrBelow.length > 0) {
    warnings.push(
      `${moderateOrBelow.length} moderate/low advisory(ies) present; not release-blocking under this policy`,
    );
  }

  const passed = violations.length === 0;

  if (options.asJson) {
    console.log(
      JSON.stringify(
        {
          passed,
          policy: path.relative(REPO_ROOT, options.policy).split(path.sep).join("/"),
          policyVersion: policy.version ?? null,
          evaluatedOn: today,
          advisoryCount: advisories.length,
          bySeverity,
          blockingCount: blocking.length,
          exceptionCount: exceptions.length,
          violations,
          warnings,
          unhandled: unhandled.map((advisory) => ({
            module: advisory.module,
            advisory: advisory.advisory,
            severity: advisory.severity,
          })),
          expired: expired.map(({ exception, remaining }) => ({
            id: exception.id,
            expiredOn: exception.expiresOn,
            daysAgo: -remaining,
          })),
          stale: stale.map((exception) => exception.id),
          incomplete: incomplete.map(({ exception, missing }) => ({
            id: exception.id ?? null,
            missing,
          })),
        },
        null,
        2,
      ),
    );
  } else {
    console.log("Production audit policy check");
    console.log(`  policy:            ${path.relative(REPO_ROOT, options.policy)}`);
    console.log(`  evaluated on:      ${today}`);
    console.log(`  advisories:        ${advisories.length} (${JSON.stringify(bySeverity)})`);
    console.log(`  blocking (crit/hi): ${blocking.length}`);
    console.log(`  exceptions:        ${exceptions.length}`);
    console.log("");
    if (passed) {
      console.log("Policy satisfied.");
      for (const warning of warnings) {
        console.log(`  note: ${warning}`);
      }
    } else {
      console.error(`${violations.length} policy violation(s):`);
      for (const violation of violations) {
        console.error(`- ${violation}`);
      }
      console.error("");
      console.error(
        "Each finding must be remediated, or accepted through a time-bounded exception in " +
          `${path.relative(REPO_ROOT, options.policy).split(path.sep).join("/")}. ` +
          "Granting an exception is a maintainer decision, not an automated one.",
      );
    }
  }

  if (!passed) {
    process.exitCode = 1;
  }
}

try {
  main();
} catch (error) {
  console.error(
    `check-production-audit-policy: ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exitCode = 1;
}
