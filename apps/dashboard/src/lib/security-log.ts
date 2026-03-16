// ── Security Event Logger ─────────────────────────────────────────────────
// Edge-compatible audit logger. Uses in-memory buffer for the edge runtime.

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
  
  if (type === "login_locked_out" || type === "session_fingerprint_mismatch" || type === "csrf_rejected") {
    console.warn(`[security] ${type}`, opts);
  }
}

export async function getSecurityEvents(): Promise<SecurityEvent[]> {
  return [...events].reverse();
}
