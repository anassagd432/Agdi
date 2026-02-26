/**
 * Agent → User communication layer.
 *
 * Provides a simple interface for the agent to notify the user about
 * state changes, completed goals, errors, and escalations.
 * Integrates with the MessageQueue for incoming user messages.
 */

import type { AgentEvent, AgentState, Goal, UserMessage } from "./types.js";
import { MessageQueue } from "./message-queue.js";

// ---------------------------------------------------------------------------
// Agent UI
// ---------------------------------------------------------------------------

export type NotificationLevel = "info" | "warning" | "error" | "success";

export type GoalCompletionReport = {
  goal: Goal;
  duration: string;
  actionsExecuted: number;
  retries: number;
};

export class AgentUI {
  private readonly messageQueue: MessageQueue;
  private readonly output: NodeJS.WritableStream;
  private eventLog: AgentEvent[] = [];
  private maxEventLog = 100;

  constructor(opts: { messageQueue: MessageQueue; output?: NodeJS.WritableStream }) {
    this.messageQueue = opts.messageQueue;
    this.output = opts.output ?? process.stdout;
  }

  // ---------------------------------------------------------------------------
  // Outgoing (Agent → User)
  // ---------------------------------------------------------------------------

  /** Send a status update. */
  sendStatus(state: AgentState, currentGoal?: Goal): void {
    const icon = STATE_ICONS[state];
    const goalText = currentGoal ? ` | Goal: ${currentGoal.description}` : "";
    this.write(`${icon} [${state.toUpperCase()}]${goalText}`);
  }

  /** Send a notification message. */
  sendNotification(level: NotificationLevel, message: string): void {
    const icon = LEVEL_ICONS[level];
    this.write(`${icon} ${message}`);
  }

  /** Send a goal completion report. */
  sendReport(report: GoalCompletionReport): void {
    this.write(
      `✅ COMPLETED: "${report.goal.description}" | ` +
        `Duration: ${report.duration} | ` +
        `Actions: ${report.actionsExecuted} | ` +
        `Retries: ${report.retries}`,
    );
  }

  /** Send an escalation message (something the agent can't handle). */
  sendEscalation(message: string, goalId: string): void {
    this.write(`🔴 NEED YOUR INPUT [${goalId}]: ${message}`);
  }

  /** Log an agent event for debug/history. */
  logEvent(event: AgentEvent): void {
    this.eventLog.push(event);
    if (this.eventLog.length > this.maxEventLog) {
      this.eventLog = this.eventLog.slice(-this.maxEventLog);
    }
  }

  /** Get the last N events for debug. */
  getRecentEvents(count: number = 10): AgentEvent[] {
    return this.eventLog.slice(-count);
  }

  // ---------------------------------------------------------------------------
  // Incoming (User → Agent)
  // ---------------------------------------------------------------------------

  /** Check for pending user messages (non-blocking). */
  receiveMessage(): UserMessage | null {
    return this.messageQueue.dequeue();
  }

  /** Send a message from the user to the agent. */
  sendUserMessage(content: string): UserMessage {
    return this.messageQueue.enqueue(content);
  }

  /** Check if there are critical user messages. */
  hasCriticalMessage(): boolean {
    return this.messageQueue.hasCritical();
  }

  // ---------------------------------------------------------------------------
  // Format helpers
  // ---------------------------------------------------------------------------

  /** Format the current agent status as a formatted string. */
  formatStatus(state: AgentState, activeGoal?: Goal, queueLength?: number): string {
    const lines: string[] = [];
    lines.push(`${STATE_ICONS[state]} Agent: ${state.toUpperCase()}`);
    if (activeGoal) {
      lines.push(`  📋 Current: ${activeGoal.description}`);
      lines.push(`  🔄 Retries: ${activeGoal.retries}/${activeGoal.maxRetries}`);
    }
    if (queueLength !== undefined) {
      lines.push(`  📊 Queue: ${queueLength} active goals`);
    }
    return lines.join("\n");
  }

  // ---------------------------------------------------------------------------
  // Internal
  // ---------------------------------------------------------------------------

  private write(message: string): void {
    const timestamp = new Date().toISOString().split("T")[1]?.split(".")[0] ?? "";
    this.output.write(`[${timestamp}] ${message}\n`);
  }
}

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

const STATE_ICONS: Record<AgentState, string> = {
  idle: "😴",
  planning: "🧠",
  executing: "⚡",
  observing: "👁️",
  repairing: "🔧",
};

const LEVEL_ICONS: Record<NotificationLevel, string> = {
  info: "ℹ️",
  warning: "⚠️",
  error: "❌",
  success: "✅",
};
