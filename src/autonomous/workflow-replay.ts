/**
 * Workflow Replay Engine.
 *
 * Extends the existing TaskRecorder with replay capabilities.
 * Can watch the user perform a workflow once, then replay it on demand.
 *
 * - Records: captures device actions as the user performs them
 * - Replays: executes saved recordings via DeviceController
 * - Scheduling: can schedule replays via cron (Linux system controller)
 */

import type { ApprovalGate } from "./approval.js";
import type { DeviceController } from "./device-controller.js";
import type { DeviceAction } from "./device/types.js";
import { createSubsystemLogger } from "../logging/subsystem.js";

const log = createSubsystemLogger("workflow-replay");

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type WorkflowStep = {
  index: number;
  action: DeviceAction;
  timestamp: number; // Relative to workflow start (ms)
  delayFromPrev: number; // Delay from previous step (ms)
  screenshot?: string; // Base64 screenshot after action (for verification)
};

export type SavedWorkflow = {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
  createdAt: number;
  lastReplayed?: number;
  replayCount: number;
  totalDurationMs: number;
  tags: string[];
};

export type ReplayResult = {
  workflowId: string;
  success: boolean;
  stepsCompleted: number;
  stepsTotal: number;
  durationMs: number;
  error?: string;
  screenshots: Buffer[];
};

export type WorkflowReplayConfig = {
  speedMultiplier: number; // 1.0 = original speed, 2.0 = 2x faster
  pauseBetweenSteps: boolean;
  captureScreenshots: boolean;
  requireApproval: boolean;
};

const DEFAULT_CONFIG: WorkflowReplayConfig = {
  speedMultiplier: 1.0,
  pauseBetweenSteps: false,
  captureScreenshots: true,
  requireApproval: false,
};

// ---------------------------------------------------------------------------
// Workflow Replay Engine
// ---------------------------------------------------------------------------

export class WorkflowReplay {
  private workflows: Map<string, SavedWorkflow> = new Map();
  private recording: boolean = false;
  private currentRecording: WorkflowStep[] = [];
  private recordingStartTime: number = 0;
  private controller: DeviceController | null = null;
  private approval: ApprovalGate | null = null;
  private config: WorkflowReplayConfig;

  constructor(config?: Partial<WorkflowReplayConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /** Set the device controller for replay execution. */
  init(controller: DeviceController, approval?: ApprovalGate): void {
    this.controller = controller;
    this.approval = approval ?? null;
  }

  // -------------------------------------------------------------------------
  // Recording
  // -------------------------------------------------------------------------

  /** Start recording a workflow. */
  startRecording(): void {
    if (this.recording) throw new Error("Already recording");
    this.recording = true;
    this.currentRecording = [];
    this.recordingStartTime = Date.now();
    log.info("recording started");
  }

  /** Record a single action. */
  recordAction(action: DeviceAction, screenshot?: Buffer): void {
    if (!this.recording) return;

    const now = Date.now();
    const timestamp = now - this.recordingStartTime;
    const prevTimestamp =
      this.currentRecording.length > 0
        ? this.currentRecording[this.currentRecording.length - 1]!.timestamp
        : 0;

    this.currentRecording.push({
      index: this.currentRecording.length,
      action,
      timestamp,
      delayFromPrev: timestamp - prevTimestamp,
      screenshot: screenshot?.toString("base64"),
    });
  }

  /** Stop recording and save the workflow. */
  stopRecording(name: string, description: string = "", tags: string[] = []): SavedWorkflow {
    if (!this.recording) throw new Error("Not recording");

    const id = `wf-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const totalDurationMs =
      this.currentRecording.length > 0
        ? this.currentRecording[this.currentRecording.length - 1]!.timestamp
        : 0;

    const workflow: SavedWorkflow = {
      id,
      name,
      description,
      steps: this.currentRecording,
      createdAt: Date.now(),
      replayCount: 0,
      totalDurationMs,
      tags,
    };

    this.workflows.set(id, workflow);
    this.recording = false;
    this.currentRecording = [];

    log.info(`recorded workflow "${name}": ${workflow.steps.length} steps, ${totalDurationMs}ms`);
    return workflow;
  }

  /** Cancel recording without saving. */
  cancelRecording(): void {
    this.recording = false;
    this.currentRecording = [];
    log.info("recording cancelled");
  }

  /** Whether currently recording. */
  get isRecording(): boolean {
    return this.recording;
  }

  // -------------------------------------------------------------------------
  // Replay
  // -------------------------------------------------------------------------

  /**
   * Replay a saved workflow.
   *
   * Executes each recorded action with the original timing
   * (adjusted by speedMultiplier).
   */
  async replay(workflowId: string, config?: Partial<WorkflowReplayConfig>): Promise<ReplayResult> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) throw new Error(`Workflow not found: ${workflowId}`);
    if (!this.controller) throw new Error("Controller not initialized");

    const opts = { ...this.config, ...config };
    const startTime = Date.now();
    const screenshots: Buffer[] = [];
    let stepsCompleted = 0;

    log.info(
      `replaying "${workflow.name}": ${workflow.steps.length} steps at ${opts.speedMultiplier}x speed`,
    );

    try {
      for (const step of workflow.steps) {
        // Check approval if required
        if (opts.requireApproval && this.approval) {
          const approved = await this.approval.check(step.action);
          if (!approved) {
            log.warn(`step ${step.index} denied by approval gate`);
            return {
              workflowId,
              success: false,
              stepsCompleted,
              stepsTotal: workflow.steps.length,
              durationMs: Date.now() - startTime,
              error: `Step ${step.index} denied: ${step.action.action}`,
              screenshots,
            };
          }
        }

        // Wait for the appropriate delay
        if (step.delayFromPrev > 0) {
          const adjustedDelay = Math.round(step.delayFromPrev / opts.speedMultiplier);
          await new Promise((r) => setTimeout(r, adjustedDelay));
        }

        // Execute the action
        const { executeDeviceAction } = await import("./device-actions.js");
        const result = await executeDeviceAction(step.action, this.controller);

        if (result.screenshot && opts.captureScreenshots) {
          screenshots.push(result.screenshot);
        }

        stepsCompleted++;
      }

      workflow.replayCount++;
      workflow.lastReplayed = Date.now();

      const result: ReplayResult = {
        workflowId,
        success: true,
        stepsCompleted,
        stepsTotal: workflow.steps.length,
        durationMs: Date.now() - startTime,
        screenshots,
      };

      log.info(`replay complete: ${stepsCompleted} steps in ${result.durationMs}ms`);
      return result;
    } catch (err) {
      return {
        workflowId,
        success: false,
        stepsCompleted,
        stepsTotal: workflow.steps.length,
        durationMs: Date.now() - startTime,
        error: err instanceof Error ? err.message : String(err),
        screenshots,
      };
    }
  }

  // -------------------------------------------------------------------------
  // Management
  // -------------------------------------------------------------------------

  /** List all saved workflows. */
  list(): SavedWorkflow[] {
    return Array.from(this.workflows.values());
  }

  /** Get a specific workflow. */
  get(workflowId: string): SavedWorkflow | undefined {
    return this.workflows.get(workflowId);
  }

  /** Delete a workflow. */
  delete(workflowId: string): boolean {
    return this.workflows.delete(workflowId);
  }

  /** Import a workflow from JSON. */
  import(json: string): SavedWorkflow {
    const workflow: SavedWorkflow = JSON.parse(json);
    this.workflows.set(workflow.id, workflow);
    return workflow;
  }

  /** Export a workflow to JSON. */
  export(workflowId: string): string {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) throw new Error(`Workflow not found: ${workflowId}`);
    return JSON.stringify(workflow, null, 2);
  }
}
