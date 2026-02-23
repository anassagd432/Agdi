/**
 * Main autonomous event loop.
 *
 * The agent runs continuously in a plan → act → observe → repair cycle.
 * It checks for user messages at the top of every tick and can be
 * interrupted at any point. When there are no goals, it enters a low-power
 * idle mode with proactive health checks.
 */

import { EventEmitter } from "node:events";
import { GoalQueue } from "./goal-queue.js";
import { MessageQueue } from "./message-queue.js";
import type {
  Action,
  AgentEvent,
  AgentEventHandler,
  AgentState,
  AutonomousConfig,
  Goal,
  UserMessage,
  VisionAnalysis,
} from "./types.js";

export class AutonomousAgent extends EventEmitter {
  private state: AgentState = "idle";
  private running = false;
  private abortController: AbortController | null = null;
  private currentGoal: Goal | null = null;
  private tickTimer: ReturnType<typeof setTimeout> | null = null;

  readonly goals: GoalQueue;
  readonly messages: MessageQueue;
  readonly config: AutonomousConfig;

  /** Pluggable modules — set by the daemon or test harness before calling run(). */
  private planner: ((goal: Goal) => Promise<Action[]>) | null = null;
  private executor: ((action: Action) => Promise<{ screenshot: Buffer | null }>) | null = null;
  private observer: ((screenshot: Buffer, goal: Goal) => Promise<VisionAnalysis>) | null = null;
  private repairer:
    | ((goal: Goal, error: Error, context?: VisionAnalysis) => Promise<boolean>)
    | null = null;

  constructor(config: AutonomousConfig) {
    super();
    this.config = config;
    this.goals = new GoalQueue(config.dataDir);
    this.messages = new MessageQueue();
  }

  // ---------------------------------------------------------------------------
  // Module registration (dependency injection)
  // ---------------------------------------------------------------------------

  /** Register the planner module (Gemini LLM goal decomposition). */
  setPlanner(fn: (goal: Goal) => Promise<Action[]>): void {
    this.planner = fn;
  }

  /** Register the action executor module (visual or DOM-based). */
  setExecutor(fn: (action: Action) => Promise<{ screenshot: Buffer | null }>): void {
    this.executor = fn;
  }

  /** Register the observer module (screenshot → Gemini vision). */
  setObserver(fn: (screenshot: Buffer, goal: Goal) => Promise<VisionAnalysis>): void {
    this.observer = fn;
  }

  /** Register the self-repair module. Returns true if repair succeeded. */
  setRepairer(
    fn: (goal: Goal, error: Error, context?: VisionAnalysis) => Promise<boolean>,
  ): void {
    this.repairer = fn;
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  /** Start the autonomous loop. This runs until stop() is called. */
  async run(): Promise<void> {
    if (this.running) return;
    this.running = true;
    this.abortController = new AbortController();
    this.emitEvent({ type: "state_change", state: "idle" });

    while (this.running) {
      try {
        await this.tick();
      } catch (err) {
        // Top-level error safety net — never let the loop crash
        this.emitEvent({
          type: "user_escalation",
          message: `Unexpected loop error: ${err instanceof Error ? err.message : String(err)}`,
          goalId: this.currentGoal?.id ?? "unknown",
        });
      }

      // Wait for the next tick
      if (this.running) {
        const delay = this.state === "idle" ? this.config.idleTickMs : this.config.activeTickMs;
        await this.sleep(delay);
      }
    }
  }

  /** Stop the autonomous loop gracefully. */
  stop(): void {
    this.running = false;
    this.abortController?.abort();
    if (this.tickTimer) {
      clearTimeout(this.tickTimer);
      this.tickTimer = null;
    }
    this.setState("idle");
  }

  /** Whether the agent loop is currently active. */
  get isRunning(): boolean {
    return this.running;
  }

  /** The current agent state. */
  get currentState(): AgentState {
    return this.state;
  }

  /** The goal currently being worked on, if any. */
  get activeGoal(): Goal | null {
    return this.currentGoal;
  }

  // ---------------------------------------------------------------------------
  // Main tick
  // ---------------------------------------------------------------------------

  /** Execute a single plan → act → observe → repair cycle. */
  async tick(): Promise<void> {
    // 1. Check for user messages (always first, non-blocking)
    await this.processUserMessages();

    // If we were stopped by a CRITICAL message, bail out
    if (!this.running) return;

    // 2. Pick the next goal
    const goal = this.goals.peek();
    if (!goal) {
      await this.idle();
      return;
    }

    this.currentGoal = goal;

    // 3. Mark as in-progress
    if (goal.status === "pending") {
      this.goals.start(goal.id);
    }

    // 4. Plan → Execute → Observe
    try {
      // --- PLAN ---
      this.setState("planning");
      const actions = await this.plan(goal);

      if (actions.length === 0) {
        this.goals.complete(goal.id);
        this.emitEvent({ type: "goal_completed", goal });
        this.currentGoal = null;
        return;
      }

      // --- EXECUTE each action ---
      for (const action of actions) {
        if (!this.running) return;

        // Check for user interrupts between actions
        if (this.messages.hasCritical()) {
          await this.processUserMessages();
          if (!this.running) return;
        }

        // Execute the action
        this.setState("executing");
        const result = await this.execute(action);
        this.emitEvent({ type: "action_executed", action, screenshot: result.screenshot ?? undefined });

        // If this was the final action, we're done
        if (action.action === "done") {
          this.goals.complete(goal.id);
          this.emitEvent({ type: "goal_completed", goal });
          this.currentGoal = null;
          return;
        }

        // --- OBSERVE ---
        if (result.screenshot) {
          this.setState("observing");
          const analysis = await this.observe(result.screenshot, goal);

          if (analysis.goalProgress === "done") {
            this.goals.complete(goal.id);
            this.emitEvent({ type: "goal_completed", goal });
            this.currentGoal = null;
            return;
          }

          if (analysis.goalProgress === "stuck") {
            // Try to self-repair
            const repaired = await this.tryRepair(
              goal,
              new Error(`Agent is stuck: ${analysis.observation}`),
              analysis,
            );
            if (!repaired) {
              this.currentGoal = null;
              return;
            }
          }
        }
      }
    } catch (err) {
      // --- REPAIR ---
      const error = err instanceof Error ? err : new Error(String(err));
      await this.tryRepair(goal, error);
      this.currentGoal = null;
    }
  }

  // ---------------------------------------------------------------------------
  // Core operations
  // ---------------------------------------------------------------------------

  private async plan(goal: Goal): Promise<Action[]> {
    if (!this.planner) {
      return [{ action: "done", confidence: 1, reasoning: "No planner registered" }];
    }
    return this.planner(goal);
  }

  private async execute(action: Action): Promise<{ screenshot: Buffer | null }> {
    if (!this.executor) {
      return { screenshot: null };
    }
    return this.executor(action);
  }

  private async observe(screenshot: Buffer, goal: Goal): Promise<VisionAnalysis> {
    if (!this.observer) {
      return {
        observation: "No observer registered",
        reasoning: "Cannot analyze",
        suggestedAction: { action: "done", confidence: 0, reasoning: "No observer" },
        confidence: 0,
        goalProgress: "continue",
      };
    }
    return this.observer(screenshot, goal);
  }

  private async tryRepair(
    goal: Goal,
    error: Error,
    context?: VisionAnalysis,
  ): Promise<boolean> {
    this.setState("repairing");

    // Check if we've exceeded retry limit
    if (goal.retries >= goal.maxRetries) {
      this.goals.fail(goal.id, `Max retries (${goal.maxRetries}) exceeded: ${error.message}`);
      this.emitEvent({
        type: "goal_failed",
        goal,
        error: error.message,
      });
      this.emitEvent({
        type: "user_escalation",
        message: `Goal "${goal.description}" failed after ${goal.maxRetries} retries: ${error.message}`,
        goalId: goal.id,
      });
      return false;
    }

    // Try the repairer if registered
    if (this.repairer) {
      try {
        const diagnosis = { type: "LOGIC_ERROR" as const, insight: error.message, suggestedFix: "", canAutoRepair: true };
        this.emitEvent({ type: "repair_attempt", diagnosis, goalId: goal.id });

        const repaired = await this.repairer(goal, error, context);
        if (repaired) {
          this.goals.requeue(goal.id, `Repair: ${error.message}`);
          return true;
        }
      } catch {
        // Repair itself failed
      }
    }

    // Fallback: requeue with context
    this.goals.requeue(goal.id, `Error: ${error.message}`);
    return true;
  }

  // ---------------------------------------------------------------------------
  // User message handling
  // ---------------------------------------------------------------------------

  private async processUserMessages(): Promise<void> {
    let msg: UserMessage | null;
    while ((msg = this.messages.dequeue()) !== null) {
      switch (msg.priority) {
        case "CRITICAL": {
          // Immediately stop
          this.stop();
          this.emitEvent({
            type: "state_change",
            state: "idle",
          });
          return;
        }

        case "HIGH": {
          // Add as highest priority goal, current goal gets paused
          if (this.currentGoal) {
            this.goals.pause(this.currentGoal.id);
          }
          this.goals.add({
            description: msg.content,
            priority: "high",
          });
          break;
        }

        case "NORMAL": {
          // Add as normal priority goal
          this.goals.add({
            description: msg.content,
            priority: "normal",
          });
          break;
        }

        case "LOW": {
          // Status query — emit a report
          this.emitEvent({
            type: "status_report",
            state: this.state,
            activeGoal: this.currentGoal ?? undefined,
            queueLength: this.goals.activeCount,
          });
          break;
        }
      }
    }
    this.messages.compact();
  }

  // ---------------------------------------------------------------------------
  // Idle mode
  // ---------------------------------------------------------------------------

  private async idle(): Promise<void> {
    if (this.state !== "idle") {
      this.setState("idle");
    }

    // Proactive tasks during idle
    this.goals.cleanup();
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private setState(state: AgentState): void {
    if (this.state === state) return;
    this.state = state;
    this.emitEvent({ type: "state_change", state, goalId: this.currentGoal?.id });
  }

  private emitEvent(event: AgentEvent): void {
    this.emit("agent_event", event);
  }

  /** Register a typed event listener. */
  onEvent(handler: AgentEventHandler): void {
    this.on("agent_event", handler);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => {
      this.tickTimer = setTimeout(resolve, ms);
    });
  }
}
