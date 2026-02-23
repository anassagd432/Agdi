/**
 * Non-blocking priority message queue for user messages.
 *
 * User messages are ephemeral (in-memory only) and sorted by priority.
 * The agent checks this queue at the top of every tick.
 */

import { randomUUID } from "node:crypto";
import type { MessagePriority, UserMessage } from "./types.js";

const PRIORITY_ORDER: Record<MessagePriority, number> = {
  CRITICAL: 0,
  HIGH: 1,
  NORMAL: 2,
  LOW: 3,
};

/** Keywords that trigger each priority level. */
const PRIORITY_KEYWORDS: Array<{ priority: MessagePriority; patterns: RegExp[] }> = [
  {
    priority: "CRITICAL",
    patterns: [/\bstop\b/i, /\bhalt\b/i, /\babort\b/i, /\bkill\b/i, /\bshutdown\b/i],
  },
  {
    priority: "HIGH",
    patterns: [/\bswitch\b/i, /\bredirect\b/i, /\boverride\b/i, /\bpriority\b/i, /\burgent\b/i],
  },
];

export class MessageQueue {
  private queue: UserMessage[] = [];

  /** Enqueue a new message. Priority is auto-classified if not provided. */
  enqueue(content: string, priority?: MessagePriority): UserMessage {
    const msg: UserMessage = {
      id: randomUUID(),
      content,
      priority: priority ?? classifyPriority(content),
      timestamp: new Date().toISOString(),
      processed: false,
    };
    this.queue.push(msg);
    this.sort();
    return msg;
  }

  /** Non-blocking dequeue. Returns the highest-priority unprocessed message, or null. */
  dequeue(): UserMessage | null {
    const idx = this.queue.findIndex((m) => !m.processed);
    if (idx === -1) return null;
    const msg = this.queue[idx]!;
    msg.processed = true;
    return msg;
  }

  /** Peek at the next unprocessed message without consuming it. */
  peek(): UserMessage | null {
    return this.queue.find((m) => !m.processed) ?? null;
  }

  /** Check if there's an unprocessed CRITICAL message. */
  hasCritical(): boolean {
    return this.queue.some((m) => !m.processed && m.priority === "CRITICAL");
  }

  /** Drain all unprocessed messages and return them. */
  drain(): UserMessage[] {
    const unprocessed = this.queue.filter((m) => !m.processed);
    for (const msg of unprocessed) {
      msg.processed = true;
    }
    return unprocessed;
  }

  /** Remove all processed messages. */
  compact(): void {
    this.queue = this.queue.filter((m) => !m.processed);
  }

  /** Number of unprocessed messages. */
  get pendingCount(): number {
    return this.queue.filter((m) => !m.processed).length;
  }

  private sort(): void {
    this.queue.sort((a, b) => {
      // Unprocessed first
      if (a.processed !== b.processed) return a.processed ? 1 : -1;
      // Then by priority
      const pa = PRIORITY_ORDER[a.priority] ?? 99;
      const pb = PRIORITY_ORDER[b.priority] ?? 99;
      if (pa !== pb) return pa - pb;
      // Then by timestamp (oldest first)
      return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
    });
  }
}

/** Auto-classify a message's priority based on keywords. */
function classifyPriority(content: string): MessagePriority {
  for (const { priority, patterns } of PRIORITY_KEYWORDS) {
    if (patterns.some((p) => p.test(content))) {
      return priority;
    }
  }
  return "NORMAL";
}

export { classifyPriority };
