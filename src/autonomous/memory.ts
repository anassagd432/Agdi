/**
 * Episodic + procedural memory store.
 *
 * Records action history, learned procedures, and failure patterns
 * so the agent can improve over time. Backed by a simple JSON file store.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { Action, ErrorType, Goal } from "./types.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type EpisodicEntry = {
  timestamp: string;
  goalId: string;
  goalDescription: string;
  action: Action;
  result: "success" | "failure";
  observation?: string;
  url?: string;
};

export type LearnedProcedure = {
  id: string;
  goalPattern: string;
  steps: Action[];
  successCount: number;
  lastUsed: string;
};

export type FailurePattern = {
  url: string;
  errorType: ErrorType;
  count: number;
  lastSeen: string;
  notes: string[];
};

type MemoryStore = {
  episodes: EpisodicEntry[];
  procedures: LearnedProcedure[];
  failures: FailurePattern[];
};

// ---------------------------------------------------------------------------
// Agent memory
// ---------------------------------------------------------------------------

const MAX_EPISODES = 500;
const MAX_PROCEDURES = 50;
const MAX_FAILURES = 100;

export class AgentMemory {
  private store: MemoryStore;
  private readonly filePath: string;

  constructor(dataDir: string) {
    this.filePath = join(dataDir, "memory.json");
    this.store = this.load();
  }

  // ---------------------------------------------------------------------------
  // Episodic memory (what happened)
  // ---------------------------------------------------------------------------

  /** Log a single action and its result. */
  logAction(
    goal: Goal,
    action: Action,
    result: "success" | "failure",
    observation?: string,
    url?: string,
  ): void {
    this.store.episodes.push({
      timestamp: new Date().toISOString(),
      goalId: goal.id,
      goalDescription: goal.description,
      action,
      result,
      observation,
      url,
    });

    // Trim old entries
    if (this.store.episodes.length > MAX_EPISODES) {
      this.store.episodes = this.store.episodes.slice(-MAX_EPISODES);
    }

    this.persist();
  }

  /** Get recent actions for a given goal. */
  getActionsForGoal(goalId: string, limit: number = 20): EpisodicEntry[] {
    return this.store.episodes.filter((e) => e.goalId === goalId).slice(-limit);
  }

  /** Get a text summary of recent actions (for context injection). */
  getRecentActionsSummary(goalId: string, limit: number = 5): string[] {
    const entries = this.getActionsForGoal(goalId, limit);
    return entries.map(
      (e) =>
        `[${e.result}] ${e.action.action}${e.action.text ? `: "${e.action.text}"` : ""}${e.observation ? ` → ${e.observation}` : ""}`,
    );
  }

  // ---------------------------------------------------------------------------
  // Procedural memory (how to do things)
  // ---------------------------------------------------------------------------

  /** Record a successful workflow as a learned procedure. */
  learnProcedure(goalPattern: string, steps: Action[]): void {
    const existing = this.store.procedures.find((p) => p.goalPattern === goalPattern);
    if (existing) {
      // Update with the latest steps
      existing.steps = steps;
      existing.successCount += 1;
      existing.lastUsed = new Date().toISOString();
    } else {
      this.store.procedures.push({
        id: `proc-${Date.now()}`,
        goalPattern,
        steps,
        successCount: 1,
        lastUsed: new Date().toISOString(),
      });

      // Trim old procedures
      if (this.store.procedures.length > MAX_PROCEDURES) {
        // Sort by success count, keep the most successful
        this.store.procedures.sort((a, b) => b.successCount - a.successCount);
        this.store.procedures = this.store.procedures.slice(0, MAX_PROCEDURES);
      }
    }

    this.persist();
  }

  /**
   * Look up a similar procedure that might apply.
   * Simple keyword matching for now — could use embeddings in the future.
   */
  recallProcedure(goalDescription: string): LearnedProcedure | null {
    const descLower = goalDescription.toLowerCase();
    const keywords = descLower.split(/\s+/).filter((w) => w.length > 3);

    let bestMatch: LearnedProcedure | null = null;
    let bestScore = 0;

    for (const proc of this.store.procedures) {
      const patternLower = proc.goalPattern.toLowerCase();
      let score = 0;
      for (const kw of keywords) {
        if (patternLower.includes(kw)) score += 1;
      }
      // Bonus for success count
      score += proc.successCount * 0.1;

      if (score > bestScore && score >= 2) {
        bestScore = score;
        bestMatch = proc;
      }
    }

    return bestMatch;
  }

  // ---------------------------------------------------------------------------
  // Failure patterns (what went wrong before)
  // ---------------------------------------------------------------------------

  /** Record a failure for a specific URL. */
  recordFailure(url: string, errorType: ErrorType, note: string): void {
    const existing = this.store.failures.find((f) => f.url === url && f.errorType === errorType);

    if (existing) {
      existing.count += 1;
      existing.lastSeen = new Date().toISOString();
      if (!existing.notes.includes(note)) {
        existing.notes.push(note);
        if (existing.notes.length > 5) existing.notes = existing.notes.slice(-5);
      }
    } else {
      this.store.failures.push({
        url,
        errorType,
        count: 1,
        lastSeen: new Date().toISOString(),
        notes: [note],
      });

      if (this.store.failures.length > MAX_FAILURES) {
        this.store.failures = this.store.failures.slice(-MAX_FAILURES);
      }
    }

    this.persist();
  }

  /** Get known failure patterns for a URL. */
  getFailuresForUrl(url: string): FailurePattern[] {
    const domain = extractDomain(url);
    return this.store.failures.filter((f) => extractDomain(f.url) === domain);
  }

  /** Check if a URL is known to be problematic. */
  isProblematicUrl(url: string): boolean {
    const failures = this.getFailuresForUrl(url);
    return failures.some((f) => f.count >= 3);
  }

  // ---------------------------------------------------------------------------
  // Stats
  // ---------------------------------------------------------------------------

  /** Get memory statistics. */
  getStats(): { episodes: number; procedures: number; failures: number } {
    return {
      episodes: this.store.episodes.length,
      procedures: this.store.procedures.length,
      failures: this.store.failures.length,
    };
  }

  // ---------------------------------------------------------------------------
  // Persistence
  // ---------------------------------------------------------------------------

  private load(): MemoryStore {
    try {
      if (existsSync(this.filePath)) {
        const raw = readFileSync(this.filePath, "utf-8");
        return JSON.parse(raw) as MemoryStore;
      }
    } catch {
      // Corrupted file — start fresh
    }
    return { episodes: [], procedures: [], failures: [] };
  }

  private persist(): void {
    try {
      const dir = join(this.filePath, "..");
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
      writeFileSync(this.filePath, JSON.stringify(this.store, null, 2), "utf-8");
    } catch {
      // Silent — don't let persistence errors break the agent
    }
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}
