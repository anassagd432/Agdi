/**
 * JSON file-based user store for multi-user authentication.
 * Users are stored in ~/.agdi/dashboard/users.json
 *
 * On first run, an "admin" user is created with the AGDI_GATEWAY_TOKEN as password.
 */
import { promises as fs } from "fs";
import path from "path";
import os from "os";
import crypto from "crypto";

// ── Types ─────────────────────────────────────────────────────────────────

export type UserRole = "admin" | "viewer";

export interface User {
  id: string;
  username: string;
  passwordHash: string;
  salt: string;
  role: UserRole;
  createdAt: number;
  lastLogin?: number;
}

interface UserStore {
  version: 1;
  users: User[];
}

// ── Config ────────────────────────────────────────────────────────────────

const DATA_DIR = path.join(os.homedir(), ".agdi", "dashboard");
const USERS_FILE = path.join(DATA_DIR, "users.json");

// ── Hashing ───────────────────────────────────────────────────────────────

function hashPassword(password: string, salt: string): string {
  return crypto
    .pbkdf2Sync(password, salt, 100_000, 64, "sha512")
    .toString("hex");
}

function generateSalt(): string {
  return crypto.randomBytes(32).toString("hex");
}

function generateId(): string {
  return crypto.randomBytes(8).toString("hex");
}

/**
 * Verify a plaintext password against a stored hash using constant-time comparison.
 */
export function verifyPassword(
  input: string,
  storedHash: string,
  salt: string,
): boolean {
  const inputHash = hashPassword(input, salt);
  if (inputHash.length !== storedHash.length) return false;
  return crypto.timingSafeEqual(
    Buffer.from(inputHash, "hex"),
    Buffer.from(storedHash, "hex"),
  );
}

// ── Store I/O ─────────────────────────────────────────────────────────────

async function ensureDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

async function readStore(): Promise<UserStore> {
  try {
    const raw = await fs.readFile(USERS_FILE, "utf-8");
    return JSON.parse(raw) as UserStore;
  } catch {
    return { version: 1, users: [] };
  }
}

async function writeStore(store: UserStore): Promise<void> {
  await ensureDir();
  await fs.writeFile(USERS_FILE, JSON.stringify(store, null, 2), "utf-8");
}

// ── Bootstrap ─────────────────────────────────────────────────────────────

/**
 * Ensure at least one admin user exists.
 * On first run, creates "admin" with the gateway token as password.
 */
async function ensureDefaultAdmin(store: UserStore): Promise<UserStore> {
  if (store.users.length > 0) return store;

  const defaultPassword =
    process.env.DASHBOARD_SECRET ||
    process.env.AGDI_GATEWAY_TOKEN ||
    (process.env.NODE_ENV !== "production" ? "local-dev-token" : "");

  if (!defaultPassword) return store;

  const salt = generateSalt();
  const admin: User = {
    id: generateId(),
    username: "admin",
    passwordHash: hashPassword(defaultPassword, salt),
    salt,
    role: "admin",
    createdAt: Date.now(),
  };

  store.users.push(admin);
  await writeStore(store);
  return store;
}

// ── CRUD ──────────────────────────────────────────────────────────────────

/**
 * Find a user by username and verify password. Returns user if valid, null otherwise.
 */
export async function authenticateUser(
  username: string,
  password: string,
): Promise<User | null> {
  const store = await ensureDefaultAdmin(await readStore());

  const user = store.users.find(
    (u) => u.username.toLowerCase() === username.toLowerCase(),
  );
  if (!user) return null;

  if (!verifyPassword(password, user.passwordHash, user.salt)) return null;

  // Update lastLogin
  user.lastLogin = Date.now();
  await writeStore(store);

  return user;
}

/**
 * Get all users (without password hashes).
 */
export async function listUsers(): Promise<
  Omit<User, "passwordHash" | "salt">[]
> {
  const store = await ensureDefaultAdmin(await readStore());
  return store.users.map(({ passwordHash, salt, ...rest }) => rest);
}

/**
 * Create a new user. Returns the user or throws if username already exists.
 */
export async function createUser(
  username: string,
  password: string,
  role: UserRole,
): Promise<Omit<User, "passwordHash" | "salt">> {
  const store = await ensureDefaultAdmin(await readStore());

  if (
    store.users.some(
      (u) => u.username.toLowerCase() === username.toLowerCase(),
    )
  ) {
    throw new Error(`User "${username}" already exists.`);
  }

  if (password.length < 8) {
    throw new Error("Password must be at least 8 characters.");
  }

  const salt = generateSalt();
  const user: User = {
    id: generateId(),
    username,
    passwordHash: hashPassword(password, salt),
    salt,
    role,
    createdAt: Date.now(),
  };

  store.users.push(user);
  await writeStore(store);

  const { passwordHash: _, salt: __, ...safe } = user;
  return safe;
}

/**
 * Delete a user by ID. Throws if user is the last admin.
 */
export async function deleteUser(userId: string): Promise<void> {
  const store = await readStore();
  const user = store.users.find((u) => u.id === userId);
  if (!user) throw new Error("User not found.");

  const admins = store.users.filter((u) => u.role === "admin");
  if (user.role === "admin" && admins.length <= 1) {
    throw new Error("Cannot delete the last admin user.");
  }

  store.users = store.users.filter((u) => u.id !== userId);
  await writeStore(store);
}

/**
 * Update a user's role. Throws if downgrading the last admin.
 */
export async function updateUserRole(
  userId: string,
  newRole: UserRole,
): Promise<void> {
  const store = await readStore();
  const user = store.users.find((u) => u.id === userId);
  if (!user) throw new Error("User not found.");

  if (user.role === "admin" && newRole !== "admin") {
    const admins = store.users.filter((u) => u.role === "admin");
    if (admins.length <= 1) {
      throw new Error("Cannot remove admin role from the last admin.");
    }
  }

  user.role = newRole;
  await writeStore(store);
}
