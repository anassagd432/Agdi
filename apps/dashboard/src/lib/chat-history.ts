// ── Chat History (localStorage) ──────────────────────────────────────
// Browser-compatible chat persistence using localStorage.
// Each agent's messages are stored under key `agdi-chat-{agentId}`.

export interface ChatMessage {
  id: string; role: "user" | "assistant" | "system" | "tool";
  content: string; timestamp: number; toolName?: string;
}

const KEY_PREFIX = "agdi-chat-";
const MAX_MESSAGES = 200;

function storageKey(agentId: string) {
  return `${KEY_PREFIX}${agentId.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
}

export async function appendChatMessage(agentId: string, msg: ChatMessage) {
  if (typeof window === "undefined") return;
  const key = storageKey(agentId);
  try {
    const existing = JSON.parse(localStorage.getItem(key) || "[]") as ChatMessage[];
    existing.push(msg);
    // Keep only the last MAX_MESSAGES to avoid storage bloat
    const trimmed = existing.slice(-MAX_MESSAGES);
    localStorage.setItem(key, JSON.stringify(trimmed));
  } catch {
    // Storage full or unavailable — silently fail
  }
}

export async function loadChatHistory(agentId: string): Promise<ChatMessage[]> {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(storageKey(agentId)) || "[]");
  } catch {
    return [];
  }
}

export async function clearChatHistory(agentId: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(storageKey(agentId));
  } catch { /* ok */ }
}
