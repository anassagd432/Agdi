/**
 * Smart Clipboard — intelligent clipboard history with search.
 *
 * Tracks clipboard changes, stores history, and lets the agent
 * search through past clipboard entries and paste them.
 */

import { createSubsystemLogger } from "../logging/subsystem.js";
import type { DeviceController } from "./device-controller.js";

const log = createSubsystemLogger("clipboard");

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ClipboardEntry = {
  id: string;
  text: string;
  timestamp: number;
  source?: string;       // App that copied it
  tags: string[];
  pinned: boolean;
};

// ---------------------------------------------------------------------------
// Smart Clipboard
// ---------------------------------------------------------------------------

export class SmartClipboard {
  private history: ClipboardEntry[] = [];
  private controller: DeviceController | null = null;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private lastContent: string = "";
  private maxHistory: number;

  constructor(maxHistory: number = 500) {
    this.maxHistory = maxHistory;
  }

  init(controller: DeviceController): void {
    this.controller = controller;
  }

  /** Start monitoring clipboard for changes. */
  async startMonitoring(intervalMs: number = 1000): Promise<void> {
    if (this.pollTimer) return;
    if (!this.controller?.system) {
      log.warn("clipboard monitoring requires Linux system controller");
      return;
    }

    // Get initial content
    this.lastContent = await this.controller.system.clipboardPaste().catch(() => "");

    this.pollTimer = setInterval(async () => {
      try {
        const current = await this.controller!.system!.clipboardPaste();
        if (current && current !== this.lastContent) {
          this.lastContent = current;
          this.addEntry(current);
        }
      } catch { /* ignore polling errors */ }
    }, intervalMs);

    log.info("clipboard monitoring started");
  }

  /** Stop monitoring. */
  stopMonitoring(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  /** Add an entry to clipboard history. */
  addEntry(text: string, source?: string): ClipboardEntry {
    const entry: ClipboardEntry = {
      id: `clip-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      text,
      timestamp: Date.now(),
      source,
      tags: this.autoTag(text),
      pinned: false,
    };

    this.history.unshift(entry);
    if (this.history.length > this.maxHistory) {
      // Remove oldest non-pinned entries
      const pinned = this.history.filter((e) => e.pinned);
      const unpinned = this.history.filter((e) => !e.pinned);
      this.history = [...pinned, ...unpinned.slice(0, this.maxHistory - pinned.length)];
    }

    return entry;
  }

  /** Search clipboard history. */
  search(query: string): ClipboardEntry[] {
    const lower = query.toLowerCase();
    return this.history.filter((e) =>
      e.text.toLowerCase().includes(lower) ||
      e.tags.some((t) => t.includes(lower))
    );
  }

  /** Get recent entries. */
  recent(limit: number = 20): ClipboardEntry[] {
    return this.history.slice(0, limit);
  }

  /** Pin an entry so it's never deleted. */
  pin(entryId: string): void {
    const entry = this.history.find((e) => e.id === entryId);
    if (entry) entry.pinned = true;
  }

  /** Copy an old entry back to the clipboard. */
  async restore(entryId: string): Promise<void> {
    const entry = this.history.find((e) => e.id === entryId);
    if (!entry) throw new Error("Entry not found");
    if (!this.controller?.system) throw new Error("System controller required");
    await this.controller.system.clipboardCopy(entry.text);
    this.lastContent = entry.text; // Don't re-add it
    log.info(`restored: "${entry.text.slice(0, 30)}..."`);
  }

  /** Paste from clipboard at current cursor position. */
  async paste(): Promise<void> {
    if (!this.controller) throw new Error("Controller required");
    await this.controller.hotkey(["ctrl"], "v");
  }

  /** Get clipboard stats. */
  stats(): { total: number; pinned: number; tags: Record<string, number> } {
    const tagCounts: Record<string, number> = {};
    for (const entry of this.history) {
      for (const tag of entry.tags) {
        tagCounts[tag] = (tagCounts[tag] ?? 0) + 1;
      }
    }
    return {
      total: this.history.length,
      pinned: this.history.filter((e) => e.pinned).length,
      tags: tagCounts,
    };
  }

  // -------------------------------------------------------------------------
  // Private
  // -------------------------------------------------------------------------

  private autoTag(text: string): string[] {
    const tags: string[] = [];
    if (/https?:\/\/\S+/.test(text)) tags.push("url");
    if (/[\w.+-]+@[\w-]+\.[\w.]+/.test(text)) tags.push("email");
    if (/^\d+$/.test(text.trim())) tags.push("number");
    if (/\{[\s\S]*\}/.test(text) || /\[[\s\S]*\]/.test(text)) tags.push("json");
    if (text.includes("function ") || text.includes("const ") || text.includes("import ")) tags.push("code");
    if (/^\/[\w/.-]+$/.test(text.trim())) tags.push("path");
    if (text.length > 500) tags.push("long");
    return tags;
  }
}
