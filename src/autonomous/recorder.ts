/**
 * Task recording — capture and replay agent workflows.
 *
 * Records every action the agent takes during goal execution,
 * enabling deterministic replay and workflow sharing.
 */

import { readFile, writeFile, readdir, mkdir, unlink } from "node:fs/promises";
import { join } from "node:path";
import type { Action, Goal } from "./types.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RecordedStep = {
  index: number;
  action: Action;
  timestamp: string;
  screenshotPath?: string;
  url?: string;
  title?: string;
  durationMs: number;
};

export type Recording = {
  id: string;
  name: string;
  description: string;
  goalDescription: string;
  steps: RecordedStep[];
  createdAt: string;
  completedAt: string | null;
  status: "recording" | "completed" | "failed";
  totalDurationMs: number;
};

export type RecordingSummary = {
  id: string;
  name: string;
  steps: number;
  createdAt: string;
  status: Recording["status"];
};

// ---------------------------------------------------------------------------
// TaskRecorder
// ---------------------------------------------------------------------------

export class TaskRecorder {
  private readonly dataDir: string;
  private activeRecording: Recording | null = null;
  private stepStartTime: number = 0;

  constructor(dataDir: string) {
    this.dataDir = join(dataDir, "recordings");
  }

  /** Start recording actions for a goal. */
  async startRecording(goal: Goal): Promise<string> {
    const id = `rec-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const name = this.sanitizeName(goal.description);

    this.activeRecording = {
      id,
      name,
      description: goal.description,
      goalDescription: goal.description,
      steps: [],
      createdAt: new Date().toISOString(),
      completedAt: null,
      status: "recording",
      totalDurationMs: 0,
    };

    this.stepStartTime = Date.now();
    return id;
  }

  /** Record a single action step. */
  recordStep(action: Action, meta?: { url?: string; title?: string }): void {
    if (!this.activeRecording) return;

    const now = Date.now();
    const durationMs = now - this.stepStartTime;

    this.activeRecording.steps.push({
      index: this.activeRecording.steps.length,
      action,
      timestamp: new Date().toISOString(),
      url: meta?.url,
      title: meta?.title,
      durationMs,
    });

    this.activeRecording.totalDurationMs += durationMs;
    this.stepStartTime = now;
  }

  /** Finish recording (success or failure). */
  async finishRecording(success: boolean): Promise<Recording | null> {
    if (!this.activeRecording) return null;

    this.activeRecording.status = success ? "completed" : "failed";
    this.activeRecording.completedAt = new Date().toISOString();

    // Save to disk
    await this.saveRecording(this.activeRecording);

    const recording = this.activeRecording;
    this.activeRecording = null;
    return recording;
  }

  /** Cancel the current recording without saving. */
  cancelRecording(): void {
    this.activeRecording = null;
  }

  /** Whether we're currently recording. */
  get isRecording(): boolean {
    return this.activeRecording !== null;
  }

  /** Get the current recording's step count. */
  get currentStepCount(): number {
    return this.activeRecording?.steps.length ?? 0;
  }

  // ---------------------------------------------------------------------------
  // Persistence
  // ---------------------------------------------------------------------------

  private async saveRecording(recording: Recording): Promise<void> {
    await mkdir(this.dataDir, { recursive: true });
    const filePath = join(this.dataDir, `${recording.id}.json`);
    await writeFile(filePath, JSON.stringify(recording, null, 2));
  }

  /** Load a recording by ID. */
  async load(id: string): Promise<Recording | null> {
    try {
      const filePath = join(this.dataDir, `${id}.json`);
      const raw = await readFile(filePath, "utf-8");
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  /** List all saved recordings. */
  async list(): Promise<RecordingSummary[]> {
    try {
      const files = await readdir(this.dataDir);
      const summaries: RecordingSummary[] = [];

      for (const file of files) {
        if (!file.endsWith(".json")) continue;
        try {
          const raw = await readFile(join(this.dataDir, file), "utf-8");
          const rec: Recording = JSON.parse(raw);
          summaries.push({
            id: rec.id,
            name: rec.name,
            steps: rec.steps.length,
            createdAt: rec.createdAt,
            status: rec.status,
          });
        } catch {
          // Skip corrupt files
        }
      }

      return summaries.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    } catch {
      return [];
    }
  }

  /** Delete a recording by ID. */
  async delete(id: string): Promise<boolean> {
    try {
      const filePath = join(this.dataDir, `${id}.json`);
      await unlink(filePath);
      return true;
    } catch {
      return false;
    }
  }

  // ---------------------------------------------------------------------------
  // Replay
  // ---------------------------------------------------------------------------

  /**
   * Replay a recording.
   *
   * Returns an async iterator of steps that the caller should execute.
   * The caller is responsible for actually performing each action.
   */
  async *replay(
    id: string,
    opts?: { speed?: number },
  ): AsyncGenerator<RecordedStep & { waitMs: number }> {
    const recording = await this.load(id);
    if (!recording) {
      throw new Error(`Recording "${id}" not found`);
    }

    const speed = opts?.speed ?? 1;

    for (const step of recording.steps) {
      const waitMs = Math.round(step.durationMs / speed);
      yield { ...step, waitMs };
    }
  }

  /**
   * Execute a replay using a provided action executor.
   * This is a convenience method that handles timing.
   */
  async executeReplay(
    id: string,
    executor: (action: Action) => Promise<void>,
    opts?: { speed?: number; onStep?: (step: RecordedStep) => void },
  ): Promise<{ stepsExecuted: number; totalMs: number }> {
    const startTime = Date.now();
    let stepsExecuted = 0;

    for await (const step of this.replay(id, opts)) {
      // Wait for the appropriate time
      if (step.waitMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, step.waitMs));
      }

      // Execute the action
      await executor(step.action);
      stepsExecuted++;

      if (opts?.onStep) {
        opts.onStep(step);
      }
    }

    return {
      stepsExecuted,
      totalMs: Date.now() - startTime,
    };
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private sanitizeName(description: string): string {
    return description
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .slice(0, 60);
  }
}
