/**
 * REST API — control the agent from any HTTP client.
 *
 * POST /api/command   — run a natural language command
 * POST /api/goal      — add a goal
 * GET  /api/status    — agent status
 * GET  /api/goals     — list goals
 * GET  /api/screenshot — get current screenshot
 * POST /api/click     — click at coordinates
 * POST /api/type      — type text
 * POST /api/hotkey    — press hotkey
 * POST /api/open      — open app/url/file
 * POST /api/shell     — run shell command (Linux)
 * GET  /api/windows   — list windows
 * POST /api/approval  — resolve approval request
 * GET  /api/profile   — get user profile
 * GET  /api/workflows — list recorded workflows
 * POST /api/workflow/replay — replay a workflow
 * GET  /api/health    — health check
 *
 * All responses are JSON. Authentication via Bearer token.
 */

import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { createSubsystemLogger } from "../logging/subsystem.js";
import type { DeviceController } from "./device-controller.js";
import type { NLCommander } from "./nl-commander.js";
import type { ApprovalGate } from "./approval.js";
import type { UserProfile } from "./user-profile.js";
import type { WorkflowReplay } from "./workflow-replay.js";
import { SECURITY_HEADERS, CommandGuard, auditLog } from "./security-hardening.js";

const log = createSubsystemLogger("rest-api");
const MAX_BODY_BYTES = 1_048_576; // 1 MB

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ApiConfig = {
  port: number;
  token?: string;          // Bearer token for auth
  cors: boolean;
  corsOrigins?: string[];  // Allowed CORS origins (empty = no wildcard)
  rateLimit: number;       // Max requests per minute
  requireAuth: boolean;    // Deny all requests without token
};

const DEFAULT_CONFIG: ApiConfig = {
  port: 7778,
  cors: true,
  corsOrigins: [],
  rateLimit: 120,
  requireAuth: true,
};

// ---------------------------------------------------------------------------
// REST API Server
// ---------------------------------------------------------------------------

export class AgentRestApi {
  private server: ReturnType<typeof createServer> | null = null;
  private config: ApiConfig;
  private controller: DeviceController | null = null;
  private commander: NLCommander | null = null;
  private approval: ApprovalGate | null = null;
  private profile: UserProfile | null = null;
  private workflows: WorkflowReplay | null = null;
  private requestCounts: Map<string, { count: number; resetAt: number }> = new Map();

  constructor(config?: Partial<ApiConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /** Wire up all dependencies. */
  init(deps: {
    controller?: DeviceController;
    commander?: NLCommander;
    approval?: ApprovalGate;
    profile?: UserProfile;
    workflows?: WorkflowReplay;
  }): void {
    this.controller = deps.controller ?? null;
    this.commander = deps.commander ?? null;
    this.approval = deps.approval ?? null;
    this.profile = deps.profile ?? null;
    this.workflows = deps.workflows ?? null;
  }

  /** Start the API server. */
  async start(): Promise<string> {
    return new Promise((resolve) => {
      this.server = createServer((req, res) => {
        void this.handleRequest(req, res);
      });

      this.server.listen(this.config.port, () => {
        const url = `http://localhost:${this.config.port}`;
        log.info(`REST API running at ${url}`);
        resolve(url);
      });
    });
  }

  /** Stop the API server. */
  async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => resolve());
      } else {
        resolve();
      }
    });
  }

  // -------------------------------------------------------------------------
  // Request handling
  // -------------------------------------------------------------------------

  private async handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    // Security headers on every response
    for (const [k, v] of Object.entries(SECURITY_HEADERS)) {
      res.setHeader(k, v);
    }

    // CORS — restrictive by default
    if (this.config.cors) {
      const origin = req.headers.origin ?? "";
      const allowed = this.config.corsOrigins?.length
        ? this.config.corsOrigins.includes(origin) ? origin : ""
        : "*";
      if (allowed) {
        res.setHeader("Access-Control-Allow-Origin", allowed);
        res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
        res.setHeader("Vary", "Origin");
      }
      if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }
    }

    // Auth — deny-by-default when requireAuth is true
    if (this.config.requireAuth || this.config.token) {
      const auth = req.headers.authorization;
      if (!this.config.token) {
        log.error("requireAuth is true but no token is configured — rejecting all requests");
        this.json(res, 500, { error: "Server misconfigured: no auth token set" });
        return;
      }
      if (!auth || auth !== `Bearer ${this.config.token}`) {
        await auditLog.record({ category: "auth", action: "auth_failed", detail: `IP: ${req.socket.remoteAddress}`, source: req.socket.remoteAddress ?? "unknown", riskLevel: "high", approved: false });
        this.json(res, 401, { error: "Unauthorized" });
        return;
      }
    }

    // Rate limiting
    const ip = req.socket.remoteAddress ?? "unknown";
    if (!this.checkRateLimit(ip)) {
      this.json(res, 429, { error: "Rate limit exceeded" });
      return;
    }

    // Routing
    const url = req.url ?? "/";
    const method = req.method ?? "GET";

    try {
      // GET routes
      if (method === "GET") {
        switch (url) {
          case "/api/health": return this.json(res, 200, { status: "ok", timestamp: Date.now() });
          case "/api/status": return this.json(res, 200, await this.getStatus());
          case "/api/goals": return this.json(res, 200, { goals: [] }); // TODO: wire to goal queue
          case "/api/screenshot": return await this.handleScreenshot(res);
          case "/api/windows": return await this.handleListWindows(res);
          case "/api/profile": return this.handleGetProfile(res);
          case "/api/workflows": return this.handleListWorkflows(res);
          default: return this.json(res, 404, { error: "Not found" });
        }
      }

      // POST routes
      if (method === "POST") {
        const body = await this.readBody(req);
        switch (url) {
          case "/api/command": return await this.handleCommand(body, res);
          case "/api/goal": return this.handleAddGoal(body, res);
          case "/api/click": return await this.handleClick(body, res);
          case "/api/type": return await this.handleType(body, res);
          case "/api/hotkey": return await this.handleHotkey(body, res);
          case "/api/open": return await this.handleOpen(body, res);
          case "/api/shell": return await this.handleShell(body, res);
          case "/api/approval": return this.handleApproval(body, res);
          case "/api/workflow/replay": return await this.handleWorkflowReplay(body, res);
          default: return this.json(res, 404, { error: "Not found" });
        }
      }

      this.json(res, 405, { error: "Method not allowed" });
    } catch (err) {
      log.error(`API error: ${err instanceof Error ? err.message : String(err)}`);
      this.json(res, 500, { error: err instanceof Error ? err.message : "Internal error" });
    }
  }

  // -------------------------------------------------------------------------
  // Route handlers
  // -------------------------------------------------------------------------

  private async getStatus(): Promise<Record<string, unknown>> {
    return {
      agent: "running",
      platform: this.controller?.platform ?? "unknown",
      timestamp: Date.now(),
      features: {
        deviceControl: !!this.controller,
        nlCommander: !!this.commander,
        approval: !!this.approval,
        profile: !!this.profile,
        workflows: !!this.workflows,
      },
    };
  }

  private async handleCommand(body: Record<string, unknown>, res: ServerResponse): Promise<void> {
    const command = body.command as string;
    if (!command) return this.json(res, 400, { error: "Missing 'command' field" });
    if (!this.commander) return this.json(res, 503, { error: "NL Commander not initialized" });

    const result = await this.commander.execute(command);
    this.json(res, 200, {
      success: result.success,
      command: result.command,
      actionsExecuted: result.actions.length,
      durationMs: result.durationMs,
      error: result.error,
    });
  }

  private handleAddGoal(body: Record<string, unknown>, res: ServerResponse): void {
    const description = body.description as string;
    if (!description) return this.json(res, 400, { error: "Missing 'description'" });
    // TODO: wire to goal queue
    this.json(res, 201, { status: "goal_added", description });
  }

  private async handleScreenshot(res: ServerResponse): Promise<void> {
    if (!this.controller) return this.json(res, 503, { error: "Controller not ready" });
    const screenshot = await this.controller.captureScreen();
    res.writeHead(200, { "Content-Type": "image/png", "Content-Length": screenshot.length });
    res.end(screenshot);
  }

  private async handleListWindows(res: ServerResponse): Promise<void> {
    if (!this.controller) return this.json(res, 503, { error: "Controller not ready" });
    const windows = await this.controller.listWindows();
    this.json(res, 200, { windows });
  }

  private async handleClick(body: Record<string, unknown>, res: ServerResponse): Promise<void> {
    if (!this.controller) return this.json(res, 503, { error: "Controller not ready" });
    const x = body.x as number;
    const y = body.y as number;
    if (x === undefined || y === undefined) return this.json(res, 400, { error: "Missing x, y" });
    await this.controller.click(x, y, body.button as any);
    this.json(res, 200, { status: "clicked", x, y });
  }

  private async handleType(body: Record<string, unknown>, res: ServerResponse): Promise<void> {
    if (!this.controller) return this.json(res, 503, { error: "Controller not ready" });
    const text = body.text as string;
    if (!text) return this.json(res, 400, { error: "Missing 'text'" });
    await this.controller.type(text);
    this.json(res, 200, { status: "typed", length: text.length });
  }

  private async handleHotkey(body: Record<string, unknown>, res: ServerResponse): Promise<void> {
    if (!this.controller) return this.json(res, 503, { error: "Controller not ready" });
    const modifiers = body.modifiers as string[];
    const key = body.key as string;
    if (!modifiers || !key) return this.json(res, 400, { error: "Missing modifiers, key" });
    await this.controller.hotkey(modifiers as any, key);
    this.json(res, 200, { status: "pressed", combo: `${modifiers.join("+")}+${key}` });
  }

  private async handleOpen(body: Record<string, unknown>, res: ServerResponse): Promise<void> {
    if (!this.controller) return this.json(res, 503, { error: "Controller not ready" });
    if (body.app) { await this.controller.openApp(body.app as string); }
    else if (body.url) { await this.controller.openUrl(body.url as string); }
    else if (body.file) { await this.controller.openFile(body.file as string); }
    else return this.json(res, 400, { error: "Provide app, url, or file" });
    this.json(res, 200, { status: "opened" });
  }

  private async handleShell(body: Record<string, unknown>, res: ServerResponse): Promise<void> {
    if (!this.controller?.system) return this.json(res, 503, { error: "System controller not available" });
    const command = body.command as string;
    if (!command) return this.json(res, 400, { error: "Missing 'command'" });

    // Command injection guard
    const check = CommandGuard.isSafe(command);
    if (!check.safe) {
      await auditLog.record({ category: "security", action: "shell_blocked", detail: `${check.reason}: ${command.slice(0, 100)}`, source: "api", riskLevel: "critical", approved: false });
      return this.json(res, 403, { error: `Blocked: ${check.reason}` });
    }

    await auditLog.record({ category: "shell", action: "exec", detail: command.slice(0, 200), source: "api", riskLevel: "high", approved: true });
    const result = await this.controller.system.exec(command);
    this.json(res, 200, result);
  }

  private handleApproval(body: Record<string, unknown>, res: ServerResponse): void {
    if (!this.approval) return this.json(res, 503, { error: "Approval gate not available" });
    const requestId = body.requestId as string;
    const approved = body.approved as boolean;
    if (!requestId || approved === undefined) return this.json(res, 400, { error: "Missing requestId, approved" });
    this.approval.resolve(requestId, approved, body.alwaysAllow as boolean);
    this.json(res, 200, { status: approved ? "approved" : "denied" });
  }

  private handleGetProfile(res: ServerResponse): void {
    if (!this.profile) return this.json(res, 503, { error: "Profile not available" });
    this.json(res, 200, this.profile.getData());
  }

  private handleListWorkflows(res: ServerResponse): void {
    if (!this.workflows) return this.json(res, 503, { error: "Workflows not available" });
    this.json(res, 200, { workflows: this.workflows.list() });
  }

  private async handleWorkflowReplay(body: Record<string, unknown>, res: ServerResponse): Promise<void> {
    if (!this.workflows) return this.json(res, 503, { error: "Workflows not available" });
    const id = body.workflowId as string;
    if (!id) return this.json(res, 400, { error: "Missing workflowId" });
    const result = await this.workflows.replay(id);
    this.json(res, 200, result);
  }

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  private json(res: ServerResponse, status: number, data: unknown): void {
    res.writeHead(status, { "Content-Type": "application/json" });
    res.end(JSON.stringify(data));
  }

  private readBody(req: IncomingMessage): Promise<Record<string, unknown>> {
    return new Promise((resolve, reject) => {
      let body = "";
      let size = 0;
      req.on("data", (chunk: Buffer | string) => {
        size += typeof chunk === "string" ? chunk.length : chunk.byteLength;
        if (size > MAX_BODY_BYTES) {
          req.destroy();
          reject(new Error("Request body too large"));
          return;
        }
        body += chunk;
      });
      req.on("end", () => {
        try { resolve(JSON.parse(body || "{}")); } catch { resolve({}); }
      });
      req.on("error", reject);
    });
  }

  private checkRateLimit(ip: string): boolean {
    const now = Date.now();
    const entry = this.requestCounts.get(ip);
    if (!entry || now > entry.resetAt) {
      this.requestCounts.set(ip, { count: 1, resetAt: now + 60_000 });
      return true;
    }
    entry.count++;
    return entry.count <= this.config.rateLimit;
  }
}
