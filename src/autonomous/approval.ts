/**
 * Safety & Approval Gate.
 *
 * Every device action goes through this gate before execution.
 * Low-risk actions auto-approve. High-risk actions pause and wait
 * for user approval via the dashboard.
 *
 * Risk levels:
 * - AUTO:     Always allow (click, type, scroll, screenshot)
 * - PROMPT:   Ask user first (close window, open unknown app, file operations)
 * - DENY:     Never allow without explicit override (shutdown, reboot, delete)
 */

import { createSubsystemLogger } from "../logging/subsystem.js";
import type { DeviceAction, DeviceActionType } from "./device/types.js";
import { auditLog } from "./security-hardening.js";

const log = createSubsystemLogger("approval");
const MAX_HISTORY = 10_000;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ApprovalLevel = "auto" | "prompt" | "deny";

export type ApprovalRequest = {
  id: string;
  action: DeviceAction;
  riskLevel: ApprovalLevel;
  description: string;
  timestamp: number;
  resolved: boolean;
  approved: boolean;
};

export type ApprovalRule = {
  pattern: string;        // Action type or pattern
  level: ApprovalLevel;
};

// ---------------------------------------------------------------------------
// Default risk map
// ---------------------------------------------------------------------------

const DEFAULT_RISK: Record<DeviceActionType, ApprovalLevel> = {
  // Auto-approve: low risk, normal user interactions
  device_click: "auto",
  device_double_click: "auto",
  device_right_click: "auto",
  device_type: "auto",
  device_press_key: "auto",
  device_hotkey: "auto",
  device_scroll: "auto",
  device_drag: "auto",
  device_screenshot: "auto",
  device_focus_window: "auto",
  device_open_url: "auto",

  // Prompt: medium risk, could be disruptive
  device_open_app: "prompt",
  device_open_file: "prompt",
  device_close_window: "prompt",
  device_minimize_window: "auto",
  device_maximize_window: "auto",
};

// ---------------------------------------------------------------------------
// Approval Gate
// ---------------------------------------------------------------------------

export class ApprovalGate {
  private riskMap: Record<string, ApprovalLevel>;
  private pending: Map<string, ApprovalRequest> = new Map();
  private allowList: Set<string> = new Set();  // "Always Allow" patterns
  private denyList: Set<string> = new Set();   // "Always Deny" patterns
  private history: ApprovalRequest[] = [];
  private onPrompt: ((request: ApprovalRequest) => void) | null = null;
  private resolvers: Map<string, (approved: boolean) => void> = new Map();

  constructor(customRules?: ApprovalRule[]) {
    this.riskMap = { ...DEFAULT_RISK };

    // Apply custom rules
    if (customRules) {
      for (const rule of customRules) {
        this.riskMap[rule.pattern] = rule.level;
      }
    }
  }

  /**
   * Set the callback for when a prompt-level action needs approval.
   * The dashboard UI calls this to show the approval modal.
   */
  setPromptHandler(handler: (request: ApprovalRequest) => void): void {
    this.onPrompt = handler;
  }

  /**
   * Check whether an action is approved.
   *
   * - auto → returns true immediately
   * - prompt → pauses and waits for user response
   * - deny → returns false immediately
   *
   * Returns true if approved, false if denied.
   */
  async check(action: DeviceAction): Promise<boolean> {
    const level = this.getRiskLevel(action);

    // Check allow list first
    if (this.allowList.has(action.action) || this.allowList.has(this.getActionKey(action))) {
      log.info(`auto-allowed (allowlist): ${action.action}`);
      return true;
    }

    // Check deny list
    if (this.denyList.has(action.action) || this.denyList.has(this.getActionKey(action))) {
      log.warn(`denied (denylist): ${action.action}`);
      return false;
    }

    switch (level) {
      case "auto":
        return true;

      case "deny":
        log.warn(`denied: ${action.action} (risk level: deny)`);
        return false;

      case "prompt": {
        const request = this.createRequest(action);
        log.info(`awaiting approval: ${request.description}`);

        // Notify dashboard
        if (this.onPrompt) {
          this.onPrompt(request);
        } else {
          // SECURITY: No handler registered — DENY by default
          log.warn(`no approval handler — DENYING by default: ${request.description}`);
          await auditLog.record({ category: "security", action: "approval_denied_no_handler", detail: request.description, source: "agent", riskLevel: "high", approved: false });
          return false;
        }

        // Wait for user response (with 60s timeout)
        const approved = await new Promise<boolean>((resolve) => {
          this.resolvers.set(request.id, resolve);

          // Timeout after 60s — deny by default
          setTimeout(() => {
            if (this.resolvers.has(request.id)) {
              this.resolvers.delete(request.id);
              request.resolved = true;
              request.approved = false;
              log.warn(`approval timeout — denied: ${request.description}`);
              resolve(false);
            }
          }, 60_000);
        });

        return approved;
      }

      default:
        return true;
    }
  }

  /**
   * Resolve a pending approval request.
   * Called by the dashboard when user clicks Allow/Deny.
   */
  resolve(requestId: string, approved: boolean, alwaysAllow: boolean = false): void {
    const request = this.pending.get(requestId);
    if (!request) return;

    request.resolved = true;
    request.approved = approved;
    this.pending.delete(requestId);
    this.history.push(request);

    // Cap history
    if (this.history.length > MAX_HISTORY) {
      this.history = this.history.slice(-MAX_HISTORY);
    }

    // Audit log
    void auditLog.record({
      category: "device",
      action: approved ? "action_approved" : "action_denied",
      detail: request.description,
      source: "user",
      riskLevel: approved ? "medium" : "high",
      approved,
    });

    // "Always Allow" — add to allowlist
    if (approved && alwaysAllow) {
      this.allowList.add(request.action.action);
      log.info(`added to allowlist: ${request.action.action}`);
    }

    // Resolve the promise
    const resolver = this.resolvers.get(requestId);
    if (resolver) {
      this.resolvers.delete(requestId);
      resolver(approved);
    }

    log.info(`${approved ? "approved" : "denied"}: ${request.description}`);
  }

  /** Get all pending approval requests. */
  getPending(): ApprovalRequest[] {
    return Array.from(this.pending.values());
  }

  /** Get approval history. */
  getHistory(): ApprovalRequest[] {
    return this.history;
  }

  /** Override risk level for a specific action type. */
  setRiskLevel(actionType: string, level: ApprovalLevel): void {
    this.riskMap[actionType] = level;
  }

  /** Add to always-allow list. */
  alwaysAllow(pattern: string): void {
    this.allowList.add(pattern);
    this.denyList.delete(pattern);
  }

  /** Add to always-deny list. */
  alwaysDeny(pattern: string): void {
    this.denyList.add(pattern);
    this.allowList.delete(pattern);
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  private getRiskLevel(action: DeviceAction): ApprovalLevel {
    // Check specific action key first (e.g. "device_open_app:firefox")
    const key = this.getActionKey(action);
    if (this.riskMap[key]) return this.riskMap[key];

    // Then check action type
    return this.riskMap[action.action] ?? "prompt";
  }

  private getActionKey(action: DeviceAction): string {
    switch (action.action) {
      case "device_open_app": return `device_open_app:${action.appName}`;
      case "device_open_file": return `device_open_file:${action.filePath}`;
      case "device_open_url": return `device_open_url:${action.url}`;
      case "device_focus_window": return `device_focus_window:${action.windowTitle}`;
      case "device_close_window": return `device_close_window:${action.windowTitle}`;
      default: return action.action;
    }
  }

  private createRequest(action: DeviceAction): ApprovalRequest {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const request: ApprovalRequest = {
      id,
      action,
      riskLevel: this.getRiskLevel(action),
      description: this.describeAction(action),
      timestamp: Date.now(),
      resolved: false,
      approved: false,
    };
    this.pending.set(id, request);
    return request;
  }

  private describeAction(action: DeviceAction): string {
    switch (action.action) {
      case "device_open_app": return `Open application: ${action.appName}`;
      case "device_open_file": return `Open file: ${action.filePath}`;
      case "device_open_url": return `Open URL: ${action.url}`;
      case "device_close_window": return `Close window: ${action.windowTitle || "active window"}`;
      case "device_click": return `Click at (${action.coordinates?.x}, ${action.coordinates?.y})`;
      case "device_type": return `Type: "${action.text?.slice(0, 50)}"`;
      case "device_hotkey": return `Hotkey: ${action.modifiers?.join("+")}+${action.key}`;
      default: return `${action.action}: ${action.reasoning}`;
    }
  }
}
