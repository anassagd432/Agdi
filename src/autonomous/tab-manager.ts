/**
 * Multi-tab manager for the autonomous agent.
 *
 * Orchestrates multiple browser tabs, allowing the agent to open,
 * switch between, and close tabs. Each tab gets its own context
 * and the agent can work across them.
 */

import type { Page, BrowserContext } from "playwright-core";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Tab = {
  id: string;
  page: Page;
  title: string;
  url: string;
  active: boolean;
  createdAt: string;
};

// ---------------------------------------------------------------------------
// TabManager
// ---------------------------------------------------------------------------

export class TabManager {
  private tabs: Map<string, Tab> = new Map();
  private activeTabId: string | null = null;
  private context: BrowserContext | null = null;
  private tabCounter = 0;

  /** Initialize with a browser context and the initial page. */
  init(context: BrowserContext, initialPage: Page): void {
    this.context = context;
    const id = this.nextId();
    const tab: Tab = {
      id,
      page: initialPage,
      title: "New Tab",
      url: initialPage.url(),
      active: true,
      createdAt: new Date().toISOString(),
    };
    this.tabs.set(id, tab);
    this.activeTabId = id;

    // Listen for page close
    initialPage.on("close", () => this.tabs.delete(id));
  }

  /** Open a new tab, optionally navigating to a URL. */
  async openTab(url?: string): Promise<Tab> {
    if (!this.context) throw new Error("TabManager not initialized");

    const page = await this.context.newPage();
    if (url) {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15_000 }).catch(() => {});
    }

    const id = this.nextId();
    const tab: Tab = {
      id,
      page,
      title: await page.title().catch(() => "New Tab"),
      url: page.url(),
      active: false,
      createdAt: new Date().toISOString(),
    };

    this.tabs.set(id, tab);
    page.on("close", () => this.tabs.delete(id));

    return tab;
  }

  /** Switch to a specific tab by ID. */
  switchTo(tabId: string): Page | null {
    const tab = this.tabs.get(tabId);
    if (!tab) return null;

    // Deactivate current
    if (this.activeTabId) {
      const current = this.tabs.get(this.activeTabId);
      if (current) current.active = false;
    }

    tab.active = true;
    this.activeTabId = tabId;
    return tab.page;
  }

  /** Close a tab by ID. Returns the page to switch to (if any). */
  async closeTab(tabId: string): Promise<Page | null> {
    const tab = this.tabs.get(tabId);
    if (!tab) return null;

    await tab.page.close().catch(() => {});
    this.tabs.delete(tabId);

    // If we closed the active tab, switch to another
    if (this.activeTabId === tabId) {
      const remaining = Array.from(this.tabs.values());
      if (remaining.length > 0) {
        return this.switchTo(remaining[0]!.id);
      }
      this.activeTabId = null;
    }

    return this.getActivePage();
  }

  /** Get the currently active page. */
  getActivePage(): Page | null {
    if (!this.activeTabId) return null;
    return this.tabs.get(this.activeTabId)?.page ?? null;
  }

  /** Get the active tab ID. */
  getActiveTabId(): string | null {
    return this.activeTabId;
  }

  /** List all open tabs. */
  list(): Tab[] {
    return Array.from(this.tabs.values()).map((t) => ({
      ...t,
      title: t.title,
      url: t.page.url(),
    }));
  }

  /** Refresh tab metadata (titles, URLs). */
  async refresh(): Promise<void> {
    for (const tab of this.tabs.values()) {
      try {
        tab.url = tab.page.url();
        tab.title = await tab.page.title();
      } catch {
        // Page may be closed
      }
    }
  }

  /** Number of open tabs. */
  get count(): number {
    return this.tabs.size;
  }

  /** Find a tab by URL pattern. */
  findByUrl(pattern: string | RegExp): Tab | undefined {
    const regex = typeof pattern === "string" ? new RegExp(pattern, "i") : pattern;
    return Array.from(this.tabs.values()).find((t) => regex.test(t.page.url()));
  }

  /** Close all tabs except the active one. */
  async closeOthers(): Promise<void> {
    const toClose = Array.from(this.tabs.entries()).filter(([id]) => id !== this.activeTabId);
    for (const [id, tab] of toClose) {
      await tab.page.close().catch(() => {});
      this.tabs.delete(id);
    }
  }

  private nextId(): string {
    return `tab-${++this.tabCounter}`;
  }
}
