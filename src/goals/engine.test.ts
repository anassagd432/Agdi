import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { GoalEngine } from "./engine.js";
import { GoalStore } from "./store.js";

describe("GoalEngine & GoalStore", () => {
  let tempDir: string;
  let engine: GoalEngine;
  let store: GoalStore;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "agdi-goal-test-"));
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
    expect(goal.id).toBeDefined();
    expect(goal.title).toBe("Implement MCP client");
    expect(goal.status).toBe("pending");
    expect(goal.progressPercent).toBe(0);

    const retrieved = await store.getGoal(goal.id);
    expect(retrieved).not.toBeNull();
    expect(retrieved?.id).toBe(goal.id);
  });

  it("adds tasks and calculates progress accurately", async () => {
    const goal = await store.createGoal("Upgrade models");
    const t1 = await store.addTask(goal.id, "Scrape specs");
    const t2 = await store.addTask(goal.id, "Update config");

    expect(t1).not.toBeNull();
    expect(t2).not.toBeNull();

    const updated = await store.getGoal(goal.id);
    expect(updated?.tasks.length).toBe(2);
    expect(updated?.progressPercent).toBe(0);

    if (updated && updated.tasks[0]) {
      updated.tasks[0].status = "completed";
      store.recalculateProgress(updated);
      expect(updated.progressPercent).toBe(50);
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
    expect(finishedGoal.status).toBe("completed");
    expect(finishedGoal.progressPercent).toBe(100);
    expect(finishedGoal.tasks[0]?.result).toBe("step1");
    expect(finishedGoal.tasks[1]?.result).toBe("step2");
    expect(events).toContain("goal_started");
    expect(events).toContain("task_completed");
    expect(events).toContain("goal_completed");
  });
});
