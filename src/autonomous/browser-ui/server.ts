/**
 * Agent Browser Dashboard — HTTP + WebSocket Server
 *
 * Serves a custom browser UI that shows the agent working in real-time:
 * - Live browser view via CDP screenshot streaming
 * - Agent state, current goal, action history
 * - Goal queue management (add/pause/cancel)
 * - Self-improvement stats and learned rules
 * - User message input for steering the agent
 *
 * Starts on a local port and opens in the user's default browser.
 */

import type { Page } from "playwright-core";
import { readFileSync } from "node:fs";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { join, extname } from "node:path";
import { WebSocketServer, WebSocket } from "ws";
import type { AutonomousAgent } from "../loop.js";
import type { AgentMemory } from "../memory.js";
import type { SelfImprover } from "../self-improve.js";
import type { AgentEvent, AgentState, Goal } from "../types.js";
import type { AgentUI } from "../user-interface.js";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const DEFAULT_PORT = 7700;
const SCREENSHOT_INTERVAL_MS = 800;
const STATIC_DIR = new URL(".", import.meta.url).pathname;

// ---------------------------------------------------------------------------
// MIME types
// ---------------------------------------------------------------------------

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

// ---------------------------------------------------------------------------
// Dashboard server
// ---------------------------------------------------------------------------

export class BrowserDashboard {
  private server: ReturnType<typeof createServer> | null = null;
  private wss: WebSocketServer | null = null;
  private screenshotTimer: ReturnType<typeof setInterval> | null = null;
  private clients: Set<WebSocket> = new Set();
  private port: number;

  private page: Page | null = null;
  private agent: AutonomousAgent | null = null;
  private ui: AgentUI | null = null;
  private memory: AgentMemory | null = null;
  private improver: SelfImprover | null = null;

  constructor(port: number = DEFAULT_PORT) {
    this.port = port;
  }

  /**
   * Start the dashboard server.
   */
  async start(opts: {
    page: Page;
    agent: AutonomousAgent;
    ui: AgentUI;
    memory: AgentMemory;
    improver: SelfImprover;
  }): Promise<string> {
    this.page = opts.page;
    this.agent = opts.agent;
    this.ui = opts.ui;
    this.memory = opts.memory;
    this.improver = opts.improver;

    // Create HTTP server
    this.server = createServer((req, res) => this.handleHttp(req, res));

    // Create WebSocket server
    this.wss = new WebSocketServer({ server: this.server });

    this.wss.on("connection", (ws) => {
      this.clients.add(ws);

      // Send initial state
      this.sendTo(ws, {
        type: "init",
        state: this.getFullState(),
      });

      ws.on("message", (data) => {
        try {
          const msg = JSON.parse(data.toString());
          void this.handleClientMessage(msg, ws);
        } catch {
          // Invalid message
        }
      });

      ws.on("close", () => {
        this.clients.delete(ws);
      });
    });

    // Listen for agent events
    this.agent.onEvent((event) => {
      this.broadcast({ type: "agent_event", event });
    });

    // Start screenshot streaming
    this.startScreenshotStream();

    // Start server
    return new Promise((resolve, reject) => {
      this.server!.listen(this.port, () => {
        const url = `http://localhost:${this.port}`;
        resolve(url);
      });

      this.server!.on("error", (err: NodeJS.ErrnoException) => {
        if (err.code === "EADDRINUSE") {
          // Try next port
          this.port += 1;
          this.server!.listen(this.port, () => {
            resolve(`http://localhost:${this.port}`);
          });
        } else {
          reject(err);
        }
      });
    });
  }

  /**
   * Stop the dashboard server.
   */
  async stop(): Promise<void> {
    if (this.screenshotTimer) {
      clearInterval(this.screenshotTimer);
      this.screenshotTimer = null;
    }

    for (const ws of this.clients) {
      ws.close();
    }
    this.clients.clear();

    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }

    if (this.server) {
      return new Promise((resolve) => {
        this.server!.close(() => resolve());
      });
    }
  }

  // ---------------------------------------------------------------------------
  // HTTP handler
  // ---------------------------------------------------------------------------

  private handleHttp(req: IncomingMessage, res: ServerResponse): void {
    const url = req.url ?? "/";
    let filePath: string;

    if (url === "/" || url === "/index.html") {
      filePath = join(STATIC_DIR, "dashboard.html");
    } else if (url === "/client.js") {
      filePath = join(STATIC_DIR, "client.js");
    } else {
      res.writeHead(404);
      res.end("Not Found");
      return;
    }

    try {
      const content = readFileSync(filePath, "utf-8");
      const ext = extname(filePath);
      const mime = MIME_TYPES[ext] ?? "text/plain";
      res.writeHead(200, { "Content-Type": mime });
      res.end(content);
    } catch {
      res.writeHead(404);
      res.end("Not Found");
    }
  }

  // ---------------------------------------------------------------------------
  // WebSocket handler
  // ---------------------------------------------------------------------------

  private async handleClientMessage(
    msg: { type: string; [key: string]: unknown },
    ws: WebSocket,
  ): Promise<void> {
    switch (msg.type) {
      case "add_goal": {
        const description = String(msg.description ?? "");
        const priority = (msg.priority as Goal["priority"]) ?? "normal";
        if (description && this.agent) {
          const goal = this.agent.goals.add({ description, priority });
          this.broadcast({ type: "goal_added", goal });
        }
        break;
      }

      case "user_message": {
        const content = String(msg.content ?? "");
        if (content && this.ui) {
          this.ui.sendUserMessage(content);
          this.broadcast({ type: "user_message_sent", content });
        }
        break;
      }

      case "pause_goal": {
        const goalId = String(msg.goalId ?? "");
        if (goalId && this.agent) {
          this.agent.goals.pause(goalId);
          this.broadcast({ type: "goal_updated", goals: this.agent.goals.list() });
        }
        break;
      }

      case "cancel_goal": {
        const goalId = String(msg.goalId ?? "");
        if (goalId && this.agent) {
          this.agent.goals.fail(goalId, "Cancelled by user");
          this.broadcast({ type: "goal_updated", goals: this.agent.goals.list() });
        }
        break;
      }

      case "request_state": {
        this.sendTo(ws, { type: "full_state", state: this.getFullState() });
        break;
      }

      case "run_improvement": {
        // Trigger from the daemon side — this will be handled there
        this.broadcast({ type: "improvement_triggered" });
        break;
      }

      case "click": {
        // Forward user clicks on the browser view to the actual page
        const x = Number(msg.x ?? 0);
        const y = Number(msg.y ?? 0);
        if (this.page) {
          await this.page.mouse.click(x, y);
        }
        break;
      }

      case "navigate": {
        const navUrl = String(msg.url ?? "");
        if (navUrl && this.page) {
          await this.page
            .goto(navUrl, { waitUntil: "domcontentloaded", timeout: 15_000 })
            .catch(() => {});
        }
        break;
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Screenshot streaming
  // ---------------------------------------------------------------------------

  private startScreenshotStream(): void {
    this.screenshotTimer = setInterval(async () => {
      if (this.clients.size === 0 || !this.page) return;

      try {
        const screenshot = await this.page.screenshot({
          type: "jpeg",
          quality: 60,
        });
        const base64 = Buffer.from(screenshot).toString("base64");

        this.broadcast({
          type: "screenshot",
          data: base64,
          url: this.page.url(),
          title: await this.page.title().catch(() => ""),
        });
      } catch {
        // Page might be navigating
      }
    }, SCREENSHOT_INTERVAL_MS);
  }

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------

  private getFullState(): Record<string, unknown> {
    const agent = this.agent;
    const memory = this.memory;
    const improver = this.improver;

    return {
      agentState: agent?.currentState ?? "idle",
      activeGoal: agent?.activeGoal ?? null,
      goals: agent?.goals.list() ?? [],
      activeGoalCount: agent?.goals.activeCount ?? 0,
      isRunning: agent?.isRunning ?? false,
      memoryStats: memory?.getStats() ?? { episodes: 0, procedures: 0, failures: 0 },
      improvementState: improver
        ? {
            version: improver.getState().version,
            rulesCount: improver.getState().learnedRules.length,
            templatesCount: improver.getState().goalTemplates.length,
            blacklisted: improver.getState().blacklistedStrategies,
            domainHintsCount: Object.keys(improver.getState().domainHints).length,
          }
        : null,
      recentEvents: this.ui?.getRecentEvents(20) ?? [],
    };
  }

  // ---------------------------------------------------------------------------
  // Broadcasting
  // ---------------------------------------------------------------------------

  private broadcast(data: Record<string, unknown>): void {
    const json = JSON.stringify(data);
    for (const ws of this.clients) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(json);
      }
    }
  }

  private sendTo(ws: WebSocket, data: Record<string, unknown>): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    }
  }
}
