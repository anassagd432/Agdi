import { normalizeCommandBody, type CommandNormalizeOptions } from "../commands-registry.js";

const ABORT_TRIGGERS = new Set([
  "stop",
  "esc",
  "abort",
  "wait",
  "exit",
  "interrupt",
  "detente",
  "deten",
  "detÃ©n",
  "arrete",
  "arrÃªte",
  "åœæ­¢",
  "ã‚„ã‚ã¦",
  "æ­¢ã‚ã¦",
  "à¤°à¥à¤•à¥‹",
  "ØªÙˆÙ‚Ù",
  "ÑÑ‚Ð¾Ð¿",
  "Ð¾ÑÑ‚Ð°Ð½Ð¾Ð²Ð¸ÑÑŒ",
  "Ð¾ÑÑ‚Ð°Ð½Ð¾Ð²Ð¸",
  "Ð¾ÑÑ‚Ð°Ð½Ð¾Ð²Ð¸Ñ‚ÑŒ",
  "Ð¿Ñ€ÐµÐºÑ€Ð°Ñ‚Ð¸",
  "halt",
  "anhalten",
  "aufhÃ¶ren",
  "hoer auf",
  "stopp",
  "pare",
  "stop openclaw",
  "openclaw stop",
  "stop action",
  "stop current action",
  "stop run",
  "stop current run",
  "stop agent",
  "stop the agent",
  "stop don't do anything",
  "stop dont do anything",
  "stop do not do anything",
  "stop doing anything",
  "do not do that",
  "please stop",
  "stop please",
]);
const ABORT_MEMORY = new Map<string, boolean>();
const ABORT_MEMORY_MAX = 2000;
const TRAILING_ABORT_PUNCTUATION_RE = /[.!?â€¦,ï¼Œã€‚;ï¼›:ï¼š'"â€™â€)\]}]+$/u;

function normalizeAbortTriggerText(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[â€™`]/g, "'")
    .replace(/\s+/g, " ")
    .replace(TRAILING_ABORT_PUNCTUATION_RE, "")
    .trim();
}

export function isAbortTrigger(text?: string): boolean {
  if (!text) {
    return false;
  }
  const normalized = normalizeAbortTriggerText(text);
  return ABORT_TRIGGERS.has(normalized);
}

export function isAbortRequestText(text?: string, options?: CommandNormalizeOptions): boolean {
  if (!text) {
    return false;
  }
  const normalized = normalizeCommandBody(text, options).trim();
  if (!normalized) {
    return false;
  }
  const normalizedLower = normalized.toLowerCase();
  return (
    normalizedLower === "/stop" ||
    normalizeAbortTriggerText(normalizedLower) === "/stop" ||
    isAbortTrigger(normalizedLower)
  );
}

export function getAbortMemory(key: string): boolean | undefined {
  const normalized = key.trim();
  if (!normalized) {
    return undefined;
  }
  return ABORT_MEMORY.get(normalized);
}

function pruneAbortMemory(): void {
  if (ABORT_MEMORY.size <= ABORT_MEMORY_MAX) {
    return;
  }
  const excess = ABORT_MEMORY.size - ABORT_MEMORY_MAX;
  let removed = 0;
  for (const entryKey of ABORT_MEMORY.keys()) {
    ABORT_MEMORY.delete(entryKey);
    removed += 1;
    if (removed >= excess) {
      break;
    }
  }
}

export function setAbortMemory(key: string, value: boolean): void {
  const normalized = key.trim();
  if (!normalized) {
    return;
  }
  if (!value) {
    ABORT_MEMORY.delete(normalized);
    return;
  }
  if (ABORT_MEMORY.has(normalized)) {
    ABORT_MEMORY.delete(normalized);
  }
  ABORT_MEMORY.set(normalized, true);
  pruneAbortMemory();
}

export function getAbortMemorySizeForTest(): number {
  return ABORT_MEMORY.size;
}

export function resetAbortMemoryForTest(): void {
  ABORT_MEMORY.clear();
}
