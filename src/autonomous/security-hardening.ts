/**
 * AGDI Security Hardening
 *
 * Cross-cutting security layer that protects the autonomous agent from:
 *   1. Command injection
 *   2. Path traversal
 *   3. Unauthorized access
 *   4. Unbounded resource usage
 *   5. Unaudited actions
 *
 * All security-sensitive modules import and use these primitives.
 */

import * as crypto from "node:crypto";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { createSubsystemLogger } from "../logging/subsystem.js";

const log = createSubsystemLogger("security");

// ---------------------------------------------------------------------------
// 1. INPUT SANITISER — prevent command injection
// ---------------------------------------------------------------------------

/** Characters that must NEVER appear in shell arguments. */
const SHELL_META = /[;&|`$(){}[\]!#~<>\\'"*?\n\r]/g;

export class InputSanitiser {
  /** Strip all shell metacharacters from a value. */
  static stripMeta(input: string): string {
    return input.replace(SHELL_META, "");
  }

  /** Validate and sanitise a hostname / IP. */
  static sanitiseHost(host: string): string {
    // Allow DNS names, IPv4, IPv6 only
    const clean = host.trim();
    if (!/^[a-zA-Z0-9.\-:/%]+$/.test(clean)) {
      throw new SecurityError(`Invalid host: ${clean}`);
    }
    return clean;
  }

  /** Validate a port number. */
  static sanitisePort(port: number): number {
    const n = Math.floor(port);
    if (n < 0 || n > 65535) throw new SecurityError(`Invalid port: ${port}`);
    return n;
  }

  /** Validate a port range string like "80", "1-1024", "80,443,8080". */
  static sanitisePortRange(range: string): string {
    if (!/^[0-9,\- ]+$/.test(range)) {
      throw new SecurityError(`Invalid port range: ${range}`);
    }
    return range.replace(/\s/g, "");
  }

  /** Validate a URL — must start with http(s). */
  static sanitiseUrl(url: string): string {
    try {
      const parsed = new URL(url);
      if (!["http:", "https:"].includes(parsed.protocol)) {
        throw new SecurityError(`Disallowed protocol: ${parsed.protocol}`);
      }
      return parsed.href;
    } catch (e) {
      throw new SecurityError(`Invalid URL: ${url}`);
    }
  }

  /** Escape a string for safe inclusion in a shell command. */
  static shellEscape(arg: string): string {
    // Single-quote wrapping — the safest approach
    return "'" + arg.replace(/'/g, "'\\''") + "'";
  }

  /** Validate that a string doesn't exceed max length. */
  static enforceMaxLength(value: string, max: number, label = "input"): string {
    if (value.length > max) {
      throw new SecurityError(`${label} exceeds max length (${max})`);
    }
    return value;
  }
}

// ---------------------------------------------------------------------------
// 2. FILE SANDBOX — restrict file system access
// ---------------------------------------------------------------------------

export class FileSandbox {
  private readonly allowedRoots: string[];

  /**
   * @param roots  Absolute directory paths the agent is allowed to access.
   *               Defaults to $HOME and /tmp.
   */
  constructor(roots?: string[]) {
    const home = process.env.HOME ?? "/home";
    this.allowedRoots = roots ?? [home, "/tmp", "/var/tmp"];
  }

  /** Resolve a path and verify it stays within allowed roots. */
  resolve(filePath: string): string {
    const resolved = path.resolve(filePath);

    // Block obvious traversal
    if (filePath.includes("..")) {
      throw new SecurityError(`Path traversal blocked: ${filePath}`);
    }

    // Check root
    const allowed = this.allowedRoots.some((root) => resolved.startsWith(root));
    if (!allowed) {
      throw new SecurityError(`Access denied — outside sandbox: ${resolved}`);
    }

    return resolved;
  }

  /** Check if a path is within the sandbox (non-throwing). */
  isAllowed(filePath: string): boolean {
    try {
      this.resolve(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /** Add a new allowed root directory. */
  addRoot(root: string): void {
    const resolved = path.resolve(root);
    if (!this.allowedRoots.includes(resolved)) {
      this.allowedRoots.push(resolved);
    }
  }

  /** Get all allowed root directories. */
  getRoots(): readonly string[] {
    return this.allowedRoots;
  }
}

// ---------------------------------------------------------------------------
// 3. AUDIT LOG — tamper-evident trail of every action
// ---------------------------------------------------------------------------

export type AuditEntry = {
  id: string;
  timestamp: number;
  category: "device" | "api" | "security" | "shell" | "network" | "file" | "auth";
  action: string;
  detail: string;
  source: string; // Who initiated (API IP, user, agent)
  riskLevel: "low" | "medium" | "high" | "critical";
  approved: boolean;
  hash?: string; // HMAC of previous entry (chain of trust)
};

export class AuditLog {
  private entries: AuditEntry[] = [];
  private readonly maxEntries: number;
  private readonly logFile: string | null;
  private lastHash: string = "genesis";
  private readonly hmacKey: string;

  constructor(opts?: { maxEntries?: number; logFile?: string; hmacKey?: string }) {
    this.maxEntries = opts?.maxEntries ?? 50_000;
    this.logFile = opts?.logFile ?? null;
    this.hmacKey = opts?.hmacKey ?? crypto.randomBytes(32).toString("hex");
  }

  /** Record an action in the audit trail. */
  async record(entry: Omit<AuditEntry, "id" | "timestamp" | "hash">): Promise<AuditEntry> {
    const full: AuditEntry = {
      ...entry,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      hash: this.computeHash(entry),
    };

    this.lastHash = full.hash!;
    this.entries.push(full);

    // Trim if over max
    if (this.entries.length > this.maxEntries) {
      this.entries = this.entries.slice(-this.maxEntries);
    }

    // Persist to file
    if (this.logFile) {
      const line = JSON.stringify(full) + "\n";
      await fs.appendFile(this.logFile, line).catch((e) => {
        log.error(`Failed to write audit log: ${e}`);
      });
    }

    // Log high/critical
    if (full.riskLevel === "critical" || full.riskLevel === "high") {
      log.warn(`[AUDIT] ${full.riskLevel.toUpperCase()}: ${full.action} — ${full.detail}`);
    }

    return full;
  }

  /** Get entries matching filters. */
  query(opts?: {
    category?: AuditEntry["category"];
    riskLevel?: AuditEntry["riskLevel"];
    since?: number;
    limit?: number;
    source?: string;
  }): AuditEntry[] {
    let results = this.entries;
    if (opts?.category) results = results.filter((e) => e.category === opts.category);
    if (opts?.riskLevel) results = results.filter((e) => e.riskLevel === opts.riskLevel);
    if (opts?.since) results = results.filter((e) => e.timestamp >= opts.since!);
    if (opts?.source) results = results.filter((e) => e.source === opts.source);
    if (opts?.limit) results = results.slice(-opts.limit);
    return results;
  }

  /** Get total entry count. */
  get count(): number {
    return this.entries.length;
  }

  /** Verify the chain integrity. */
  verify(): { valid: boolean; brokenAt?: number } {
    let prev = "genesis";
    for (let i = 0; i < this.entries.length; i++) {
      const expected = crypto
        .createHmac("sha256", this.hmacKey)
        .update(
          prev +
            JSON.stringify({
              category: this.entries[i].category,
              action: this.entries[i].action,
              detail: this.entries[i].detail,
            }),
        )
        .digest("hex");
      if (this.entries[i].hash !== expected) {
        return { valid: false, brokenAt: i };
      }
      prev = this.entries[i].hash!;
    }
    return { valid: true };
  }

  private computeHash(entry: Omit<AuditEntry, "id" | "timestamp" | "hash">): string {
    return crypto
      .createHmac("sha256", this.hmacKey)
      .update(
        this.lastHash +
          JSON.stringify({
            category: entry.category,
            action: entry.action,
            detail: entry.detail,
          }),
      )
      .digest("hex");
  }
}

// ---------------------------------------------------------------------------
// 4. SESSION TOKEN MANAGER — time-limited API tokens
// ---------------------------------------------------------------------------

export type SessionToken = {
  token: string;
  createdAt: number;
  expiresAt: number;
  permissions: Set<string>;
  ip?: string;
};

export class SessionManager {
  private sessions: Map<string, SessionToken> = new Map();
  private readonly ttlMs: number;

  constructor(ttlMs: number = 3600_000) {
    // 1 hour default
    this.ttlMs = ttlMs;

    // Periodic cleanup every 5 minutes
    setInterval(() => this.cleanup(), 300_000).unref();
  }

  /** Create a new session token. */
  create(permissions: string[] = ["*"], ip?: string): SessionToken {
    const token = crypto.randomBytes(32).toString("base64url");
    const session: SessionToken = {
      token,
      createdAt: Date.now(),
      expiresAt: Date.now() + this.ttlMs,
      permissions: new Set(permissions),
      ip,
    };
    this.sessions.set(token, session);
    log.info(`Session created for ${ip ?? "unknown"} — expires in ${this.ttlMs / 1000}s`);
    return session;
  }

  /** Validate a token and check permission. */
  validate(token: string, permission?: string, ip?: string): boolean {
    const session = this.sessions.get(token);
    if (!session) return false;

    // Expired?
    if (Date.now() > session.expiresAt) {
      this.sessions.delete(token);
      return false;
    }

    // IP binding?
    if (session.ip && ip && session.ip !== ip) {
      log.warn(`Session IP mismatch: expected ${session.ip}, got ${ip}`);
      return false;
    }

    // Permission check
    if (permission && !session.permissions.has("*") && !session.permissions.has(permission)) {
      return false;
    }

    return true;
  }

  /** Revoke a token. */
  revoke(token: string): void {
    this.sessions.delete(token);
  }

  /** Revoke all sessions. */
  revokeAll(): void {
    this.sessions.clear();
    log.info("All sessions revoked");
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [token, session] of this.sessions) {
      if (now > session.expiresAt) this.sessions.delete(token);
    }
  }
}

// ---------------------------------------------------------------------------
// 5. RATE LIMITER — sliding window with per-action granularity
// ---------------------------------------------------------------------------

export class RateLimiter {
  private windows: Map<string, number[]> = new Map();
  private readonly windowMs: number;
  private readonly maxRequests: number;

  constructor(maxRequests: number = 120, windowMs: number = 60_000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  /** Check if a request is allowed. Returns false if rate-limited. */
  check(key: string): boolean {
    const now = Date.now();
    const timestamps = this.windows.get(key) ?? [];
    const windowStart = now - this.windowMs;

    // Remove expired timestamps
    const active = timestamps.filter((t) => t > windowStart);

    if (active.length >= this.maxRequests) {
      return false;
    }

    active.push(now);
    this.windows.set(key, active);
    return true;
  }

  /** Get remaining requests for a key. */
  remaining(key: string): number {
    const now = Date.now();
    const timestamps = this.windows.get(key) ?? [];
    const active = timestamps.filter((t) => t > now - this.windowMs);
    return Math.max(0, this.maxRequests - active.length);
  }
}

// ---------------------------------------------------------------------------
// 6. SHELL COMMAND BLOCKLIST — prevent dangerous commands
// ---------------------------------------------------------------------------

/** Commands that must NEVER be executed by the agent without explicit approval. */
const BLOCKED_COMMANDS = new Set([
  "rm -rf /",
  "rm -rf /*",
  "rm -rf ~",
  "rm -rf ~/",
  "mkfs",
  "dd if=/dev/zero",
  "dd if=/dev/random",
  ":(){:|:&};:",
  "fork bomb",
  "chmod -R 777 /",
  "chown -R",
  "shutdown",
  "reboot",
  "poweroff",
  "halt",
  "init 0",
  "init 6",
  "kill -9 -1",
  "killall",
  "iptables -F",
  "iptables --flush",
  "echo '' > /etc/passwd",
  "echo '' > /etc/shadow",
  "curl | sh",
  "curl | bash",
  "wget | sh",
  "wget | bash",
]);

/** Patterns that indicate dangerous intent. */
const DANGEROUS_PATTERNS = [
  /rm\s+(-\w+\s+)*\//, // rm anything starting with /
  />\s*\/etc\//, // Redirect to /etc
  />\s*\/dev\//, // Redirect to /dev
  /dd\s+.*of=\/dev/, // dd to devices
  /mkfs\./, // Format filesystem
  /:()\s*\{/, // Fork bomb
  /chmod\s+.*777\s+\//, // Chmod 777 on root paths
  /\|\s*(ba)?sh/, // Pipe to shell
  /eval\s/, // eval command
  /python\d?\s+-c.*__import__/, // Python code injection
  /node\s+-e/, // Node eval
];

export class CommandGuard {
  /** Check if a shell command is safe to execute. */
  static isSafe(command: string): { safe: boolean; reason?: string } {
    const lower = command.toLowerCase().trim();

    // Exact blocklist
    for (const blocked of BLOCKED_COMMANDS) {
      if (lower.includes(blocked)) {
        return { safe: false, reason: `Blocked command: ${blocked}` };
      }
    }

    // Pattern matching
    for (const pattern of DANGEROUS_PATTERNS) {
      if (pattern.test(command)) {
        return { safe: false, reason: `Dangerous pattern detected: ${pattern.source}` };
      }
    }

    return { safe: true };
  }

  /** Sanitise a command by blocking dangerous parts. */
  static sanitise(command: string): string {
    const check = this.isSafe(command);
    if (!check.safe) {
      throw new SecurityError(`Blocked: ${check.reason}`);
    }
    return command;
  }
}

// ---------------------------------------------------------------------------
// 7. SECURITY HEADERS — HTTP response hardening
// ---------------------------------------------------------------------------

export const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
  "Content-Security-Policy": "default-src 'self'",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "geolocation=(), camera=(), microphone=()",
  "Cache-Control": "no-store, no-cache, must-revalidate",
  Pragma: "no-cache",
};

// ---------------------------------------------------------------------------
// 8. SECURITY ERROR
// ---------------------------------------------------------------------------

export class SecurityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SecurityError";
  }
}

// ---------------------------------------------------------------------------
// 9. SINGLETON INSTANCES — shared across agent modules
// ---------------------------------------------------------------------------

export const auditLog = new AuditLog({
  logFile: `${process.env.HOME ?? "/tmp"}/.agdi/audit.jsonl`,
  maxEntries: 50_000,
});

export const sandbox = new FileSandbox();
export const sessions = new SessionManager();
export const rateLimiter = new RateLimiter();
