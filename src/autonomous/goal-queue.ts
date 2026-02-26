/**
 * Persistent priority goal queue.
 *
 * Goals are stored in a JSON file on disk so they survive process restarts.
 * The queue is sorted by priority (critical > high > normal > low) and then
 * by creation time (oldest first within the same priority).
 */

import { randomUUID } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import type { Goal, GoalPriority, GoalStatus, GoalType } from "./types.js";

const PRIORITY_ORDER: Record<GoalPriority, number> = {
  critical: 0,
  high: 1,
  normal: 2,
  low: 3,
};

export class GoalQueue {
  private goals: Goal[] = [];
  private readonly filePath: string;

  constructor(dataDir: string) {
    this.filePath = join(dataDir, "goals.json");
    this.load();
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /** Add a new goal to the queue. Returns the created goal. */
  add(opts: {
    description: string;
    type?: GoalType;
    priority?: GoalPriority;
    schedule?: string;
    maxRetries?: number;
  }): Goal {
    const now = new Date().toISOString();
    const goal: Goal = {
      id: randomUUID(),
      description: opts.description,
      type: opts.type ?? "one-time",
      priority: opts.priority ?? "normal",
      status: "pending",
      retries: 0,
      maxRetries: opts.maxRetries ?? 3,
      context: [],
      createdAt: now,
      updatedAt: now,
      schedule: opts.schedule,
    };
    this.goals.push(goal);
    this.sort();
    this.persist();
    return goal;
  }

  /** Peek at the highest-priority pending goal without removing it. */
  peek(): Goal | null {
    return this.goals.find((g) => g.status === "pending" || g.status === "in-progress") ?? null;
  }

  /** Mark a goal as in-progress. */
  start(goalId: string): void {
    this.updateStatus(goalId, "in-progress");
  }

  /** Mark a goal as completed. */
  complete(goalId: string): void {
    this.updateStatus(goalId, "completed");
  }

  /** Mark a goal as failed with an error message. */
  fail(goalId: string, error: string): void {
    const goal = this.findById(goalId);
    if (goal) {
      goal.status = "failed";
      goal.lastError = error;
      goal.updatedAt = new Date().toISOString();
      this.persist();
    }
  }

  /** Pause a goal (e.g. waiting for user input). */
  pause(goalId: string): void {
    this.updateStatus(goalId, "paused");
  }

  /** Requeue a goal for retry with updated context. */
  requeue(goalId: string, contextAddition?: string): void {
    const goal = this.findById(goalId);
    if (goal) {
      goal.status = "pending";
      goal.retries += 1;
      if (contextAddition) {
        goal.context.push(contextAddition);
      }
      goal.updatedAt = new Date().toISOString();
      this.sort();
      this.persist();
    }
  }

  /** Requeue a goal with elevated priority. */
  requeueWithPriority(goalId: string, priority: GoalPriority): void {
    const goal = this.findById(goalId);
    if (goal) {
      goal.priority = priority;
      goal.status = "pending";
      goal.retries += 1;
      goal.updatedAt = new Date().toISOString();
      this.sort();
      this.persist();
    }
  }

  /** List all goals, optionally filtered by status. */
  list(status?: GoalStatus): Goal[] {
    if (status) {
      return this.goals.filter((g) => g.status === status);
    }
    return [...this.goals];
  }

  /** Get a goal by ID. */
  findById(goalId: string): Goal | null {
    return this.goals.find((g) => g.id === goalId) ?? null;
  }

  /** Remove completed and failed goals older than the given age (ms). */
  cleanup(maxAgeMs: number = 7 * 24 * 60 * 60 * 1000): number {
    const cutoff = Date.now() - maxAgeMs;
    const before = this.goals.length;
    this.goals = this.goals.filter((g) => {
      if (g.status !== "completed" && g.status !== "failed") return true;
      return new Date(g.updatedAt).getTime() > cutoff;
    });
    const removed = before - this.goals.length;
    if (removed > 0) this.persist();
    return removed;
  }

  /** How many active (pending + in-progress) goals are in the queue. */
  get activeCount(): number {
    return this.goals.filter((g) => g.status === "pending" || g.status === "in-progress").length;
  }

  /** Total number of goals tracked. */
  get totalCount(): number {
    return this.goals.length;
  }

  // ---------------------------------------------------------------------------
  // Internals
  // ---------------------------------------------------------------------------

  private updateStatus(goalId: string, status: GoalStatus): void {
    const goal = this.findById(goalId);
    if (goal) {
      goal.status = status;
      goal.updatedAt = new Date().toISOString();
      this.persist();
    }
  }

  private sort(): void {
    this.goals.sort((a, b) => {
      // Active goals first
      const aActive = a.status === "pending" || a.status === "in-progress" ? 0 : 1;
      const bActive = b.status === "pending" || b.status === "in-progress" ? 0 : 1;
      if (aActive !== bActive) return aActive - bActive;

      // Then by priority
      const pa = PRIORITY_ORDER[a.priority] ?? 99;
      const pb = PRIORITY_ORDER[b.priority] ?? 99;
      if (pa !== pb) return pa - pb;

      // Then by creation time (oldest first)
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
  }

  private persist(): void {
    try {
      const dir = dirname(this.filePath);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
      writeFileSync(this.filePath, JSON.stringify(this.goals, null, 2), "utf-8");
    } catch {
      // Silent fail — we don't want persistence issues to crash the agent
    }
  }

  private load(): void {
    try {
      if (existsSync(this.filePath)) {
        const raw = readFileSync(this.filePath, "utf-8");
        const parsed = JSON.parse(raw) as Goal[];
        if (Array.isArray(parsed)) {
          this.goals = parsed;
          // Re-activate any goals that were in-progress when we shut down
          for (const goal of this.goals) {
            if (goal.status === "in-progress") {
              goal.status = "pending";
            }
          }
          this.sort();
        }
      }
    } catch {
      this.goals = [];
    }
  }
}
