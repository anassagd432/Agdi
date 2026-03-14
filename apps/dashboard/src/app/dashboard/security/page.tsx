"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Shield, ShieldAlert, ShieldCheck, ShieldX, Clock, RefreshCw,
  LogIn, LogOut, AlertTriangle, Wifi, WifiOff, Ban, FileWarning, Download,
} from "lucide-react";
import { downloadCSV, exportFilename } from "@/lib/export";

interface SecurityEvent {
  id: string;
  ts: number;
  type: string;
  ip?: string;
  ua?: string;
  detail?: string;
}

const EVENT_CONFIG: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  login_success: { icon: <LogIn className="w-4 h-4" />, color: "text-emerald-400", label: "Login Success" },
  login_failed: { icon: <ShieldX className="w-4 h-4" />, color: "text-red-400", label: "Login Failed" },
  login_rate_limited: { icon: <Ban className="w-4 h-4" />, color: "text-amber-400", label: "Rate Limited" },
  login_locked_out: { icon: <ShieldAlert className="w-4 h-4" />, color: "text-red-500", label: "IP Locked Out" },
  session_refreshed: { icon: <ShieldCheck className="w-4 h-4" />, color: "text-blue-400", label: "Session Refreshed" },
  session_fingerprint_mismatch: { icon: <ShieldAlert className="w-4 h-4" />, color: "text-red-500", label: "Fingerprint Mismatch" },
  csrf_rejected: { icon: <ShieldX className="w-4 h-4" />, color: "text-red-500", label: "CSRF Rejected" },
  ws_connected: { icon: <Wifi className="w-4 h-4" />, color: "text-cyan-400", label: "WS Connected" },
  ws_disconnected: { icon: <WifiOff className="w-4 h-4" />, color: "text-gray-400", label: "WS Disconnected" },
  input_rejected: { icon: <FileWarning className="w-4 h-4" />, color: "text-amber-400", label: "Input Rejected" },
};

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function timeAgo(ts: number): string {
  const secs = Math.floor((Date.now() - ts) / 1000);
  if (secs < 60) return `${secs}s ago`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

function getSeverity(type: string): "critical" | "warning" | "info" {
  if (["login_locked_out", "session_fingerprint_mismatch", "csrf_rejected"].includes(type))
    return "critical";
  if (["login_failed", "login_rate_limited", "input_rejected"].includes(type))
    return "warning";
  return "info";
}

export default function SecurityPage() {
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "critical" | "warning" | "info">("all");

  const fetchEvents = useCallback(async () => {
    try {
      const res = await fetch("/api/security/events");
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events ?? []);
      }
    } catch (e) {
      console.warn("Failed to fetch security events:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
    const iv = setInterval(fetchEvents, 5000);
    return () => clearInterval(iv);
  }, [fetchEvents]);

  const filtered = filter === "all"
    ? events
    : events.filter((e) => getSeverity(e.type) === filter);

  const criticalCount = events.filter((e) => getSeverity(e.type) === "critical").length;
  const warningCount = events.filter((e) => getSeverity(e.type) === "warning").length;

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-500 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            <Shield className="w-7 h-7 sm:w-8 sm:h-8 text-cyan-400" /> Security Audit Log
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Real-time security events: logins, CSRF checks, rate limits, session activity.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setLoading(true); fetchEvents(); }}
            className="p-2 rounded-lg border border-white/10 text-gray-400 hover:text-white transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => downloadCSV(
              events.map((e) => ({
                timestamp: new Date(e.ts).toISOString(),
                type: e.type,
                ip: e.ip || "",
                detail: e.detail || "",
              })),
              exportFilename("security-log"),
              [
                { key: "timestamp", label: "Timestamp" },
                { key: "type", label: "Event Type" },
                { key: "ip", label: "IP Address" },
                { key: "detail", label: "Details" },
              ],
            )}
            disabled={events.length === 0}
            className="p-2 rounded-lg border border-white/10 text-gray-400 hover:text-white transition-colors disabled:opacity-30"
            title="Export CSV"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-panel p-4 flex items-center gap-4">
          <div className="p-2.5 bg-red-500/10 rounded-lg">
            <ShieldAlert className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <div className="text-2xl font-bold text-red-400">{criticalCount}</div>
            <div className="text-xs text-muted-foreground">Critical Events</div>
          </div>
        </div>
        <div className="glass-panel p-4 flex items-center gap-4">
          <div className="p-2.5 bg-amber-500/10 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <div className="text-2xl font-bold text-amber-400">{warningCount}</div>
            <div className="text-xs text-muted-foreground">Warnings</div>
          </div>
        </div>
        <div className="glass-panel p-4 flex items-center gap-4">
          <div className="p-2.5 bg-emerald-500/10 rounded-lg">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <div className="text-2xl font-bold text-emerald-400">{events.length}</div>
            <div className="text-xs text-muted-foreground">Total Events</div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap gap-2">
        {(["all", "critical", "warning", "info"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
              filter === f
                ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/30"
                : "bg-white/5 text-gray-400 border-white/10 hover:bg-white/10 hover:text-white"
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
            {f !== "all" && (
              <span className="ml-1.5 opacity-60">
                ({f === "critical" ? criticalCount : f === "warning" ? warningCount : events.length - criticalCount - warningCount})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Event Table */}
      <div className="glass-panel rounded-xl border border-white/10 flex-1 overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <div className="grid grid-cols-[100px_160px_1fr] md:grid-cols-[120px_180px_120px_1fr_100px] gap-2 py-3 px-4 md:px-5 border-b border-white/10 bg-black/60 text-xs font-semibold text-gray-400 uppercase tracking-widest min-w-0">
            <div>Time</div>
            <div>Event</div>
            <div className="hidden md:block">IP</div>
            <div>Detail</div>
            <div className="hidden md:block text-right">Ago</div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-500 gap-3">
              <Shield className="w-10 h-10 opacity-20" />
              <p className="text-sm">No security events recorded yet.</p>
              <p className="text-xs text-gray-600">Events appear here when login attempts, CSRF checks, and session activity occur.</p>
            </div>
          ) : (
            filtered.map((event) => {
              const config = EVENT_CONFIG[event.type] || {
                icon: <Shield className="w-4 h-4" />,
                color: "text-gray-400",
                label: event.type,
              };
              const severity = getSeverity(event.type);

              return (
                <div
                  key={event.id}
                  className={`grid grid-cols-[100px_160px_1fr] md:grid-cols-[120px_180px_120px_1fr_100px] gap-2 py-3 px-4 md:px-5 border-b border-white/5 text-sm hover:bg-white/[0.02] transition-colors ${
                    severity === "critical" ? "bg-red-500/[0.03]" : ""
                  }`}
                >
                  <div className="text-gray-500 font-mono text-xs flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatTime(event.ts)}
                  </div>
                  <div className={`flex items-center gap-2 ${config.color} font-medium text-xs`}>
                    {config.icon}
                    {config.label}
                  </div>
                  <div className="hidden md:block text-gray-400 font-mono text-xs truncate">
                    {event.ip || "—"}
                  </div>
                  <div className="text-gray-300 text-xs truncate">
                    {event.detail || event.ua || "—"}
                  </div>
                  <div className="hidden md:block text-gray-500 text-xs text-right">
                    {timeAgo(event.ts)}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
