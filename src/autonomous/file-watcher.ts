/**
 * File Watcher — trigger actions when files change.
 *
 * "When a PDF lands in Downloads, open it"
 * "When package.json changes, run npm install"
 * "When a screenshot is saved, upload it"
 *
 * Uses Node.js fs.watch for efficient native file watching.
 */

import { watch, type FSWatcher } from "node:fs";
import { stat, readdir } from "node:fs/promises";
import { join, extname, basename } from "node:path";
import type { NLCommander } from "./nl-commander.js";
import { createSubsystemLogger } from "../logging/subsystem.js";

const log = createSubsystemLogger("file-watcher");

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type FileWatchRule = {
  id: string;
  directory: string;
  pattern?: string; // Glob pattern (e.g. "*.pdf")
  extensions?: string[]; // File extensions (e.g. [".pdf", ".doc"])
  event: "create" | "change" | "delete" | "any";
  action: string; // NL command to execute (supports {file} placeholder)
  enabled: boolean;
  triggerCount: number;
  lastTriggered?: number;
  cooldownMs: number; // Min time between triggers
};

export type FileEvent = {
  type: "create" | "change" | "delete";
  path: string;
  filename: string;
  extension: string;
  timestamp: number;
};

// ---------------------------------------------------------------------------
// File Watcher
// ---------------------------------------------------------------------------

export class FileWatcher {
  private rules: Map<string, FileWatchRule> = new Map();
  private watchers: Map<string, FSWatcher> = new Map();
  private knownFiles: Map<string, Set<string>> = new Map();
  private commander: NLCommander | null = null;

  init(commander: NLCommander): void {
    this.commander = commander;
  }

  /**
   * Add a watch rule.
   *
   * Example:
   *   watcher.addRule("/home/user/Downloads", {
   *     extensions: [".pdf"],
   *     event: "create",
   *     action: "open file {file}",
   *   });
   */
  async addRule(
    directory: string,
    opts: {
      pattern?: string;
      extensions?: string[];
      event?: "create" | "change" | "delete" | "any";
      action: string;
      cooldownMs?: number;
    },
  ): Promise<FileWatchRule> {
    const id = `watch-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const rule: FileWatchRule = {
      id,
      directory,
      pattern: opts.pattern,
      extensions: opts.extensions,
      event: opts.event ?? "create",
      action: opts.action,
      enabled: true,
      triggerCount: 0,
      cooldownMs: opts.cooldownMs ?? 5000,
    };

    this.rules.set(id, rule);

    // Start watching this directory if not already
    if (!this.watchers.has(directory)) {
      await this.startWatching(directory);
    }

    log.info(`added rule: ${directory} → "${opts.action}" on ${rule.event}`);
    return rule;
  }

  /** Remove a watch rule. */
  removeRule(ruleId: string): boolean {
    const rule = this.rules.get(ruleId);
    if (!rule) return false;
    this.rules.delete(ruleId);

    // Stop watching if no more rules for this directory
    const dirRules = Array.from(this.rules.values()).filter((r) => r.directory === rule.directory);
    if (dirRules.length === 0) {
      this.watchers.get(rule.directory)?.close();
      this.watchers.delete(rule.directory);
    }

    return true;
  }

  /** List all rules. */
  listRules(): FileWatchRule[] {
    return Array.from(this.rules.values());
  }

  /** Stop all watchers. */
  stopAll(): void {
    for (const watcher of Array.from(this.watchers.values())) watcher.close();
    this.watchers.clear();
    log.info("all watchers stopped");
  }

  // -------------------------------------------------------------------------
  // Private
  // -------------------------------------------------------------------------

  private async startWatching(directory: string): Promise<void> {
    // Snapshot existing files
    try {
      const files = await readdir(directory);
      this.knownFiles.set(directory, new Set(files));
    } catch {
      this.knownFiles.set(directory, new Set());
    }

    const watcher = watch(directory, { persistent: false }, (eventType, filename) => {
      if (!filename) return;
      void this.handleEvent(directory, eventType, filename);
    });

    watcher.on("error", (err) => {
      log.warn(`watcher error on ${directory}: ${err.message}`);
    });

    this.watchers.set(directory, watcher);
    log.info(`watching: ${directory}`);
  }

  private async handleEvent(directory: string, eventType: string, filename: string): Promise<void> {
    const fullPath = join(directory, filename);
    const ext = extname(filename).toLowerCase();
    const known = this.knownFiles.get(directory) ?? new Set();

    // Determine event type
    let fileEvent: FileEvent["type"];
    try {
      await stat(fullPath);
      fileEvent = known.has(filename) ? "change" : "create";
      known.add(filename);
    } catch {
      fileEvent = "delete";
      known.delete(filename);
    }

    const event: FileEvent = {
      type: fileEvent,
      path: fullPath,
      filename,
      extension: ext,
      timestamp: Date.now(),
    };

    // Check rules
    for (const rule of Array.from(this.rules.values())) {
      if (rule.directory !== directory || !rule.enabled) continue;
      if (rule.event !== "any" && rule.event !== event.type) continue;

      // Extension filter
      if (rule.extensions && !rule.extensions.includes(ext)) continue;

      // Pattern filter
      if (rule.pattern) {
        const pattern = rule.pattern.replace("*", ".*");
        if (!new RegExp(pattern, "i").test(filename)) continue;
      }

      // Cooldown
      if (rule.lastTriggered && Date.now() - rule.lastTriggered < rule.cooldownMs) continue;

      // Execute
      rule.triggerCount++;
      rule.lastTriggered = Date.now();

      const command = rule.action
        .replace(/\{file\}/g, fullPath)
        .replace(/\{filename\}/g, filename)
        .replace(/\{ext\}/g, ext);

      log.info(`rule triggered: ${command}`);

      if (this.commander) {
        void this.commander.execute(command).catch((err) => {
          log.error(`rule action failed: ${err}`);
        });
      }
    }
  }
}
