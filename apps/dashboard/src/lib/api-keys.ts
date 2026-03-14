// ── API Keys Store ────────────────────────────────────────────────────────
import { promises as fs } from "fs";
import path from "path";
import os from "os";
import crypto from "crypto";

const DATA_DIR = path.join(os.homedir(), ".agdi", "dashboard");
const KEYS_FILE = path.join(DATA_DIR, "api-keys.json");

export interface ApiKey {
  id: string; name: string; prefix: string; hash: string;
  createdAt: number; lastUsed?: number; createdBy: string;
}

async function ensureDir() { await fs.mkdir(DATA_DIR, { recursive: true }); }
async function loadKeys(): Promise<ApiKey[]> {
  try { return JSON.parse(await fs.readFile(KEYS_FILE, "utf-8")); } catch { return []; }
}
async function saveKeys(keys: ApiKey[]) {
  await ensureDir();
  await fs.writeFile(KEYS_FILE, JSON.stringify(keys, null, 2), "utf-8");
}
function hashKey(key: string) { return crypto.createHash("sha256").update(key).digest("hex"); }

export async function createApiKey(name: string, createdBy: string) {
  const rawKey = `agdi_${crypto.randomBytes(24).toString("base64url")}`;
  const record: ApiKey = {
    id: crypto.randomUUID(), name, prefix: rawKey.slice(0, 12),
    hash: hashKey(rawKey), createdAt: Date.now(), createdBy,
  };
  const keys = await loadKeys();
  keys.push(record);
  await saveKeys(keys);
  return { key: rawKey, record };
}
export async function listApiKeys() { return loadKeys(); }
export async function revokeApiKey(id: string) {
  const keys = await loadKeys();
  const f = keys.filter((k) => k.id !== id);
  if (f.length === keys.length) return false;
  await saveKeys(f); return true;
}
export async function validateApiKey(rawKey: string) {
  const hash = hashKey(rawKey);
  const keys = await loadKeys();
  const found = keys.find((k) => k.hash === hash);
  if (!found) return null;
  found.lastUsed = Date.now();
  await saveKeys(keys);
  return found;
}
