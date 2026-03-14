/**
 * API Key store — JSONL-backed at ~/.agdi/dashboard/api-keys.json
 * Supports create, list, revoke. Keys are SHA-256 hashed for storage.
 */

import { promises as fs } from "fs";
import path from "path";
import os from "os";
import crypto from "crypto";

const DATA_DIR = path.join(os.homedir(), ".agdi", "dashboard");
const KEYS_FILE = path.join(DATA_DIR, "api-keys.json");

export interface ApiKey {
  id: string;
  name: string;
  prefix: string; // first 8 chars of the key for display
  hash: string; // SHA-256 hash of the full key
  createdAt: number;
  lastUsed?: number;
  createdBy: string;
}

async function ensureDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

async function loadKeys(): Promise<ApiKey[]> {
  try {
    const raw = await fs.readFile(KEYS_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function saveKeys(keys: ApiKey[]): Promise<void> {
  await ensureDir();
  await fs.writeFile(KEYS_FILE, JSON.stringify(keys, null, 2), "utf-8");
}

function hashKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}

/**
 * Generate a new API key. Returns the full key (only shown once).
 */
export async function createApiKey(
  name: string,
  createdBy: string,
): Promise<{ key: string; record: ApiKey }> {
  const id = crypto.randomUUID();
  const rawKey = `agdi_${crypto.randomBytes(24).toString("base64url")}`;
  const prefix = rawKey.slice(0, 12);
  const hash = hashKey(rawKey);

  const record: ApiKey = {
    id,
    name,
    prefix,
    hash,
    createdAt: Date.now(),
    createdBy,
  };

  const keys = await loadKeys();
  keys.push(record);
  await saveKeys(keys);

  return { key: rawKey, record };
}

/**
 * List all API keys (without the raw key).
 */
export async function listApiKeys(): Promise<ApiKey[]> {
  return loadKeys();
}

/**
 * Revoke (delete) an API key by ID.
 */
export async function revokeApiKey(id: string): Promise<boolean> {
  const keys = await loadKeys();
  const filtered = keys.filter((k) => k.id !== id);
  if (filtered.length === keys.length) return false;
  await saveKeys(filtered);
  return true;
}

/**
 * Validate an API key. Returns the key record if valid, null if not.
 */
export async function validateApiKey(rawKey: string): Promise<ApiKey | null> {
  const hash = hashKey(rawKey);
  const keys = await loadKeys();
  const found = keys.find((k) => k.hash === hash);
  if (!found) return null;

  // Update last used
  found.lastUsed = Date.now();
  await saveKeys(keys);

  return found;
}
