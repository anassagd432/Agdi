/**
 * AI-to-AI Delegation — spawn sub-agents for parallel work.
 *
 * The main agent can delegate tasks to sub-agents that work
 * simultaneously on different goals. Each sub-agent gets its
 * own context and reports back results.
 *
 * Example:
 *   "Research flights to Tokyo AND find hotels near Shibuya"
 *   → spawns 2 sub-agents, each working on their own task,
 *     both report back when done.
 */

import type { DeviceController } from "./device-controller.js";
import type { NLCommander, CommandResult } from "./nl-commander.js";
import { createSubsystemLogger } from "../logging/subsystem.js";

const log = createSubsystemLogger("delegation");

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SubAgent = {
  id: string;
  name: string;
  task: string;
  status: "queued" | "running" | "completed" | "failed";
  result?: CommandResult;
  startedAt?: number;
  completedAt?: number;
  error?: string;
};

export type DelegationPlan = {
  id: string;
  originalCommand: string;
  subAgents: SubAgent[];
  status: "planning" | "executing" | "completed" | "partial";
  createdAt: number;
  completedAt?: number;
};

export type DelegationResult = {
  planId: string;
  success: boolean;
  totalAgents: number;
  completedAgents: number;
  failedAgents: number;
  results: SubAgent[];
  durationMs: number;
};

// ---------------------------------------------------------------------------
// AI Delegation Engine
// ---------------------------------------------------------------------------

export class AIDelegation {
  private commander: NLCommander | null = null;
  private plans: Map<string, DelegationPlan> = new Map();
  private maxConcurrent: number;

  constructor(maxConcurrent: number = 3) {
    this.maxConcurrent = maxConcurrent;
  }

  init(commander: NLCommander): void {
    this.commander = commander;
  }

  /**
   * Decompose a complex command into sub-tasks and run them in parallel.
   *
   * Splits on:
   * - "AND" / "and then" / "also" / "plus"
   * - Semicolons
   * - Numbered lists ("1. ... 2. ...")
   */
  async delegate(command: string): Promise<DelegationResult> {
    const planId = `plan-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const startTime = Date.now();

    // Split into sub-tasks
    const tasks = this.decompose(command);

    if (tasks.length <= 1) {
      // Single task — no delegation needed, just run it
      log.info(`single task, no delegation: "${command}"`);
      const result = this.commander ? await this.commander.execute(command) : null;
      return {
        planId,
        success: result?.success ?? false,
        totalAgents: 1,
        completedAgents: result?.success ? 1 : 0,
        failedAgents: result?.success ? 0 : 1,
        results: [
          {
            id: `agent-0`,
            name: "Main Agent",
            task: command,
            status: result?.success ? "completed" : "failed",
            result: result ?? undefined,
            startedAt: startTime,
            completedAt: Date.now(),
            error: result?.error,
          },
        ],
        durationMs: Date.now() - startTime,
      };
    }

    // Create sub-agents
    const subAgents: SubAgent[] = tasks.map((task, i) => ({
      id: `agent-${i}`,
      name: `Sub-Agent ${i + 1}`,
      task,
      status: "queued" as const,
    }));

    const plan: DelegationPlan = {
      id: planId,
      originalCommand: command,
      subAgents,
      status: "executing",
      createdAt: Date.now(),
    };

    this.plans.set(planId, plan);
    log.info(`delegating "${command}" → ${subAgents.length} sub-agents`);

    // Execute in parallel batches
    const results = await this.executeParallel(subAgents);

    plan.status = results.every((a) => a.status === "completed") ? "completed" : "partial";
    plan.completedAt = Date.now();

    const completed = results.filter((a) => a.status === "completed").length;
    const failed = results.filter((a) => a.status === "failed").length;

    const delegationResult: DelegationResult = {
      planId,
      success: failed === 0,
      totalAgents: results.length,
      completedAgents: completed,
      failedAgents: failed,
      results,
      durationMs: Date.now() - startTime,
    };

    log.info(
      `delegation complete: ${completed}/${results.length} succeeded in ${delegationResult.durationMs}ms`,
    );
    return delegationResult;
  }

  /** Get all delegation plans. */
  getPlans(): DelegationPlan[] {
    return Array.from(this.plans.values());
  }

  /** Get a specific plan. */
  getPlan(planId: string): DelegationPlan | undefined {
    return this.plans.get(planId);
  }

  // -------------------------------------------------------------------------
  // Private
  // -------------------------------------------------------------------------

  /** Decompose a command into sub-tasks. */
  private decompose(command: string): string[] {
    // Split on AND, also, plus, semicolons
    const parts = command
      .split(/\s+(?:AND|and then|and also|also|plus)\s+/i)
      .flatMap((p) => p.split(/;\s*/))
      .map((p) => p.trim())
      .filter(Boolean);

    // Check for numbered lists: "1. do X 2. do Y 3. do Z"
    if (parts.length === 1) {
      const numbered = command.match(/\d+\.\s+[^0-9]+/g);
      if (numbered && numbered.length > 1) {
        return numbered.map((n) => n.replace(/^\d+\.\s*/, "").trim());
      }
    }

    return parts;
  }

  /** Execute sub-agents in parallel with concurrency limit. */
  private async executeParallel(agents: SubAgent[]): Promise<SubAgent[]> {
    const running: Promise<void>[] = [];
    let index = 0;

    const runNext = async (): Promise<void> => {
      while (index < agents.length) {
        const agent = agents[index]!;
        index++;

        agent.status = "running";
        agent.startedAt = Date.now();
        log.info(`[${agent.name}] starting: "${agent.task}"`);

        try {
          if (this.commander) {
            agent.result = await this.commander.execute(agent.task);
            agent.status = agent.result.success ? "completed" : "failed";
            agent.error = agent.result.error;
          } else {
            agent.status = "failed";
            agent.error = "Commander not initialized";
          }
        } catch (err) {
          agent.status = "failed";
          agent.error = err instanceof Error ? err.message : String(err);
        }

        agent.completedAt = Date.now();
        log.info(`[${agent.name}] ${agent.status}: "${agent.task}"`);
      }
    };

    // Start up to maxConcurrent workers
    for (let i = 0; i < Math.min(this.maxConcurrent, agents.length); i++) {
      running.push(runNext());
    }

    await Promise.all(running);
    return agents;
  }
}
