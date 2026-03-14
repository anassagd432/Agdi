// ── Chat History ──────────────────────────────────────────────────────────
import { promises as fs } from "fs";
import path from "path";
import os from "os";

const CHATS_DIR = path.join(os.homedir(), ".agdi", "dashboard", "chats");

export interface ChatMessage {
  id: string; role: "user" | "assistant" | "system" | "tool";
  content: string; timestamp: number; toolName?: string;
}

async function ensureDir() { await fs.mkdir(CHATS_DIR, { recursive: true }); }
function agentFile(agentId: string) {
  return path.join(CHATS_DIR, `${agentId.replace(/[^a-zA-Z0-9_-]/g, "_")}.jsonl`);
}

export async function appendChatMessage(agentId: string, msg: ChatMessage) {
  await ensureDir();
  await fs.appendFile(agentFile(agentId), JSON.stringify(msg) + "\n", "utf-8");
}
export async function loadChatHistory(agentId: string): Promise<ChatMessage[]> {
  try {
    const raw = await fs.readFile(agentFile(agentId), "utf-8");
    return raw.trim().split("\n").filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
  } catch { return []; }
}
export async function clearChatHistory(agentId: string) {
  try { await fs.unlink(agentFile(agentId)); } catch { /* ok */ }
}
