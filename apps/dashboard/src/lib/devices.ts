// ── Device Management Store ──────────────────────────────────────────────
// JSON-backed device registry at ~/.agdi/dashboard/devices.json
// Tracks registered devices across Windows, macOS, Linux, iOS, Android

import { promises as fs } from "fs";
import path from "path";
import os from "os";
import crypto from "crypto";

const DATA_DIR = path.join(os.homedir(), ".agdi", "dashboard");
const DEVICES_FILE = path.join(DATA_DIR, "devices.json");

export type Platform = "windows" | "macos" | "linux" | "ios" | "android";

export interface DeviceInfo {
  id: string;
  name: string;
  platform: Platform;
  hostname: string;
  ip: string;
  agentVersion: string;
  osVersion: string;
  status: "online" | "offline" | "busy";
  lastSeen: number;
  registeredAt: number;
  metrics: DeviceMetrics;
  capabilities: string[];
  tags: string[];
}

export interface DeviceMetrics {
  cpuUsage: number;       // 0-100
  memoryUsed: number;     // bytes
  memoryTotal: number;    // bytes
  diskUsed: number;       // bytes
  diskTotal: number;      // bytes
  batteryLevel: number;   // 0-100, -1 if no battery
  batteryCharging: boolean;
  uptime: number;         // seconds
  networkLatency: number; // ms to gateway
}

export interface DeviceCommand {
  id: string;
  deviceId: string;
  type: "shell" | "restart_agent" | "update_agent" | "sync_files" | "screenshot" | "lock" | "shutdown" | "reboot" | "notification";
  payload: Record<string, unknown>;
  status: "pending" | "running" | "completed" | "failed";
  result?: string;
  createdAt: number;
  completedAt?: number;
}

async function ensureDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

async function loadDevices(): Promise<DeviceInfo[]> {
  try {
    const raw = await fs.readFile(DEVICES_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function saveDevices(devices: DeviceInfo[]): Promise<void> {
  await ensureDir();
  await fs.writeFile(DEVICES_FILE, JSON.stringify(devices, null, 2), "utf-8");
}

// ── Commands history ────────────────────────────────────────────────────
const COMMANDS_FILE = path.join(DATA_DIR, "device-commands.jsonl");

async function appendCommand(cmd: DeviceCommand): Promise<void> {
  await ensureDir();
  await fs.appendFile(COMMANDS_FILE, JSON.stringify(cmd) + "\n", "utf-8");
}

async function loadCommands(deviceId?: string): Promise<DeviceCommand[]> {
  try {
    const raw = await fs.readFile(COMMANDS_FILE, "utf-8");
    const all = raw.trim().split("\n").filter(Boolean).map((l) => {
      try { return JSON.parse(l) as DeviceCommand; } catch { return null; }
    }).filter(Boolean) as DeviceCommand[];
    if (deviceId) return all.filter((c) => c.deviceId === deviceId).slice(-100);
    return all.slice(-200);
  } catch {
    return [];
  }
}

// ── Public API ──────────────────────────────────────────────────────────

export async function getDevices(): Promise<DeviceInfo[]> {
  return loadDevices();
}

export async function getDevice(id: string): Promise<DeviceInfo | null> {
  const devices = await loadDevices();
  return devices.find((d) => d.id === id) || null;
}

export async function registerDevice(info: Omit<DeviceInfo, "id" | "registeredAt" | "status" | "lastSeen">): Promise<DeviceInfo> {
  const devices = await loadDevices();
  const device: DeviceInfo = {
    ...info,
    id: crypto.randomUUID(),
    status: "online",
    lastSeen: Date.now(),
    registeredAt: Date.now(),
  };
  devices.push(device);
  await saveDevices(devices);
  return device;
}

export async function updateDeviceMetrics(
  id: string,
  metrics: DeviceMetrics,
  status?: DeviceInfo["status"],
): Promise<boolean> {
  const devices = await loadDevices();
  const device = devices.find((d) => d.id === id);
  if (!device) return false;
  device.metrics = metrics;
  device.lastSeen = Date.now();
  if (status) device.status = status;
  await saveDevices(devices);
  return true;
}

export async function updateDeviceStatus(id: string, status: DeviceInfo["status"]): Promise<boolean> {
  const devices = await loadDevices();
  const device = devices.find((d) => d.id === id);
  if (!device) return false;
  device.status = status;
  device.lastSeen = Date.now();
  await saveDevices(devices);
  return true;
}

export async function removeDevice(id: string): Promise<boolean> {
  const devices = await loadDevices();
  const filtered = devices.filter((d) => d.id !== id);
  if (filtered.length === devices.length) return false;
  await saveDevices(filtered);
  return true;
}

export async function sendDeviceCommand(
  deviceId: string,
  type: DeviceCommand["type"],
  payload: Record<string, unknown> = {},
): Promise<DeviceCommand> {
  const cmd: DeviceCommand = {
    id: crypto.randomUUID(),
    deviceId,
    type,
    payload,
    status: "pending",
    createdAt: Date.now(),
  };
  await appendCommand(cmd);
  return cmd;
}

export async function getDeviceCommands(deviceId?: string): Promise<DeviceCommand[]> {
  return loadCommands(deviceId);
}

// ── Platform helpers ────────────────────────────────────────────────────

export function detectPlatform(userAgent: string): Platform {
  const ua = userAgent.toLowerCase();
  if (ua.includes("iphone") || ua.includes("ipad") || ua.includes("ipod")) return "ios";
  if (ua.includes("android")) return "android";
  if (ua.includes("macintosh") || ua.includes("mac os")) return "macos";
  if (ua.includes("linux")) return "linux";
  return "windows";
}

export function platformLabel(p: Platform): string {
  const labels: Record<Platform, string> = {
    windows: "Windows",
    macos: "macOS",
    linux: "Linux",
    ios: "iOS",
    android: "Android",
  };
  return labels[p];
}

export function platformEmoji(p: Platform): string {
  const emojis: Record<Platform, string> = {
    windows: "🪟",
    macos: "🍎",
    linux: "🐧",
    ios: "📱",
    android: "🤖",
  };
  return emojis[p];
}
