import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  analyzeCiGateIntegrity,
  DOCUMENTED_GATE_SUPPRESSIONS,
  NON_GATE_SUPPRESSIONS,
} from "./check-ci-gate-integrity.mjs";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tempRoots = [];

function createDocRoot(entries = Object.values(DOCUMENTED_GATE_SUPPRESSIONS)) {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "agdi-ci-gate-integrity-"));
  tempRoots.push(repoRoot);
  for (const entry of entries) {
    if (!entry.doc) continue;
    const docPath = path.join(repoRoot, entry.doc);
    fs.mkdirSync(path.dirname(docPath), { recursive: true });
    fs.writeFileSync(docPath, "# stub\n", "utf8");
  }
  return repoRoot;
}

function codesFor(result) {
  return result.violations.map(({ code }) => code);
}

/** A workflow snippet that satisfies every dead-code requirement. */
function wellFormedCiYml() {
  return [
    "jobs:",
    "  deadcode-informational:",
    "    runs-on: ubuntu-latest",
    "    steps:",
    "      - name: Dead code report (informational, non-blocking)",
    "        continue-on-error: true",
    "        run: pnpm deadcode:knip",
    "",
    "  check:",
    "    runs-on: ubuntu-latest",
    "",
  ].join("\n");
}

test.after(() => {
  for (const repoRoot of tempRoots) {
    fs.rmSync(repoRoot, { recursive: true, force: true });
  }
});

test("a required gate masked with || true is rejected", () => {
  const repoRoot = createDocRoot();
  const result = analyzeCiGateIntegrity({
    repoRoot,
    scripts: { "build:plugin-sdk:dts": "tsc -p tsconfig.plugin-sdk.dts.json || true" },
    ciYml: wellFormedCiYml(),
  });
  assert.ok(codesFor(result).includes("unclassified-suppression"));
});

test("documented gate suppressions are accepted only when justified and documented", () => {
  const documentedGateSuppressions = {
    "test:example": { reason: "temporary", owner: "maintainer", doc: "docs/gate.md" },
  };
  const repoRoot = createDocRoot(Object.values(documentedGateSuppressions));
  const result = analyzeCiGateIntegrity({
    repoRoot,
    scripts: { "test:example": "pnpm test || true" },
    ciYml: wellFormedCiYml(),
    documentedGateSuppressions,
  });
  assert.deepEqual(result.violations, []);
});

test("a documented suppression that no longer masks anything is stale", () => {
  const documentedGateSuppressions = {
    "format:check": { reason: "temporary", owner: "maintainer", doc: "docs/gate.md" },
  };
  const repoRoot = createDocRoot(Object.values(documentedGateSuppressions));
  const result = analyzeCiGateIntegrity({
    repoRoot,
    scripts: { "format:check": "oxfmt --check" },
    ciYml: wellFormedCiYml(),
    documentedGateSuppressions,
  });
  assert.ok(codesFor(result).includes("stale-gate-suppression"));
});

test("a documented suppression without reason, owner, or doc is rejected", () => {
  const documentedGateSuppressions = {
    "format:check": { reason: "", owner: "", doc: "docs/missing.md" },
  };
  const result = analyzeCiGateIntegrity({
    scripts: { "format:check": "oxfmt --check || true" },
    ciYml: wellFormedCiYml(),
    documentedGateSuppressions,
  });
  const codes = codesFor(result);
  assert.ok(codes.includes("gate-suppression-missing-reason"));
  assert.ok(codes.includes("gate-suppression-missing-owner"));
  assert.ok(codes.includes("gate-suppression-missing-doc"));
});

test("a non-gate suppression is accepted", () => {
  const scripts = {};
  for (const name of Object.keys(NON_GATE_SUPPRESSIONS)) {
    scripts[name] = "some command || true";
  }
  const result = analyzeCiGateIntegrity({ repoRoot: REPO_ROOT, scripts, ciYml: wellFormedCiYml() });
  assert.deepEqual(result.violations, []);
});

test("an informational job listed as required is rejected", () => {
  const repoRoot = createDocRoot();
  const result = analyzeCiGateIntegrity({
    repoRoot,
    scripts: {},
    ciYml: wellFormedCiYml(),
    requiredCheckNames: ["check", "deadcode-informational"],
  });
  assert.ok(codesFor(result).includes("informational-job-marked-required"));
});

test("the dead-code step may not be masked with || true", () => {
  const result = analyzeCiGateIntegrity({
    repoRoot: REPO_ROOT,
    scripts: {},
    ciYml: [
      "jobs:",
      "  deadcode-informational:",
      "    steps:",
      "      - run: pnpm deadcode:knip || true",
      "",
    ].join("\n"),
  });
  assert.ok(codesFor(result).includes("deadcode-step-suppressed"));
});

test("the dead-code job must be named informational", () => {
  const result = analyzeCiGateIntegrity({
    repoRoot: REPO_ROOT,
    scripts: {},
    ciYml: [
      "jobs:",
      "  check-additional:",
      "    steps:",
      "      - name: Dead code report",
      "        continue-on-error: true",
      "        run: pnpm deadcode:knip",
      "",
    ].join("\n"),
  });
  assert.ok(codesFor(result).includes("deadcode-job-not-named-informational"));
});

test("the real repository satisfies the gate-integrity invariants", async () => {
  const scripts = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, "package.json"), "utf8")).scripts;
  const ciYml = fs.readFileSync(path.join(REPO_ROOT, ".github/workflows/ci.yml"), "utf8");
  const planner = await import(new URL("./test-planner/planner.mjs", import.meta.url).href);
  const manifest = planner.buildCIExecutionManifest(undefined, { env: process.env });
  const result = analyzeCiGateIntegrity({
    repoRoot: REPO_ROOT,
    scripts,
    ciYml,
    requiredCheckNames: manifest.requiredCheckNames ?? [],
  });
  assert.deepEqual(result.violations, []);
  assert.ok(!manifest.requiredCheckNames.includes("deadcode-informational"));
  assert.ok(!manifest.requiredCheckNames.includes("check-additional"));
});
