/**
 * Chat history persistence — JSONL per agent at ~/.agdi/dashboard/chats/<agentId>.jsonl
 */

import { promises as fs } from "fs";
import path from "path";
import os from "os";

const CHATS_DIR = path.join(os.homedir(), ".agdi", "dashboard", "chats");

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  timestamp: number;
  toolName?: string;
}

async function ensureDir() {
  await fs.mkdir(CHATS_DIR, { recursive: true });
}

function agentFile(agentId: string): string {
  const safeId = agentId.replace(/[^a-zA-Z0-9_-]/g, "_");
  return path.join(CHATS_DIR, `${safeId}.jsonl`);
}

/**
 * Append a message to an agent's chat history.
 */
export async function appendChatMessage(
  agentId: string,
  message: ChatMessage,
): Promise<void> {
  await ensureDir();
  await fs.appendFile(
    agentFile(agentId),
    JSON.stringify(message) + "\n",
    "utf-8",
  );
}

/**
 * Load all messages for an agent.
 */
export async function loadChatHistory(
  agentId: string,
): Promise<ChatMessage[]> {
  try {
    const raw = await fs.readFile(agentFile(agentId), "utf-8");
    const messages: ChatMessage[] = [];
    for (const line of raw.trim().split("\n")) {
      if (!line) continue;
      try {
        messages.push(JSON.parse(line));
      } catch {
        // skip malformed
      }
    }
    return messages;
  } catch {
    return [];
  }
}

/**
 * Clear chat history for an agent.
 */
export async function clearChatHistory(agentId: string): Promise<void> {
  try {
    await fs.unlink(agentFile(agentId));
  } catch {
    // File didn't exist
  }
}

/**
 * List all agents with chat history.
 */
export async function listChatAgents(): Promise<string[]> {
  try {
    await ensureDir();
    const files = await fs.readdir(CHATS_DIR);
    return files
      .filter((f) => f.endsWith(".jsonl"))
      .map((f) => f.replace(".jsonl", ""));
  } catch {
    return [];
  }
}
