"use client";

import React, { useState, useEffect } from "react";
import {
  Activity, Cpu, HardDrive, Wifi, WifiOff, Clock, Server,
  RefreshCw, CheckCircle2, XCircle, AlertTriangle, Gauge,
  Database, Globe, Shield, Zap,
} from "lucide-react";

/* ── Types ────────────────────────────────────────────────────────── */

interface HealthCheck {
  name: string;
  status: "healthy" | "degraded" | "down";
  latency: number;
  message: string;
  icon: React.ReactNode;
}

interface SystemMetric {
  label: string;
  value: number;
  max: number;
  unit: string;
  color: string;
  icon: React.ReactNode;
}

/* ── Progress bar ─────────────────────────────────────────────────── */

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all duration-700 ${color}`}
        style={{ width: `${pct}%` }} />
    </div>
  );
}

/* ── Uptime bar (last 30 days) ────────────────────────────────────── */

function UptimeBar() {
  // Use deterministic pseudo-random sequence to prevent SSR hydration mismatches
  const days = Array.from({ length: 30 }, (_, i) => {
    const r = Math.abs(Math.sin((i + 1) * 12.9898) * 43758.5453) % 1;
    return r > 0.95 ? "down" : r > 0.88 ? "degraded" : "healthy";
  });
  const uptimePct = ((days.filter((d) => d === "healthy").length / 30) * 100).toFixed(1);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400">30-day uptime</span>
        <span className="text-xs font-bold text-green-400">{uptimePct}%</span>
      </div>
      <div className="flex gap-[2px]">
        {days.map((d, i) => (
          <div key={i} title={`Day ${30 - i}: ${d}`}
            className={`flex-1 h-6 rounded-sm transition-all hover:opacity-80 ${
              d === "healthy" ? "bg-green-500/60" : d === "degraded" ? "bg-amber-500/60" : "bg-red-500/60"
            }`} />
        ))}
      </div>
      <div className="flex justify-between text-[10px] text-gray-600">
        <span>30 days ago</span><span>Today</span>
      </div>
    </div>
  );
}

/* ── Status config ────────────────────────────────────────────────── */

const statusConfig: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
  healthy:  { icon: <CheckCircle2 className="w-4 h-4" />, color: "text-green-400", bg: "bg-green-500/10 border-green-500/20" },
  degraded: { icon: <AlertTriangle className="w-4 h-4" />, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
  down:     { icon: <XCircle className="w-4 h-4" />, color: "text-red-400", bg: "bg-red-500/10 border-red-500/20" },
};

/* ── Page ─────────────────────────────────────────────────────────── */

export default function SystemHealthPage() {
  const [refreshing, setRefreshing] = useState(false);
  const [lastChecked, setLastChecked] = useState(Date.now());

  const healthChecks: HealthCheck[] = [
    { name: "Gateway API", status: "healthy", latency: 12, message: "All endpoints responding", icon: <Server className="w-4 h-4" /> },
    { name: "WebSocket", status: "healthy", latency: 8, message: "Real-time connection active", icon: <Wifi className="w-4 h-4" /> },
    { name: "Database", status: "healthy", latency: 5, message: "Read/write operations normal", icon: <Database className="w-4 h-4" /> },
    { name: "Agent Runtime", status: "healthy", latency: 45, message: "All agents responsive", icon: <Cpu className="w-4 h-4" /> },
    { name: "LLM Provider", status: "healthy", latency: 320, message: "API keys valid, rate limits OK", icon: <Zap className="w-4 h-4" /> },
    { name: "File Storage", status: "healthy", latency: 3, message: "Local storage accessible", icon: <HardDrive className="w-4 h-4" /> },
    { name: "Web Provider", status: "degraded", latency: 890, message: "High latency detected", icon: <Globe className="w-4 h-4" /> },
    { name: "Auth Service", status: "healthy", latency: 15, message: "JWT validation working", icon: <Shield className="w-4 h-4" /> },
  ];

  const systemMetrics: SystemMetric[] = [
    { label: "CPU Usage", value: 34, max: 100, unit: "%", color: "bg-cyan-500", icon: <Cpu className="w-4 h-4 text-cyan-400" /> },
    { label: "Memory", value: 12.4, max: 32, unit: "GB", color: "bg-purple-500", icon: <HardDrive className="w-4 h-4 text-purple-400" /> },
    { label: "Disk", value: 238, max: 512, unit: "GB", color: "bg-amber-500", icon: <HardDrive className="w-4 h-4 text-amber-400" /> },
    { label: "Network I/O", value: 45, max: 1000, unit: "Mbps", color: "bg-blue-500", icon: <Wifi className="w-4 h-4 text-blue-400" /> },
  ];

  const refresh = () => {
    setRefreshing(true);
    setTimeout(() => { setRefreshing(false); setLastChecked(Date.now()); }, 1500);
  };

  const overallStatus = healthChecks.some((h) => h.status === "down") ? "down"
    : healthChecks.some((h) => h.status === "degraded") ? "degraded" : "healthy";
  const os = statusConfig[overallStatus];

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-500 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            <Activity className="w-7 h-7 sm:w-8 sm:h-8 text-cyan-400" /> System Health
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Last checked {new Date(lastChecked).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${os.bg} ${os.color} text-xs font-bold uppercase`}>
            {os.icon} {overallStatus === "healthy" ? "All Systems Operational" : overallStatus === "degraded" ? "Partial Degradation" : "Major Outage"}
          </div>
          <button onClick={refresh} className="p-2 rounded-lg border border-white/10 text-gray-400 hover:text-white">
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Uptime */}
      <div className="glass-panel p-5 border border-white/5 rounded-xl">
        <UptimeBar />
      </div>

      {/* Health Checks Grid */}
      <div>
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Service Status</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 stagger-in">
          {healthChecks.map((check) => {
            const sc = statusConfig[check.status];
            return (
              <div key={check.name} className={`glass-panel p-4 border rounded-xl space-y-2 ${
                check.status !== "healthy" ? sc.bg.replace("/10", "/5") : "border-white/5"
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={sc.color}>{check.icon}</span>
                    <span className="text-sm font-semibold text-white">{check.name}</span>
                  </div>
                  <span className={sc.color}>{sc.icon}</span>
                </div>
                <p className="text-xs text-gray-500">{check.message}</p>
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-gray-600">Latency</span>
                  <span className={`font-mono font-semibold ${check.latency > 500 ? "text-amber-400" : "text-gray-400"}`}>
                    {check.latency}ms
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* System Resources */}
      <div>
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">System Resources</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {systemMetrics.map((m) => (
            <div key={m.label} className="glass-panel p-4 border border-white/5 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {m.icon}
                  <span className="text-sm font-semibold text-white">{m.label}</span>
                </div>
                <span className="text-sm font-bold text-white">
                  {m.value}{m.unit} <span className="text-gray-600 font-normal">/ {m.max}{m.unit}</span>
                </span>
              </div>
              <ProgressBar value={m.value} max={m.max} color={m.color} />
            </div>
          ))}
        </div>
      </div>

      {/* Server Info */}
      <div className="glass-panel rounded-xl border border-white/5 overflow-hidden">
        <div className="p-4 border-b border-white/10 bg-black/40">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Server className="w-4 h-4 text-cyan-400" /> Server Information
          </h2>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-white/5">
          {[
            { label: "Hostname", value: "agdi-gateway" },
            { label: "Node.js", value: "v22.12.0" },
            { label: "Agdi Version", value: "4.0.1" },
            { label: "Uptime", value: "5d 12h 34m" },
            { label: "Platform", value: "win32 x64" },
            { label: "Active Connections", value: "12" },
            { label: "Total Requests", value: "45,892" },
            { label: "Error Rate", value: "0.02%" },
          ].map((info) => (
            <div key={info.label} className="px-4 py-3 bg-[#0a0e17]">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider">{info.label}</p>
              <p className="text-sm text-white font-medium mt-0.5">{info.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
