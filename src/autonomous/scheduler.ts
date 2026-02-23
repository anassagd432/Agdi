/**
 * Cron-based scheduler for recurring goals.
 *
 * Parses cron expressions and triggers goal creation at scheduled times.
 * Integrates with the GoalQueue, adding goals when their schedule fires.
 */

import type { GoalQueue } from "./goal-queue.js";
import type { GoalPriority } from "./types.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ScheduledGoal = {
  id: string;
  description: string;
  priority: GoalPriority;
  schedule: string; // cron expression
  enabled: boolean;
  lastFired: string | null;
  nextFire: string | null;
  createdAt: string;
};

// ---------------------------------------------------------------------------
// Cron field parser (supports min, *, */step, ranges, lists)
// ---------------------------------------------------------------------------

function parseCronField(field: string, min: number, max: number): number[] {
  const values: Set<number> = new Set();

  for (const part of field.split(",")) {
    const trimmed = part.trim();

    if (trimmed === "*") {
      for (let i = min; i <= max; i++) values.add(i);
      continue;
    }

    const stepMatch = trimmed.match(/^(\*|(\d+)-(\d+))\/(\d+)$/);
    if (stepMatch) {
      const start = stepMatch[1] === "*" ? min : Number(stepMatch[2]);
      const end = stepMatch[1] === "*" ? max : Number(stepMatch[3]);
      const step = Number(stepMatch[4]);
      for (let i = start; i <= end; i += step) values.add(i);
      continue;
    }

    const rangeMatch = trimmed.match(/^(\d+)-(\d+)$/);
    if (rangeMatch) {
      const start = Number(rangeMatch[1]);
      const end = Number(rangeMatch[2]);
      for (let i = start; i <= end; i++) values.add(i);
      continue;
    }

    const num = Number(trimmed);
    if (!isNaN(num) && num >= min && num <= max) {
      values.add(num);
    }
  }

  return Array.from(values).sort((a, b) => a - b);
}

/** Parse a 5-field cron expression (minute hour dom month dow). */
function parseCron(expression: string): {
  minutes: number[];
  hours: number[];
  daysOfMonth: number[];
  months: number[];
  daysOfWeek: number[];
} {
  const parts = expression.trim().split(/\s+/);
  if (parts.length !== 5) {
    throw new Error(`Invalid cron expression: "${expression}" (expected 5 fields)`);
  }

  return {
    minutes: parseCronField(parts[0]!, 0, 59),
    hours: parseCronField(parts[1]!, 0, 23),
    daysOfMonth: parseCronField(parts[2]!, 1, 31),
    months: parseCronField(parts[3]!, 1, 12),
    daysOfWeek: parseCronField(parts[4]!, 0, 6),
  };
}

/** Check if a cron expression matches a given date. */
function cronMatches(expression: string, date: Date): boolean {
  const cron = parseCron(expression);
  return (
    cron.minutes.includes(date.getMinutes()) &&
    cron.hours.includes(date.getHours()) &&
    cron.daysOfMonth.includes(date.getDate()) &&
    cron.months.includes(date.getMonth() + 1) &&
    cron.daysOfWeek.includes(date.getDay())
  );
}

/** Calculate the next fire time from now. */
function nextFireTime(expression: string, after: Date = new Date()): Date {
  const candidate = new Date(after);
  candidate.setSeconds(0, 0);
  candidate.setMinutes(candidate.getMinutes() + 1);

  // Search up to 1 year ahead
  const limit = 365 * 24 * 60;
  for (let i = 0; i < limit; i++) {
    if (cronMatches(expression, candidate)) {
      return candidate;
    }
    candidate.setMinutes(candidate.getMinutes() + 1);
  }

  // Fallback — shouldn't happen for valid crons
  return new Date(after.getTime() + 86_400_000);
}

// ---------------------------------------------------------------------------
// Scheduler
// ---------------------------------------------------------------------------

export class GoalScheduler {
  private schedules: Map<string, ScheduledGoal> = new Map();
  private timer: ReturnType<typeof setInterval> | null = null;
  private goalQueue: GoalQueue | null = null;
  private counter = 0;

  /** Wire the scheduler to a goal queue. */
  attach(goalQueue: GoalQueue): void {
    this.goalQueue = goalQueue;
  }

  /** Add a recurring scheduled goal. */
  add(opts: {
    description: string;
    priority?: GoalPriority;
    schedule: string;
  }): ScheduledGoal {
    // Validate the cron expression first
    parseCron(opts.schedule);

    const id = `sched-${++this.counter}-${Date.now().toString(36)}`;
    const now = new Date();
    const scheduled: ScheduledGoal = {
      id,
      description: opts.description,
      priority: opts.priority ?? "normal",
      schedule: opts.schedule,
      enabled: true,
      lastFired: null,
      nextFire: nextFireTime(opts.schedule, now).toISOString(),
      createdAt: now.toISOString(),
    };

    this.schedules.set(id, scheduled);
    return scheduled;
  }

  /** Remove a scheduled goal. */
  remove(id: string): boolean {
    return this.schedules.delete(id);
  }

  /** Enable/disable a scheduled goal. */
  setEnabled(id: string, enabled: boolean): void {
    const sched = this.schedules.get(id);
    if (sched) {
      sched.enabled = enabled;
      if (enabled) {
        sched.nextFire = nextFireTime(sched.schedule).toISOString();
      }
    }
  }

  /** Start the scheduler (checks every 60 seconds). */
  start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => this.tick(), 60_000);
    // Also tick immediately
    this.tick();
  }

  /** Stop the scheduler. */
  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /** Manual tick — check all schedules and fire due ones. */
  tick(): void {
    if (!this.goalQueue) return;

    const now = new Date();

    for (const sched of this.schedules.values()) {
      if (!sched.enabled) continue;

      if (cronMatches(sched.schedule, now)) {
        // Don't fire twice in the same minute
        if (sched.lastFired) {
          const lastFired = new Date(sched.lastFired);
          if (
            lastFired.getFullYear() === now.getFullYear() &&
            lastFired.getMonth() === now.getMonth() &&
            lastFired.getDate() === now.getDate() &&
            lastFired.getHours() === now.getHours() &&
            lastFired.getMinutes() === now.getMinutes()
          ) {
            continue;
          }
        }

        // Fire!
        this.goalQueue.add({
          description: sched.description,
          priority: sched.priority,
          type: "recurring",
          schedule: sched.schedule,
        });

        sched.lastFired = now.toISOString();
        sched.nextFire = nextFireTime(sched.schedule, now).toISOString();
      }
    }
  }

  /** List all scheduled goals. */
  list(): ScheduledGoal[] {
    return Array.from(this.schedules.values());
  }

  /** Get schedule count. */
  get count(): number {
    return this.schedules.size;
  }
}
