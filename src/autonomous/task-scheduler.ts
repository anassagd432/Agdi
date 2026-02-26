/**
 * Task Scheduler — schedule commands and workflows to run automatically.
 *
 * "Open Slack every Monday at 9am"
 * "Run backup workflow every night at midnight"
 * "Check email every 30 minutes"
 *
 * Uses in-process timers (no cron dependency) so it works everywhere.
 */

import type { NLCommander } from "./nl-commander.js";
import type { WorkflowReplay } from "./workflow-replay.js";
import { createSubsystemLogger } from "../logging/subsystem.js";

const log = createSubsystemLogger("scheduler");

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ScheduledTask = {
  id: string;
  name: string;
  type: "command" | "workflow";
  payload: string; // NL command or workflow ID
  schedule: TaskSchedule;
  enabled: boolean;
  lastRun?: number;
  nextRun: number;
  runCount: number;
  createdAt: number;
};

export type TaskSchedule =
  | { type: "interval"; intervalMs: number }
  | { type: "daily"; hour: number; minute: number }
  | { type: "weekly"; dayOfWeek: number; hour: number; minute: number }
  | { type: "cron"; expression: string }
  | { type: "once"; at: number };

// ---------------------------------------------------------------------------
// Task Scheduler
// ---------------------------------------------------------------------------

export class TaskScheduler {
  private tasks: Map<string, ScheduledTask> = new Map();
  private timers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private commander: NLCommander | null = null;
  private workflows: WorkflowReplay | null = null;
  private _running = false;

  init(commander: NLCommander, workflows?: WorkflowReplay): void {
    this.commander = commander;
    this.workflows = workflows ?? null;
  }

  /** Start the scheduler. Begins checking and executing tasks. */
  start(): void {
    if (this._running) return;
    this._running = true;
    log.info(`scheduler started with ${this.tasks.size} tasks`);

    // Schedule all enabled tasks
    for (const task of Array.from(this.tasks.values())) {
      if (task.enabled) this.scheduleNext(task);
    }
  }

  /** Stop all scheduled tasks. */
  stop(): void {
    this._running = false;
    for (const timer of Array.from(this.timers.values())) clearTimeout(timer);
    this.timers.clear();
    log.info("scheduler stopped");
  }

  /** Add a scheduled task. */
  add(
    name: string,
    type: "command" | "workflow",
    payload: string,
    schedule: TaskSchedule,
  ): ScheduledTask {
    const id = `task-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const task: ScheduledTask = {
      id,
      name,
      type,
      payload,
      schedule,
      enabled: true,
      nextRun: this.calculateNextRun(schedule),
      runCount: 0,
      createdAt: Date.now(),
    };

    this.tasks.set(id, task);
    if (this._running) this.scheduleNext(task);
    log.info(`added task "${name}" (${id}), next run: ${new Date(task.nextRun).toLocaleString()}`);
    return task;
  }

  /** Convenience: schedule a command at an interval. */
  every(intervalMs: number, name: string, command: string): ScheduledTask {
    return this.add(name, "command", command, { type: "interval", intervalMs });
  }

  /** Convenience: schedule a daily command. */
  daily(hour: number, minute: number, name: string, command: string): ScheduledTask {
    return this.add(name, "command", command, { type: "daily", hour, minute });
  }

  /** Convenience: schedule a weekly command. */
  weekly(
    dayOfWeek: number,
    hour: number,
    minute: number,
    name: string,
    command: string,
  ): ScheduledTask {
    return this.add(name, "command", command, { type: "weekly", dayOfWeek, hour, minute });
  }

  /** Remove a task. */
  remove(taskId: string): boolean {
    const timer = this.timers.get(taskId);
    if (timer) clearTimeout(timer);
    this.timers.delete(taskId);
    return this.tasks.delete(taskId);
  }

  /** Enable/disable a task. */
  setEnabled(taskId: string, enabled: boolean): void {
    const task = this.tasks.get(taskId);
    if (!task) return;
    task.enabled = enabled;
    if (enabled && this._running) {
      this.scheduleNext(task);
    } else {
      const timer = this.timers.get(taskId);
      if (timer) clearTimeout(timer);
      this.timers.delete(taskId);
    }
  }

  /** List all tasks. */
  list(): ScheduledTask[] {
    return Array.from(this.tasks.values());
  }

  /** Get next upcoming tasks. */
  upcoming(limit: number = 5): ScheduledTask[] {
    return Array.from(this.tasks.values())
      .filter((t) => t.enabled)
      .sort((a, b) => a.nextRun - b.nextRun)
      .slice(0, limit);
  }

  get running(): boolean {
    return this._running;
  }

  // -------------------------------------------------------------------------
  // Private
  // -------------------------------------------------------------------------

  private scheduleNext(task: ScheduledTask): void {
    const now = Date.now();
    let delay = task.nextRun - now;
    if (delay < 0) delay = 1000; // Run immediately if overdue

    const timer = setTimeout(() => {
      void this.executeTask(task);
    }, delay);

    this.timers.set(task.id, timer);
  }

  private async executeTask(task: ScheduledTask): Promise<void> {
    if (!task.enabled || !this._running) return;

    log.info(`executing task "${task.name}": ${task.payload}`);
    task.lastRun = Date.now();
    task.runCount++;

    try {
      if (task.type === "command" && this.commander) {
        await this.commander.execute(task.payload);
      } else if (task.type === "workflow" && this.workflows) {
        await this.workflows.replay(task.payload);
      }
    } catch (err) {
      log.error(`task "${task.name}" failed: ${err instanceof Error ? err.message : String(err)}`);
    }

    // Schedule next run (unless it's a one-time task)
    if (task.schedule.type !== "once") {
      task.nextRun = this.calculateNextRun(task.schedule);
      this.scheduleNext(task);
    } else {
      task.enabled = false;
    }
  }

  private calculateNextRun(schedule: TaskSchedule): number {
    const now = new Date();

    switch (schedule.type) {
      case "interval":
        return Date.now() + schedule.intervalMs;

      case "once":
        return schedule.at;

      case "daily": {
        const next = new Date(now);
        next.setHours(schedule.hour, schedule.minute, 0, 0);
        if (next.getTime() <= Date.now()) next.setDate(next.getDate() + 1);
        return next.getTime();
      }

      case "weekly": {
        const next = new Date(now);
        next.setHours(schedule.hour, schedule.minute, 0, 0);
        const daysUntil = (schedule.dayOfWeek - next.getDay() + 7) % 7;
        next.setDate(
          next.getDate() + (daysUntil === 0 && next.getTime() <= Date.now() ? 7 : daysUntil),
        );
        return next.getTime();
      }

      case "cron":
        // Simplified cron — just use interval as fallback
        return Date.now() + 60_000;

      default:
        return Date.now() + 60_000;
    }
  }
}
