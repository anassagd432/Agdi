import test from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { GitWorktreeSwarm } from "./swarms.js";
import type { GoalTask } from "./types.js";

test("GitWorktreeSwarm: creates and cleans up isolated worktree", async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "agdi-swarm-test-"));
  try {
    const swarm = new GitWorktreeSwarm({ baseDir: tmpDir, autoCleanup: false });
    const worktree = await swarm.createWorktree("task-1");

    assert.ok(fs.existsSync(worktree.worktreePath));
    assert.equal(worktree.taskId, "task-1");

    await swarm.cleanupWorktree("task-1");
    assert.ok(!fs.existsSync(worktree.worktreePath));
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test("GitWorktreeSwarm: executes parallel batch tasks", async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "agdi-swarm-batch-"));
  try {
    const swarm = new GitWorktreeSwarm({ baseDir: tmpDir, maxConcurrency: 2, autoCleanup: true });

    const tasks: GoalTask[] = [
      {
        id: "batch-1",
        title: "Echo task 1",
        command: "node -e \"console.log('batch-1-done')\"",
        status: "pending",
        attempts: 0,
        maxAttempts: 2,
      },
      {
        id: "batch-2",
        title: "Echo task 2",
        command: "node -e \"console.log('batch-2-done')\"",
        status: "pending",
        attempts: 0,
        maxAttempts: 2,
      },
    ];

    const results = await swarm.executeParallelBatch(tasks);

    assert.equal(results.length, 2);
    assert.equal(results[0].status, "completed");
    assert.ok(results[0].output?.includes("batch-1-done"));
    assert.equal(results[1].status, "completed");
    assert.ok(results[1].output?.includes("batch-2-done"));
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
