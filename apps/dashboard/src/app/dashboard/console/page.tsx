"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  TerminalSquare, Download, Trash2, Filter, Pause, Play,
  Search, ArrowDown, Copy,
} from "lucide-react";
import { toast } from "sonner";

/* ── Types ────────────────────────────────────────────────────────── */

interface LogEntry {
  id: string; ts: number; level: "info" | "warn" | "error" | "debug";
  source: string; message: string;
}

const levelColors: Record<string, { badge: string; text: string }> = {
  info:  { badge: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20", text: "text-gray-300" },
  warn:  { badge: "bg-amber-500/10 text-amber-400 border-amber-500/20", text: "text-amber-200/80" },
  error: { badge: "bg-red-500/10 text-red-400 border-red-500/20", text: "text-red-200/80" },
  debug: { badge: "bg-gray-500/10 text-gray-400 border-gray-500/20", text: "text-gray-500" },
};

const sources = ["gateway", "agent", "channel", "auth", "runtime", "ws", "scheduler"];
const messages: Record<string, string[]> = {
  info: [
    "Gateway started on port 18789", "Agent 'coder' spawned successfully",
    "WebSocket connection established", "Config loaded from ~/.agdi/config.json",
    "Channel WhatsApp connected", "Health check passed — all services OK",
    "Session refreshed for user admin", "Workflow pipeline-deploy triggered",
    "Knowledge base indexed 24 files", "Metrics collected: CPU 34%, MEM 12.4GB",
  ],
  warn: [
    "Rate limit approaching for GPT-4o (85/100)", "High memory usage: 87% utilized",
    "WebSocket reconnection attempt #3", "Stale session detected for user admin",
    "Disk usage above 80% threshold", "LLM provider latency elevated: 2340ms",
  ],
  error: [
    "Failed to connect to LLM provider: timeout", "Agent 'writer' crashed: OOM",
    "Channel Telegram auth failed: invalid token", "CSRF validation error from 10.0.0.45",
    "Database connection pool exhausted", "File write failed: permission denied",
  ],
  debug: [
    "Request GET /api/agents 12ms", "Token count: 1,247 input, 892 output",
    "Cache hit ratio: 94.2%", "GC completed in 8ms, freed 12MB",
    "WebSocket ping latency: 8ms", "Route matched: /dashboard/console",
  ],
};

function generateLog(): LogEntry {
  const levels: LogEntry["level"][] = ["info", "info", "info", "warn", "error", "debug", "debug"];
  const level = levels[Math.floor(Math.random() * levels.length)];
  const msgs = messages[level];
  return {
    id: crypto.randomUUID(), ts: Date.now(), level,
    source: sources[Math.floor(Math.random() * sources.length)],
    message: msgs[Math.floor(Math.random() * msgs.length)],
  };
}

/* ── Page ─────────────────────────────────────────────────────────── */

export default function ConsolePage() {
  const [logs, setLogs] = useState<LogEntry[]>(() =>
    Array.from({ length: 30 }, () => ({ ...generateLog(), ts: Date.now() - Math.random() * 600000 }))
      .sort((a, b) => a.ts - b.ts),
  );
  const [paused, setPaused] = useState(false);
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [autoScroll, setAutoScroll] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (paused) return;
    const interval = setInterval(() => {
      setLogs((prev) => [...prev, generateLog()].slice(-200));
    }, 1500 + Math.random() * 2000);
    return () => clearInterval(interval);
  }, [paused]);

  useEffect(() => {
    if (autoScroll) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs, autoScroll]);

  const filtered = logs.filter((l) => {
    if (filter !== "all" && l.level !== filter) return false;
    if (search && !l.message.toLowerCase().includes(search.toLowerCase()) &&
        !l.source.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const exportLogs = () => {
    const content = filtered.map((l) =>
      `[${new Date(l.ts).toISOString()}] [${l.level.toUpperCase()}] [${l.source}] ${l.message}`,
    ).join("\n");
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `agdi-logs-${new Date().toISOString().slice(0, 10)}.log`;
    a.click(); URL.revokeObjectURL(url);
    toast.success(`Exported ${filtered.length} log entries.`);
  };

  const clearLogs = () => {
    setLogs([]);
    toast.success("Logs cleared.");
  };

  const copyLog = (log: LogEntry) => {
    navigator.clipboard.writeText(`[${new Date(log.ts).toISOString()}] [${log.level}] [${log.source}] ${log.message}`);
    toast.success("Copied!");
  };

  const counts = {
    all: logs.length,
    info: logs.filter((l) => l.level === "info").length,
    warn: logs.filter((l) => l.level === "warn").length,
    error: logs.filter((l) => l.level === "error").length,
    debug: logs.filter((l) => l.level === "debug").length,
  };

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            <TerminalSquare className="w-7 h-7 sm:w-8 sm:h-8 text-green-400" /> Console
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {paused ? "⏸ Paused" : "● Live"} · {filtered.length} entries
            {counts.error > 0 && <span className="text-red-400 ml-2">· {counts.error} errors</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setPaused(!paused)}
            className={`p-2 rounded-lg border ${paused ? "border-green-500/20 text-green-400" : "border-amber-500/20 text-amber-400"}`}>
            {paused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
          </button>
          <button onClick={exportLogs}
            className="p-2 rounded-lg border border-white/10 text-gray-400 hover:text-white" title="Export">
            <Download className="w-4 h-4" />
          </button>
          <button onClick={clearLogs}
            className="p-2 rounded-lg border border-white/10 text-gray-400 hover:text-red-400" title="Clear">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input type="text" placeholder="Filter logs..." value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-black/20 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:border-cyan-500/50 focus:outline-none" />
        </div>
        <div className="flex rounded-lg border border-white/10 overflow-hidden">
          {(["all", "info", "warn", "error", "debug"] as const).map((level) => (
            <button key={level} onClick={() => setFilter(level)}
              className={`px-3 py-2 text-xs font-semibold capitalize flex items-center gap-1.5 ${
                filter === level ? "bg-white/5 text-white" : "text-gray-500 hover:text-white"}`}>
              {level}
              <span className="text-[10px] text-gray-600">{counts[level]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Log viewer */}
      <div className="flex-1 glass-panel rounded-xl border border-white/5 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto font-mono text-xs">
          {filtered.map((log) => {
            const lc = levelColors[log.level];
            return (
              <div key={log.id}
                className={`flex items-start gap-2 px-3 py-1.5 border-b border-white/[0.02] hover:bg-white/[0.02] group ${
                  log.level === "error" ? "bg-red-500/[0.03]" : ""}`}>
                <span className="text-[10px] text-gray-600 shrink-0 mt-0.5 w-16">
                  {new Date(log.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                </span>
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border shrink-0 ${lc.badge}`}>
                  {log.level}
                </span>
                <span className="text-gray-500 shrink-0 w-16 truncate">{log.source}</span>
                <span className={`flex-1 ${lc.text}`}>{log.message}</span>
                <button onClick={() => copyLog(log)}
                  className="opacity-0 group-hover:opacity-100 p-0.5 text-gray-600 hover:text-white">
                  <Copy className="w-3 h-3" />
                </button>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* Status bar */}
        <div className="px-3 py-1.5 border-t border-white/10 bg-black/40 flex items-center justify-between text-[10px] text-gray-600">
          <div className="flex items-center gap-3">
            <span>Lines: {filtered.length}</span>
            <span className="text-cyan-400/60">{counts.info} info</span>
            <span className="text-amber-400/60">{counts.warn} warn</span>
            <span className="text-red-400/60">{counts.error} error</span>
          </div>
          <button onClick={() => { setAutoScroll(!autoScroll); }}
            className={`flex items-center gap-1 ${autoScroll ? "text-cyan-400" : "text-gray-600"}`}>
            <ArrowDown className="w-3 h-3" /> Auto-scroll {autoScroll ? "ON" : "OFF"}
          </button>
        </div>
      </div>
    </div>
  );
}
