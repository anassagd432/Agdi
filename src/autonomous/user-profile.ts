/**
 * User Profile & Persistent Memory.
 *
 * Learns user patterns over time:
 * - Which apps they use most
 * - Their daily workflow patterns
 * - Preferred apps for specific tasks
 * - Time-of-day habits
 * - Frequently visited URLs
 *
 * Persists to disk so the agent remembers across sessions.
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { createSubsystemLogger } from "../logging/subsystem.js";

const log = createSubsystemLogger("user-profile");

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AppUsage = {
  name: string;
  launchCount: number;
  totalMinutes: number;
  lastUsed: number; // timestamp
  timeSlots: number[]; // 24-hour histogram (0-23)
};

export type WorkflowPattern = {
  id: string;
  description: string;
  steps: string[]; // Sequence of action descriptions
  frequency: number; // Times observed
  timeOfDay?: number; // Typical hour (0-23)
  dayOfWeek?: number; // 0=Sun, 6=Sat
  lastSeen: number;
  confidence: number; // 0-1
};

export type UserPreference = {
  key: string;
  value: string;
  source: "observed" | "explicit";
  confidence: number;
  updatedAt: number;
};

export type UserProfileData = {
  version: number;
  createdAt: number;
  updatedAt: number;
  username: string;
  apps: Record<string, AppUsage>;
  workflows: WorkflowPattern[];
  preferences: UserPreference[];
  frequentUrls: Array<{ url: string; visits: number; lastVisit: number }>;
  commandHistory: Array<{ command: string; count: number; lastUsed: number }>;
  totalSessions: number;
  totalCommands: number;
  totalGoals: number;
};

// ---------------------------------------------------------------------------
// User Profile
// ---------------------------------------------------------------------------

export class UserProfile {
  private data: UserProfileData;
  private dataDir: string;
  private dirty = false;
  private saveTimer: ReturnType<typeof setInterval> | null = null;

  constructor(dataDir?: string) {
    this.dataDir = dataDir ?? join(homedir(), ".agdi", "autonomous");
    this.data = this.createEmpty();
  }

  /** Load profile from disk. */
  async load(): Promise<void> {
    const filePath = join(this.dataDir, "user-profile.json");
    try {
      const raw = await readFile(filePath, "utf-8");
      this.data = JSON.parse(raw);
      log.info(
        `loaded profile: ${this.data.totalSessions} sessions, ${Object.keys(this.data.apps).length} apps tracked`,
      );
    } catch {
      log.info("no existing profile — starting fresh");
      this.data = this.createEmpty();
    }

    // Auto-save every 30 seconds
    this.saveTimer = setInterval(() => {
      if (this.dirty) {
        void this.save();
      }
    }, 30_000);
  }

  /** Save profile to disk. */
  async save(): Promise<void> {
    const filePath = join(this.dataDir, "user-profile.json");
    try {
      await mkdir(this.dataDir, { recursive: true });
      this.data.updatedAt = Date.now();
      await writeFile(filePath, JSON.stringify(this.data, null, 2), "utf-8");
      this.dirty = false;
    } catch (err) {
      log.error(`save failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  /** Stop auto-save and persist. */
  async close(): Promise<void> {
    if (this.saveTimer) {
      clearInterval(this.saveTimer);
      this.saveTimer = null;
    }
    if (this.dirty) {
      await this.save();
    }
  }

  // -------------------------------------------------------------------------
  // App tracking
  // -------------------------------------------------------------------------

  /** Record an app launch. */
  trackAppLaunch(appName: string): void {
    const key = appName.toLowerCase();
    if (!this.data.apps[key]) {
      this.data.apps[key] = {
        name: appName,
        launchCount: 0,
        totalMinutes: 0,
        lastUsed: 0,
        timeSlots: new Array(24).fill(0),
      };
    }
    const app = this.data.apps[key]!;
    app.launchCount++;
    app.lastUsed = Date.now();
    app.timeSlots[new Date().getHours()]++;
    this.dirty = true;
  }

  /** Get most used apps. */
  getMostUsedApps(limit: number = 10): AppUsage[] {
    return Object.values(this.data.apps)
      .sort((a, b) => b.launchCount - a.launchCount)
      .slice(0, limit);
  }

  /** Get apps typically used at a specific hour. */
  getAppsForTimeOfDay(hour: number): AppUsage[] {
    return Object.values(this.data.apps)
      .filter((app) => app.timeSlots[hour] > 0)
      .sort((a, b) => b.timeSlots[hour]! - a.timeSlots[hour]!)
      .slice(0, 5);
  }

  // -------------------------------------------------------------------------
  // Workflow tracking
  // -------------------------------------------------------------------------

  /** Record a sequence of actions as a potential workflow. */
  trackWorkflow(steps: string[]): void {
    const key = steps.join(" → ");

    const existing = this.data.workflows.find((w) => w.steps.join(" → ") === key);
    if (existing) {
      existing.frequency++;
      existing.lastSeen = Date.now();
      existing.confidence = Math.min(1, existing.confidence + 0.1);
    } else {
      this.data.workflows.push({
        id: `wf-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        description: `${steps[0]} → ${steps[steps.length - 1]}`,
        steps,
        frequency: 1,
        timeOfDay: new Date().getHours(),
        dayOfWeek: new Date().getDay(),
        lastSeen: Date.now(),
        confidence: 0.3,
      });
    }
    this.dirty = true;
  }

  /** Get suggested workflows based on current time. */
  getSuggestions(hour?: number, dayOfWeek?: number): WorkflowPattern[] {
    const h = hour ?? new Date().getHours();
    const d = dayOfWeek ?? new Date().getDay();

    return this.data.workflows
      .filter((w) => w.confidence >= 0.5 && w.frequency >= 3)
      .filter(
        (w) =>
          (w.timeOfDay === undefined || Math.abs(w.timeOfDay - h) <= 1) &&
          (w.dayOfWeek === undefined || w.dayOfWeek === d),
      )
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5);
  }

  // -------------------------------------------------------------------------
  // URL tracking
  // -------------------------------------------------------------------------

  /** Record a URL visit. */
  trackUrl(url: string): void {
    const existing = this.data.frequentUrls.find((u) => u.url === url);
    if (existing) {
      existing.visits++;
      existing.lastVisit = Date.now();
    } else {
      this.data.frequentUrls.push({ url, visits: 1, lastVisit: Date.now() });
    }
    // Keep top 100
    this.data.frequentUrls.sort((a, b) => b.visits - a.visits);
    if (this.data.frequentUrls.length > 100) {
      this.data.frequentUrls.length = 100;
    }
    this.dirty = true;
  }

  // -------------------------------------------------------------------------
  // Command tracking
  // -------------------------------------------------------------------------

  /** Track a natural language command. */
  trackCommand(command: string): void {
    const key = command.toLowerCase().trim();
    const existing = this.data.commandHistory.find((c) => c.command === key);
    if (existing) {
      existing.count++;
      existing.lastUsed = Date.now();
    } else {
      this.data.commandHistory.push({ command: key, count: 1, lastUsed: Date.now() });
    }
    this.data.totalCommands++;
    this.dirty = true;
  }

  /** Get frequently used commands (for autocomplete). */
  getFrequentCommands(limit: number = 10): string[] {
    return this.data.commandHistory
      .sort((a, b) => b.count - a.count)
      .slice(0, limit)
      .map((c) => c.command);
  }

  // -------------------------------------------------------------------------
  // Preferences
  // -------------------------------------------------------------------------

  /** Set a user preference. */
  setPreference(key: string, value: string, source: "observed" | "explicit" = "explicit"): void {
    const existing = this.data.preferences.find((p) => p.key === key);
    if (existing) {
      existing.value = value;
      existing.source = source;
      existing.confidence = source === "explicit" ? 1.0 : Math.min(1, existing.confidence + 0.1);
      existing.updatedAt = Date.now();
    } else {
      this.data.preferences.push({
        key,
        value,
        source,
        confidence: source === "explicit" ? 1.0 : 0.5,
        updatedAt: Date.now(),
      });
    }
    this.dirty = true;
  }

  /** Get a preference value. */
  getPreference(key: string): string | undefined {
    return this.data.preferences.find((p) => p.key === key)?.value;
  }

  // -------------------------------------------------------------------------
  // Session tracking
  // -------------------------------------------------------------------------

  /** Record a new session. */
  recordSession(): void {
    this.data.totalSessions++;
    this.dirty = true;
  }

  /** Record a goal completion. */
  recordGoal(): void {
    this.data.totalGoals++;
    this.dirty = true;
  }

  /** Get full profile data (for dashboard display). */
  getData(): UserProfileData {
    return { ...this.data };
  }

  // -------------------------------------------------------------------------
  // Private
  // -------------------------------------------------------------------------

  private createEmpty(): UserProfileData {
    return {
      version: 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      username: "",
      apps: {},
      workflows: [],
      preferences: [],
      frequentUrls: [],
      commandHistory: [],
      totalSessions: 0,
      totalCommands: 0,
      totalGoals: 0,
    };
  }
}
