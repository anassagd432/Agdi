import { GoalStore } from "./store.js";
import type { Goal, GoalEngineOptions, GoalStepResult, GoalTask } from "./types.js";
import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

export type GoalEventHandler = (event: string, data: Record<string, unknown>) => void;

export class GoalEngine {
  private readonly store: GoalStore;
  private readonly maxConsecutiveFailures: number;
  private listeners: GoalEventHandler[] = [];
  private isRunning: boolean = false;

  constructor(options: GoalEngineOptions = {}) {
    this.store = new GoalStore(options.stateDir);
    this.maxConsecutiveFailures = options.maxConsecutiveFailures ?? 3;
  }

  onEvent(handler: GoalEventHandler): () => void {
    this.listeners.push(handler);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== handler);
    };
  }

  private emit(event: string, data: Record<string, unknown>): void {
    for (const listener of this.listeners) {
      try {
        listener(event, data);
      } catch {
        // ignore listener errors
      }
    }
  }

  getStore(): GoalStore {
    return this.store;
  }

  async runTask(task: GoalTask, cwd?: string): Promise<GoalStepResult> {
    task.attempts += 1;
    task.startedAt = Date.now();
    task.status = "running";

    if (!task.command) {
      task.status = "completed";
      task.completedAt = Date.now();
      return { taskId: task.id, status: "completed" };
    }

    try {
      const { stdout, stderr } = await execAsync(task.command, { cwd: cwd ?? process.cwd() });
      const output = (stdout + (stderr ? `\n${stderr}` : "")).trim();
      task.status = "completed";
      task.result = output;
      task.completedAt = Date.now();
      return { taskId: task.id, status: "completed", output };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      task.error = errorMsg;
      if (task.attempts >= task.maxAttempts) {
        task.status = "failed";
      } else {
        task.status = "pending"; // retry on next tick
      }
      return { taskId: task.id, status: task.status, error: errorMsg };
    }
  }

  async executeGoal(goalId: string, cwd?: string): Promise<Goal> {
    const goal = await this.store.getGoal(goalId);
    if (!goal) {
      throw new Error(`Goal ${goalId} not found`);
    }

    goal.status = "in_progress";
    await this.store.saveGoal(goal);
    this.emit("goal_started", { goalId, title: goal.title });

    let consecutiveFailures = 0;

    while (goal.status === "in_progress") {
      const pendingTask = goal.tasks.find((t) => t.status === "pending");
      if (!pendingTask) {
        this.store.recalculateProgress(goal);
        break;
      }

      this.emit("task_started", { goalId, taskId: pendingTask.id, title: pendingTask.title });
      const result = await this.runTask(pendingTask, cwd);

      if (result.status === "completed") {
        consecutiveFailures = 0;
        this.emit("task_completed", { goalId, taskId: pendingTask.id, result: result.output });
      } else if (result.status === "failed") {
        consecutiveFailures += 1;
        this.emit("task_failed", { goalId, taskId: pendingTask.id, error: result.error });
        if (consecutiveFailures >= this.maxConsecutiveFailures) {
          goal.status = "failed";
          this.emit("goal_failed", { goalId, reason: "Max consecutive task failures reached" });
          break;
        }
      }

      this.store.recalculateProgress(goal);
      await this.store.saveGoal(goal);
    }

    this.store.recalculateProgress(goal);
    await this.store.saveGoal(goal);

    if (goal.status === "completed") {
      this.emit("goal_completed", { goalId, title: goal.title, tasksCount: goal.tasks.length });
    }

    return goal;
  }
}
