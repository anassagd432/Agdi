import test, { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { GoalEngine } from "./engine.js";
import { GoalStore } from "./store.js";

describe("GoalEngine Native Tests", () => {
  let tempDir: string;
  let engine: GoalEngine;
  let store: GoalStore;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "agdi-goal-native-test-"));
    engine = new GoalEngine({ stateDir: tempDir });
    store = engine.getStore();
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // ignore cleanup errors
    }
  });

  it("creates and retrieves a goal", async () => {
    const goal = await store.createGoal("Implement MCP client", "Add stdio client");
    assert.ok(goal.id);
    assert.equal(goal.title, "Implement MCP client");
    assert.equal(goal.status, "pending");
    assert.equal(goal.progressPercent, 0);

    const retrieved = await store.getGoal(goal.id);
    assert.ok(retrieved);
    assert.equal(retrieved?.id, goal.id);
  });

  it("adds tasks and calculates progress accurately", async () => {
    const goal = await store.createGoal("Upgrade models");
    const t1 = await store.addTask(goal.id, "Scrape specs");
    const t2 = await store.addTask(goal.id, "Update config");

    assert.ok(t1);
    assert.ok(t2);

    const updated = await store.getGoal(goal.id);
    assert.equal(updated?.tasks.length, 2);
    assert.equal(updated?.progressPercent, 0);

    if (updated && updated.tasks[0]) {
      updated.tasks[0].status = "completed";
      store.recalculateProgress(updated);
      assert.equal(updated.progressPercent, 50);
    }
  });

  it("executes goal tasks to completion", async () => {
    const goal = await store.createGoal("Run autonomous tasks");
    await store.addTask(goal.id, "Task 1", "node -e \"process.stdout.write('step1')\"");
    await store.addTask(goal.id, "Task 2", "node -e \"process.stdout.write('step2')\"");

    const events: string[] = [];
    engine.onEvent((event) => {
      events.push(event);
    });

    const finishedGoal = await engine.executeGoal(goal.id);
    assert.equal(finishedGoal.status, "completed");
    assert.equal(finishedGoal.progressPercent, 100);
    assert.equal(finishedGoal.tasks[0]?.result, "step1");
    assert.equal(finishedGoal.tasks[1]?.result, "step2");
    assert.ok(events.includes("goal_started"));
    assert.ok(events.includes("task_completed"));
    assert.ok(events.includes("goal_completed"));
  });
});
