// ── Security Event Logger ─────────────────────────────────────────────────
// Edge-compatible audit logger. Uses in-memory buffer for the edge runtime
// and JSONL file persistence when running in Node.js.

export type SecurityEventType =
  | "login_success"
  | "login_failed"
  | "login_rate_limited"
  | "login_locked_out"
  | "session_refreshed"
  | "session_fingerprint_mismatch"
  | "csrf_rejected"
  | "ws_connected"
  | "ws_disconnected"
  | "input_rejected";

export interface SecurityEvent {
  id: string;
  ts: number;
  type: SecurityEventType;
  ip?: string;
  ua?: string;
  detail?: string;
}

const MAX_MEMORY_EVENTS = 500;
const events: SecurityEvent[] = [];
let nextId = 1;
let diskInitialized = false;

function isNodeRuntime(): boolean {
  return (
    typeof process !== "undefined" &&
    process.versions != null &&
    process.versions.node != null
  );
}

async function persistToDisk(event: SecurityEvent): Promise<void> {
  if (!isNodeRuntime()) return;
  try {
    const fs = await import("fs");
    const path = await import("path");
    const os = await import("os");
    const dataDir = path.join(os.homedir(), ".agdi", "dashboard");
    const auditFile = path.join(dataDir, "audit.jsonl");
    await fs.promises.mkdir(dataDir, { recursive: true });
    await fs.promises.appendFile(auditFile, JSON.stringify(event) + "\n", "utf-8");
  } catch (err) {
    if (isNodeRuntime()) console.error("[security-log] Failed to persist:", err);
  }
}

async function loadFromDisk(): Promise<void> {
  if (!isNodeRuntime() || diskInitialized) return;
  diskInitialized = true;
  try {
    const fs = await import("fs");
    const path = await import("path");
    const os = await import("os");
    const auditFile = path.join(os.homedir(), ".agdi", "dashboard", "audit.jsonl");
    const raw = await fs.promises.readFile(auditFile, "utf-8");
    for (const line of raw.trim().split("\n").filter(Boolean)) {
      try {
        const event = JSON.parse(line) as SecurityEvent;
        events.push(event);
        const idNum = parseInt(event.id.replace("sec-", ""), 10);
        if (!isNaN(idNum) && idNum >= nextId) nextId = idNum + 1;
      } catch { /* skip */ }
    }
    if (events.length > MAX_MEMORY_EVENTS) events.splice(0, events.length - MAX_MEMORY_EVENTS);
  } catch { /* no file yet */ }
}

export function logSecurityEvent(
  type: SecurityEventType,
  opts?: { ip?: string; ua?: string; detail?: string },
) {
  const event: SecurityEvent = {
    id: `sec-${nextId++}`,
    ts: Date.now(),
    type,
    ip: opts?.ip,
    ua: opts?.ua ? opts.ua.slice(0, 120) : undefined,
    detail: opts?.detail?.slice(0, 256),
  };
  events.push(event);
  if (events.length > MAX_MEMORY_EVENTS) events.splice(0, events.length - MAX_MEMORY_EVENTS);
  persistToDisk(event);
  if (type === "login_locked_out" || type === "session_fingerprint_mismatch" || type === "csrf_rejected") {
    console.warn(`[security] ${type}`, opts);
  }
}

export async function getSecurityEvents(): Promise<SecurityEvent[]> {
  await loadFromDisk();
  return [...events].reverse();
}
