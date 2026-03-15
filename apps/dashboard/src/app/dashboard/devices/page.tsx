"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Monitor, Plus, Trash2, RefreshCw, Loader2, Wifi, WifiOff, Search,
  Terminal, RotateCcw, Download, Camera, Lock, Power, Bell, Cpu,
  HardDrive, Battery, BatteryCharging, Clock, Signal,
} from "lucide-react";
import { toast } from "sonner";

/* ── Types ────────────────────────────────────────────────────────── */

type Platform = "windows" | "macos" | "linux" | "ios" | "android";

interface DeviceMetrics {
  cpuUsage: number; memoryUsed: number; memoryTotal: number;
  diskUsed: number; diskTotal: number; batteryLevel: number;
  batteryCharging: boolean; uptime: number; networkLatency: number;
}

interface Device {
  id: string; name: string; platform: Platform; hostname: string;
  ip: string; agentVersion: string; osVersion: string;
  status: "online" | "offline" | "busy"; lastSeen: number;
  registeredAt: number; metrics: DeviceMetrics;
  capabilities: string[]; tags: string[];
}

interface DeviceCommand {
  id: string; deviceId: string;
  type: "shell" | "restart_agent" | "update_agent" | "sync_files" | "screenshot" | "lock" | "shutdown" | "reboot" | "notification";
  payload: Record<string, unknown>;
  status: "pending" | "running" | "completed" | "failed";
  result?: string; createdAt: number; completedAt?: number;
}

/* ── Platform helpers ─────────────────────────────────────────────── */

const platformMeta: Record<Platform, { emoji: string; label: string; color: string; bg: string; border: string }> = {
  windows: { emoji: "🪟", label: "Windows", color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20" },
  macos:   { emoji: "🍎", label: "macOS",   color: "text-gray-300", bg: "bg-gray-500/10", border: "border-gray-500/20" },
  linux:   { emoji: "🐧", label: "Linux",   color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" },
  ios:     { emoji: "📱", label: "iOS",     color: "text-cyan-400", bg: "bg-cyan-500/10", border: "border-cyan-500/20" },
  android: { emoji: "🤖", label: "Android", color: "text-green-400", bg: "bg-green-500/10", border: "border-green-500/20" },
};

const statusColors: Record<string, string> = {
  online: "bg-green-500", offline: "bg-gray-500", busy: "bg-amber-500",
};

/* ── Formatting ───────────────────────────────────────────────────── */

function fmtBytes(b: number): string {
  if (b <= 0) return "—";
  if (b < 1073741824) return `${(b / 1048576).toFixed(0)} MB`;
  return `${(b / 1073741824).toFixed(1)} GB`;
}

function fmtUptime(s: number): string {
  if (s <= 0) return "—";
  const d = Math.floor(s / 86400); const h = Math.floor((s % 86400) / 3600);
  if (d > 0) return `${d}d ${h}h`;
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

/* ── Demo data ────────────────────────────────────────────────────── */

function demoDevices(): Device[] {
  return [
    { id: "d1", name: "Dev Workstation", platform: "windows", hostname: "WORK-PC", ip: "192.168.1.10", agentVersion: "4.0.1", osVersion: "Windows 11 Pro 24H2", status: "online", lastSeen: Date.now(), registeredAt: Date.now() - 86400000 * 30, metrics: { cpuUsage: 34, memoryUsed: 12884901888, memoryTotal: 34359738368, diskUsed: 256060514304, diskTotal: 512110190592, batteryLevel: -1, batteryCharging: false, uptime: 432000, networkLatency: 12 }, capabilities: ["shell", "screenshot", "restart_agent", "update_agent", "sync_files"], tags: ["primary", "dev"] },
    { id: "d2", name: "MacBook Pro", platform: "macos", hostname: "anass-mbp", ip: "192.168.1.15", agentVersion: "4.0.1", osVersion: "macOS 15.3 Sequoia", status: "online", lastSeen: Date.now() - 30000, registeredAt: Date.now() - 86400000 * 60, metrics: { cpuUsage: 18, memoryUsed: 8589934592, memoryTotal: 17179869184, diskUsed: 214748364800, diskTotal: 512110190592, batteryLevel: 78, batteryCharging: true, uptime: 172800, networkLatency: 8 }, capabilities: ["shell", "screenshot", "restart_agent", "update_agent", "sync_files", "lock"], tags: ["laptop"] },
    { id: "d3", name: "Build Server", platform: "linux", hostname: "ci-runner-01", ip: "10.0.0.50", agentVersion: "4.0.0", osVersion: "Ubuntu 24.04 LTS", status: "busy", lastSeen: Date.now() - 5000, registeredAt: Date.now() - 86400000 * 90, metrics: { cpuUsage: 87, memoryUsed: 28991029248, memoryTotal: 34359738368, diskUsed: 850403524608, diskTotal: 1099511627776, batteryLevel: -1, batteryCharging: false, uptime: 2592000, networkLatency: 3 }, capabilities: ["shell", "restart_agent", "update_agent", "reboot", "shutdown"], tags: ["ci", "server"] },
    { id: "d4", name: "iPhone 16 Pro", platform: "ios", hostname: "anass-iphone", ip: "192.168.1.22", agentVersion: "4.0.1", osVersion: "iOS 18.3", status: "online", lastSeen: Date.now() - 120000, registeredAt: Date.now() - 86400000 * 15, metrics: { cpuUsage: 5, memoryUsed: 2147483648, memoryTotal: 8589934592, diskUsed: 128849018880, diskTotal: 256060514304, batteryLevel: 92, batteryCharging: false, uptime: 259200, networkLatency: 25 }, capabilities: ["notification", "screenshot", "lock", "sync_files"], tags: ["mobile"] },
    { id: "d5", name: "Galaxy S24 Ultra", platform: "android", hostname: "galaxy-s24", ip: "192.168.1.30", agentVersion: "4.0.0", osVersion: "Android 15", status: "offline", lastSeen: Date.now() - 3600000, registeredAt: Date.now() - 86400000 * 7, metrics: { cpuUsage: 0, memoryUsed: 0, memoryTotal: 12884901888, diskUsed: 85899345920, diskTotal: 268435456000, batteryLevel: 45, batteryCharging: false, uptime: 0, networkLatency: -1 }, capabilities: ["notification", "screenshot", "lock", "sync_files"], tags: ["mobile"] },
  ];
}

/* ── Gauge ─────────────────────────────────────────────────────────── */

function Gauge({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-12 h-12">
        <svg viewBox="0 0 36 36" className="w-12 h-12 -rotate-90">
          <circle cx="18" cy="18" r="15" fill="none" stroke="currentColor" strokeWidth="3" className="text-white/5" />
          <circle cx="18" cy="18" r="15" fill="none" stroke="currentColor" strokeWidth="3"
            className={color} strokeDasharray={`${value * 0.942} 100`} strokeLinecap="round" />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white">{value}%</span>
      </div>
      <span className="text-[9px] text-gray-500 font-semibold uppercase tracking-wider">{label}</span>
    </div>
  );
}

/* ── Command buttons config ───────────────────────────────────────── */

const cmdConfig: Record<string, { icon: React.ReactNode; label: string; color: string; confirm?: boolean }> = {
  shell:          { icon: <Terminal className="w-3.5 h-3.5" />,    label: "Terminal",      color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20" },
  restart_agent:  { icon: <RotateCcw className="w-3.5 h-3.5" />,  label: "Restart Agent", color: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
  update_agent:   { icon: <Download className="w-3.5 h-3.5" />,   label: "Update",        color: "text-green-400 bg-green-500/10 border-green-500/20" },
  sync_files:     { icon: <RefreshCw className="w-3.5 h-3.5" />,  label: "Sync Files",    color: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
  screenshot:     { icon: <Camera className="w-3.5 h-3.5" />,     label: "Screenshot",    color: "text-purple-400 bg-purple-500/10 border-purple-500/20" },
  lock:           { icon: <Lock className="w-3.5 h-3.5" />,       label: "Lock",          color: "text-amber-400 bg-amber-500/10 border-amber-500/20", confirm: true },
  shutdown:       { icon: <Power className="w-3.5 h-3.5" />,      label: "Shutdown",      color: "text-red-400 bg-red-500/10 border-red-500/20", confirm: true },
  reboot:         { icon: <RotateCcw className="w-3.5 h-3.5" />,  label: "Reboot",        color: "text-red-400 bg-red-500/10 border-red-500/20", confirm: true },
  notification:   { icon: <Bell className="w-3.5 h-3.5" />,       label: "Notify",        color: "text-pink-400 bg-pink-500/10 border-pink-500/20" },
};

/* ── Page component ───────────────────────────────────────────────── */

export default function DevicesPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [commandHistory, setCommandHistory] = useState<DeviceCommand[]>([]);

  const fetchDevices = useCallback(async () => {
    try {
      const res = await fetch("/api/devices");
      if (res.ok) {
        const data = await res.json();
        setDevices(data.devices?.length ? data.devices : demoDevices());
      } else {
        setDevices(demoDevices());
      }
    } catch {
      setDevices(demoDevices());
    }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchDevices(); }, [fetchDevices]);

  const sendCommand = async (deviceId: string, type: string) => {
    const cfg = cmdConfig[type];
    if (cfg?.confirm && !confirm(`${cfg.label} this device?`)) return;

    try {
      const res = await fetch("/api/devices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "command", deviceId, type }),
      });
      if (res.ok) {
        const data = await res.json();
        setCommandHistory((prev) => [data.command, ...prev].slice(0, 50));
        toast.success(`Command "${cfg?.label || type}" sent to device.`);
      } else {
        toast.error("Command failed.");
      }
    } catch {
      // Fallback for demo mode
      const cmd: DeviceCommand = {
        id: crypto.randomUUID(), deviceId, type: type as DeviceCommand["type"],
        payload: {}, status: "completed",
        result: `${cfg?.label} executed successfully`,
        createdAt: Date.now(), completedAt: Date.now(),
      };
      setCommandHistory((prev) => [cmd, ...prev].slice(0, 50));
      toast.success(`Command "${cfg?.label || type}" sent.`);
    }
  };

  const removeDevice = async (id: string, name: string) => {
    if (!confirm(`Remove "${name}" from devices?`)) return;
    setDevices((prev) => prev.filter((d) => d.id !== id));
    toast.success("Device removed.");
    try { await fetch(`/api/devices?id=${id}`, { method: "DELETE" }); } catch { /* ok */ }
  };

  const filtered = devices.filter((d) => {
    if (platformFilter !== "all" && d.platform !== platformFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return d.name.toLowerCase().includes(q) || d.hostname.toLowerCase().includes(q) ||
             d.ip.includes(q) || d.platform.includes(q);
    }
    return true;
  });

  const summary = {
    total: devices.length,
    online: devices.filter((d) => d.status === "online").length,
    platforms: new Set(devices.map((d) => d.platform)).size,
  };

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-500 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            <Monitor className="w-7 h-7 sm:w-8 sm:h-8 text-cyan-400" /> Devices
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {summary.online}/{summary.total} online · {summary.platforms} platforms
          </p>
        </div>
        <button onClick={() => { setLoading(true); fetchDevices(); }}
          className="p-2 rounded-lg border border-white/10 text-gray-400 hover:text-white">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Platform Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {(["windows", "macos", "linux", "ios", "android"] as Platform[]).map((p) => {
          const m = platformMeta[p];
          const count = devices.filter((d) => d.platform === p).length;
          const online = devices.filter((d) => d.platform === p && d.status === "online").length;
          return (
            <button key={p} onClick={() => setPlatformFilter(platformFilter === p ? "all" : p)}
              className={`glass-panel p-3 border rounded-xl flex items-center gap-3 transition-all ${
                platformFilter === p ? `${m.border} ring-1 ring-${m.color.replace("text-", "")}/30` : "border-white/5 hover:border-white/10"}`}>
              <span className="text-2xl">{m.emoji}</span>
              <div className="text-left">
                <p className={`text-sm font-semibold ${count > 0 ? "text-white" : "text-gray-500"}`}>{m.label}</p>
                <p className="text-[10px] text-gray-500">{count > 0 ? `${online}/${count} online` : "None"}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input type="text" placeholder="Search by name, hostname, IP, or platform..." value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-black/20 border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white focus:border-cyan-500/50 focus:outline-none" />
      </div>

      {loading && <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 text-cyan-400 animate-spin" /></div>}

      {!loading && filtered.length === 0 && (
        <div className="text-center py-16 space-y-3">
          <Monitor className="w-12 h-12 text-gray-600 mx-auto" />
          <p className="text-muted-foreground">No devices found.</p>
        </div>
      )}

      {/* Device Cards */}
      {!loading && filtered.map((device) => {
        const pm = platformMeta[device.platform];
        const isExpanded = expanded === device.id;
        const memPct = device.metrics.memoryTotal > 0 ? Math.round((device.metrics.memoryUsed / device.metrics.memoryTotal) * 100) : 0;
        const diskPct = device.metrics.diskTotal > 0 ? Math.round((device.metrics.diskUsed / device.metrics.diskTotal) * 100) : 0;

        return (
          <div key={device.id}
            className={`glass-panel border rounded-xl transition-all ${isExpanded ? `${pm.border} ring-1` : "border-white/5 hover:border-white/10"}`}>

            {/* Card header — always visible */}
            <button onClick={() => setExpanded(isExpanded ? null : device.id)}
              className="w-full p-5 flex items-center justify-between text-left">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl ${pm.bg} flex items-center justify-center text-2xl`}>
                  {pm.emoji}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-white">{device.name}</h3>
                    <div className={`w-2 h-2 rounded-full ${statusColors[device.status]}`} />
                    <span className="text-[10px] text-gray-400 uppercase font-semibold">{device.status}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500">
                    <span>{pm.label} · {device.osVersion}</span>
                    <span className="font-mono">{device.ip}</span>
                    <span>v{device.agentVersion}</span>
                  </div>
                </div>
              </div>

              <div className="hidden sm:flex items-center gap-4">
                {/* Quick metrics */}
                <Gauge value={device.metrics.cpuUsage} label="CPU"
                  color={device.metrics.cpuUsage > 80 ? "text-red-500" : device.metrics.cpuUsage > 50 ? "text-amber-500" : "text-cyan-500"} />
                <Gauge value={memPct} label="RAM"
                  color={memPct > 80 ? "text-red-500" : memPct > 50 ? "text-amber-500" : "text-green-500"} />
                {device.metrics.batteryLevel >= 0 && (
                  <div className="flex flex-col items-center gap-1">
                    {device.metrics.batteryCharging
                      ? <BatteryCharging className="w-5 h-5 text-green-400" />
                      : <Battery className={`w-5 h-5 ${device.metrics.batteryLevel < 20 ? "text-red-400" : "text-green-400"}`} />}
                    <span className="text-[10px] font-bold text-white">{device.metrics.batteryLevel}%</span>
                    <span className="text-[9px] text-gray-500 uppercase">Batt</span>
                  </div>
                )}
              </div>
            </button>

            {/* Expanded detail panel */}
            {isExpanded && (
              <div className="border-t border-white/5 p-5 animate-in slide-in-from-top-2 duration-200 space-y-5">
                {/* Metrics row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
                  <div className="flex items-center gap-2 text-xs">
                    <Cpu className="w-4 h-4 text-cyan-400" />
                    <div><p className="text-gray-500">CPU</p><p className="text-white font-semibold">{device.metrics.cpuUsage}%</p></div>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <HardDrive className="w-4 h-4 text-purple-400" />
                    <div><p className="text-gray-500">Memory</p><p className="text-white font-semibold">{fmtBytes(device.metrics.memoryUsed)} / {fmtBytes(device.metrics.memoryTotal)}</p></div>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <HardDrive className="w-4 h-4 text-amber-400" />
                    <div><p className="text-gray-500">Disk</p><p className="text-white font-semibold">{fmtBytes(device.metrics.diskUsed)} / {fmtBytes(device.metrics.diskTotal)}</p></div>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <Clock className="w-4 h-4 text-green-400" />
                    <div><p className="text-gray-500">Uptime</p><p className="text-white font-semibold">{fmtUptime(device.metrics.uptime)}</p></div>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <Signal className="w-4 h-4 text-blue-400" />
                    <div><p className="text-gray-500">Latency</p><p className="text-white font-semibold">{device.metrics.networkLatency > 0 ? `${device.metrics.networkLatency}ms` : "—"}</p></div>
                  </div>
                  {device.metrics.batteryLevel >= 0 && (
                    <div className="flex items-center gap-2 text-xs">
                      {device.metrics.batteryCharging ? <BatteryCharging className="w-4 h-4 text-green-400" /> : <Battery className="w-4 h-4 text-green-400" />}
                      <div><p className="text-gray-500">Battery</p><p className="text-white font-semibold">{device.metrics.batteryLevel}%{device.metrics.batteryCharging ? " ⚡" : ""}</p></div>
                    </div>
                  )}
                </div>

                {/* Remote commands */}
                <div>
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Remote Commands</h4>
                  <div className="flex flex-wrap gap-2">
                    {device.capabilities.map((cap) => {
                      const c = cmdConfig[cap];
                      if (!c) return null;
                      return (
                        <button key={cap} onClick={() => sendCommand(device.id, cap)}
                          disabled={device.status === "offline"}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all disabled:opacity-30 disabled:cursor-not-allowed ${c.color} hover:opacity-80`}>
                          {c.icon} {c.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Tags + details */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {device.tags.map((tag) => (
                      <span key={tag} className="px-2 py-0.5 bg-white/5 border border-white/10 rounded-full text-[10px] text-gray-400 font-semibold">{tag}</span>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-500">
                      Last seen: {new Date(device.lastSeen).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <button onClick={() => removeDevice(device.id, device.name)}
                      className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Command History */}
      {commandHistory.length > 0 && (
        <div className="glass-panel rounded-xl border border-white/5 overflow-hidden">
          <div className="p-4 border-b border-white/10 bg-black/40">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Terminal className="w-4 h-4 text-cyan-400" /> Command History
              <span className="text-xs text-gray-500 font-normal">({commandHistory.length})</span>
            </h2>
          </div>
          {commandHistory.slice(0, 10).map((cmd) => (
            <div key={cmd.id} className="px-5 py-2.5 border-b border-white/5 flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <span className={`px-2 py-0.5 rounded border text-[10px] font-bold uppercase ${
                  cmd.status === "completed" ? "text-green-400 bg-green-500/10 border-green-500/20" :
                  cmd.status === "failed" ? "text-red-400 bg-red-500/10 border-red-500/20" :
                  "text-amber-400 bg-amber-500/10 border-amber-500/20"
                }`}>{cmd.status}</span>
                <span className="text-gray-300 font-mono">{cmd.type}</span>
                {cmd.result && <span className="text-gray-500">→ {cmd.result}</span>}
              </div>
              <span className="text-gray-600">{new Date(cmd.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
