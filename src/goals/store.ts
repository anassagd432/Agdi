import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { resolveStateDir } from "../config/paths.js";
import type { Goal, GoalTask } from "./types.js";

export class GoalStore {
  private readonly goalsDir: string;

  constructor(customDir?: string) {
    const baseDir = customDir ?? resolveStateDir();
    this.goalsDir = path.join(baseDir, "goals");
  }

  private async ensureDir(): Promise<void> {
    await fs.mkdir(this.goalsDir, { recursive: true });
  }

  private getFilePath(id: string): string {
    return path.join(this.goalsDir, `${id}.json`);
  }

  async createGoal(title: string, description: string = "", context?: Record<string, unknown>): Promise<Goal> {
    await this.ensureDir();
    const id = `goal_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`;
    const now = Date.now();
    const goal: Goal = {
      id,
      title,
      description,
      status: "pending",
      progressPercent: 0,
      tasks: [],
      context,
      createdAt: now,
      updatedAt: now,
    };
    await fs.writeFile(this.getFilePath(id), JSON.stringify(goal, null, 2), "utf8");
    return goal;
  }

  async getGoal(id: string): Promise<Goal | null> {
    try {
      const data = await fs.readFile(this.getFilePath(id), "utf8");
      return JSON.parse(data) as Goal;
    } catch {
      return null;
    }
  }

  async listGoals(): Promise<Goal[]> {
    await this.ensureDir();
    const entries = await fs.readdir(this.goalsDir, { withFileTypes: true });
    const goals: Goal[] = [];
    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith(".json")) {
        try {
          const content = await fs.readFile(path.join(this.goalsDir, entry.name), "utf8");
          goals.push(JSON.parse(content) as Goal);
        } catch {
          // ignore corrupted files
        }
      }
    }
    return goals.sort((a, b) => b.createdAt - a.createdAt);
  }

  async saveGoal(goal: Goal): Promise<Goal> {
    await this.ensureDir();
    goal.updatedAt = Date.now();
    await fs.writeFile(this.getFilePath(goal.id), JSON.stringify(goal, null, 2), "utf8");
    return goal;
  }

  async addTask(goalId: string, taskTitle: string, command?: string): Promise<GoalTask | null> {
    const goal = await this.getGoal(goalId);
    if (!goal) return null;

    const task: GoalTask = {
      id: `task_${Date.now()}_${crypto.randomBytes(2).toString("hex")}`,
      title: taskTitle,
      status: "pending",
      command,
      attempts: 0,
      maxAttempts: 3,
    };

    goal.tasks.push(task);
    this.recalculateProgress(goal);
    await this.saveGoal(goal);
    return task;
  }

  recalculateProgress(goal: Goal): void {
    if (goal.tasks.length === 0) {
      goal.progressPercent = goal.status === "completed" ? 100 : 0;
      return;
    }
    const completed = goal.tasks.filter((t) => t.status === "completed" || t.status === "skipped").length;
    goal.progressPercent = Math.round((completed / goal.tasks.length) * 100);
    if (goal.progressPercent === 100) {
      goal.status = "completed";
      goal.completedAt = Date.now();
    } else if (goal.tasks.some((t) => t.status === "running")) {
      goal.status = "in_progress";
    }
  }
}
