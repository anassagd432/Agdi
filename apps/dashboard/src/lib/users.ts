// ── User store ────────────────────────────────────────────────────────────
// JSON-backed user store at ~/.agdi/dashboard/users.json

import { promises as fs } from "fs";
import path from "path";
import os from "os";
import crypto from "crypto";

const DATA_DIR = path.join(os.homedir(), ".agdi", "dashboard");
const USERS_FILE = path.join(DATA_DIR, "users.json");

export interface User {
  id: string;
  username: string;
  passwordHash: string;
  salt: string;
  role: "admin" | "viewer";
  createdAt: number;
  lastLogin?: number;
}

async function ensureDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 100000, 64, "sha512").toString("hex");
}

async function loadUsers(): Promise<User[]> {
  try {
    const raw = await fs.readFile(USERS_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function saveUsers(users: User[]): Promise<void> {
  await ensureDir();
  await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2), "utf-8");
}

export async function getUsers(): Promise<User[]> {
  return loadUsers();
}

export async function createUser(
  username: string,
  password: string,
  role: "admin" | "viewer" = "viewer",
): Promise<User> {
  const users = await loadUsers();
  if (users.some((u) => u.username === username)) {
    throw new Error("Username already exists");
  }
  const salt = crypto.randomBytes(16).toString("hex");
  const user: User = {
    id: crypto.randomUUID(),
    username,
    passwordHash: hashPassword(password, salt),
    salt,
    role,
    createdAt: Date.now(),
  };
  users.push(user);
  await saveUsers(users);
  return user;
}

export async function verifyPassword(username: string, password: string): Promise<User | null> {
  const users = await loadUsers();
  const user = users.find((u) => u.username === username);
  if (!user) return null;
  const hash = hashPassword(password, user.salt);
  if (hash !== user.passwordHash) return null;
  user.lastLogin = Date.now();
  await saveUsers(users);
  return user;
}

export async function deleteUser(id: string): Promise<boolean> {
  const users = await loadUsers();
  const filtered = users.filter((u) => u.id !== id);
  if (filtered.length === users.length) return false;
  await saveUsers(filtered);
  return true;
}

export async function updateUserRole(id: string, role: "admin" | "viewer"): Promise<boolean> {
  const users = await loadUsers();
  const user = users.find((u) => u.id === id);
  if (!user) return false;
  user.role = role;
  await saveUsers(users);
  return true;
}
