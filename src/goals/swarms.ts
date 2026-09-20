import * as fs from "node:fs";
import * as path from "node:path";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import type { GoalStepResult, GoalTask } from "./types.js";

const execAsync = promisify(exec);

export interface SwarmWorktree {
  taskId: string;
  branch: string;
  worktreePath: string;
}

export interface SwarmOptions {
  baseDir?: string;
  maxConcurrency?: number;
  autoCleanup?: boolean;
}

export class GitWorktreeSwarm {
  private readonly baseDir: string;
  private readonly maxConcurrency: number;
  private readonly autoCleanup: boolean;
  private activeWorktrees: Map<string, SwarmWorktree> = new Map();

  constructor(options: SwarmOptions = {}) {
    this.baseDir = options.baseDir ?? path.join(process.cwd(), ".agdi", "worktrees");
    this.maxConcurrency = options.maxConcurrency ?? 4;
    this.autoCleanup = options.autoCleanup ?? true;
  }

  private isGitRepo(cwd: string): Promise<boolean> {
    return execAsync("git rev-parse --is-inside-work-tree", { cwd })
      .then(() => true)
      .catch(() => false);
  }

  public async createWorktree(taskId: string, rootCwd = process.cwd()): Promise<SwarmWorktree> {
    const isGit = await this.isGitRepo(rootCwd);
    const sanitizedId = taskId.replace(/[^a-zA-Z0-9_-]/g, "_");
    const branch = `swarm/${sanitizedId}-${Date.now()}`;
    const worktreePath = path.join(this.baseDir, sanitizedId);

    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }

    if (isGit) {
      try {
        await execAsync(`git worktree add -b ${branch} "${worktreePath}" HEAD`, { cwd: rootCwd });
      } catch {
        // If worktree or branch exists, attempt force clean and recreate
        try {
          await execAsync(`git worktree remove --force "${worktreePath}"`, { cwd: rootCwd });
        } catch {
          // ignore
        }
        await execAsync(`git worktree add -b ${branch} "${worktreePath}" HEAD`, { cwd: rootCwd });
      }
    } else {
      // Non-git fallback: create directory
      if (!fs.existsSync(worktreePath)) {
        fs.mkdirSync(worktreePath, { recursive: true });
      }
    }

    const item: SwarmWorktree = { taskId, branch, worktreePath };
    this.activeWorktrees.set(taskId, item);
    return item;
  }

  public async executeTaskInSwarm(
    task: GoalTask,
    rootCwd = process.cwd(),
  ): Promise<GoalStepResult> {
    task.attempts += 1;
    task.startedAt = Date.now();
    task.status = "running";

    if (!task.command) {
      task.status = "completed";
      task.completedAt = Date.now();
      return { taskId: task.id, status: "completed" };
    }

    const worktree = await this.createWorktree(task.id, rootCwd);

    try {
      const { stdout, stderr } = await execAsync(task.command, { cwd: worktree.worktreePath });
      const output = (stdout + (stderr ? `\n${stderr}` : "")).trim();

      task.status = "completed";
      task.result = output;
      task.completedAt = Date.now();

      if (this.autoCleanup) {
        await this.cleanupWorktree(task.id, rootCwd);
      }

      return { taskId: task.id, status: "completed", output };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      task.error = errorMsg;
      task.status = task.attempts >= task.maxAttempts ? "failed" : "pending";

      if (this.autoCleanup) {
        await this.cleanupWorktree(task.id, rootCwd);
      }

      return { taskId: task.id, status: task.status, error: errorMsg };
    }
  }

  public async executeParallelBatch(
    tasks: GoalTask[],
    rootCwd = process.cwd(),
  ): Promise<GoalStepResult[]> {
    const results: GoalStepResult[] = [];
    const queue = [...tasks];

    while (queue.length > 0) {
      const batch = queue.splice(0, this.maxConcurrency);
      const batchResults = await Promise.all(
        batch.map((task) => this.executeTaskInSwarm(task, rootCwd)),
      );
      results.push(...batchResults);
    }

    return results;
  }

  public async cleanupWorktree(taskId: string, rootCwd = process.cwd()): Promise<void> {
    const item = this.activeWorktrees.get(taskId);
    if (!item) return;

    const isGit = await this.isGitRepo(rootCwd);
    if (isGit) {
      try {
        await execAsync(`git worktree remove --force "${item.worktreePath}"`, { cwd: rootCwd });
        await execAsync(`git branch -D ${item.branch}`, { cwd: rootCwd });
      } catch {
        // ignore cleanup errors
      }
    } else {
      try {
        fs.rmSync(item.worktreePath, { recursive: true, force: true });
      } catch {
        // ignore
      }
    }

    this.activeWorktrees.delete(taskId);
  }

  public async cleanupAll(rootCwd = process.cwd()): Promise<void> {
    for (const taskId of [...this.activeWorktrees.keys()]) {
      await this.cleanupWorktree(taskId, rootCwd);
    }
  }
}
