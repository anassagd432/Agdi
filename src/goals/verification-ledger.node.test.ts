import test from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { VerificationLedger } from "./verification-ledger.js";
import type { Goal } from "./types.js";

test("VerificationLedger: classifies commands correctly", () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "agdi-ledger-test-"));
  try {
    const ledger = new VerificationLedger(tmpDir);

    assert.equal(ledger.classifyCommand("pnpm test").kind, "test");
    assert.equal(ledger.classifyCommand("pytest tests/test_core.py").kind, "test");
    assert.equal(ledger.classifyCommand("pnpm typecheck").kind, "typecheck");
    assert.equal(ledger.classifyCommand("tsc --noEmit").kind, "typecheck");
    assert.equal(ledger.classifyCommand("pnpm lint").kind, "lint");
    assert.equal(ledger.classifyCommand("eslint src/").kind, "lint");
    assert.equal(ledger.classifyCommand("pnpm build").kind, "build");
    assert.equal(ledger.classifyCommand("prettier --check .").kind, "format");
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test("VerificationLedger: records proof tokens with metrics and SHA-256 evidence hash", () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "agdi-ledger-test-"));
  try {
    const ledger = new VerificationLedger(tmpDir);

    const proof = ledger.recordProof({
      command: "pnpm test",
      exitCode: 0,
      output: "4 passed, 0 failed\nDone in 1.2s",
      goalId: "goal-123",
      durationMs: 1200,
    });

    assert.equal(proof.status, "passed");
    assert.equal(proof.kind, "test");
    assert.equal(proof.goalId, "goal-123");
    assert.equal(proof.metrics?.passedCount, 4);
    assert.equal(proof.metrics?.failedCount, 0);
    assert.ok(proof.evidenceHash.length === 64);

    assert.equal(ledger.hasPassingProof("test", "goal-123"), true);
    assert.equal(ledger.hasPassingProof("typecheck", "goal-123"), false);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test("VerificationLedger: verifies goal invariants correctly", () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "agdi-ledger-test-"));
  try {
    const ledger = new VerificationLedger(tmpDir);

    const goal: Goal = {
      id: "goal-verify-1",
      title: "Build Feature",
      description: "Feature implementation",
      status: "in_progress",
      progressPercent: 50,
      tasks: [],
      validationCriteria: ["test", "typecheck"],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    // Initially unverified
    let check = ledger.verifyGoalInvariants(goal);
    assert.equal(check.verified, false);
    assert.deepEqual(check.missingProofs, ["test", "typecheck"]);

    // Record passing test
    ledger.recordProof({
      command: "pnpm test",
      exitCode: 0,
      output: "Tests passed",
      goalId: goal.id,
    });

    check = ledger.verifyGoalInvariants(goal);
    assert.equal(check.verified, false);
    assert.deepEqual(check.missingProofs, ["typecheck"]);

    // Record passing typecheck
    ledger.recordProof({
      command: "pnpm typecheck",
      exitCode: 0,
      output: "Zero errors",
      goalId: goal.id,
    });

    check = ledger.verifyGoalInvariants(goal);
    assert.equal(check.verified, true);
    assert.equal(check.missingProofs.length, 0);
    assert.equal(check.passedProofs.length, 2);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
