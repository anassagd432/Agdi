"use client";

import React, { useState, useEffect, useRef } from "react";
import { TerminalSquare, Trash2, Download, Pause, Play, Search } from "lucide-react";

interface LogEntry {
  id: number;
  ts: number;
  level: "info" | "warn" | "error" | "debug";
  source: string;
  message: string;
}

const levelColors: Record<string, string> = {
  info: "text-cyan-400", warn: "text-amber-400", error: "text-red-400", debug: "text-gray-500",
};
const levelBg: Record<string, string> = {
  info: "bg-cyan-500/10", warn: "bg-amber-500/10", error: "bg-red-500/10", debug: "bg-white/5",
};

export default function ConsolePage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filter, setFilter] = useState("");
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [paused, setPaused] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Simulate log stream — in production, connect to gateway WS
    const sources = ["gateway", "agent-1", "agent-2", "router", "auth", "ws"];
    const messages = [
      "Request processed in 42ms", "WebSocket connection established",
      "Agent spawned successfully", "Token refresh completed",
      "Message routed to agent-1", "Rate limit check passed",
      "Channel message received", "Tool execution completed",
      "Session validated", "Health check OK",
      "Memory usage: 128MB", "Active connections: 5",
    ];
    let id = 0;
    const interval = setInterval(() => {
      if (paused) return;
      const levels: LogEntry["level"][] = ["info", "info", "info", "info", "warn", "debug", "error"];
      const entry: LogEntry = {
        id: id++, ts: Date.now(),
        level: levels[Math.floor(Math.random() * levels.length)],
        source: sources[Math.floor(Math.random() * sources.length)],
        message: messages[Math.floor(Math.random() * messages.length)],
      };
      setLogs((prev) => [...prev.slice(-500), entry]);
    }, 800);
    return () => clearInterval(interval);
  }, [paused]);

  useEffect(() => {
    if (!paused) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs, paused]);

  const filtered = logs.filter((l) => {
    if (levelFilter !== "all" && l.level !== levelFilter) return false;
    if (filter && !l.message.toLowerCase().includes(filter.toLowerCase()) && !l.source.toLowerCase().includes(filter.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-500 space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            <TerminalSquare className="w-7 h-7 sm:w-8 sm:h-8 text-cyan-400" /> Console
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">{logs.length} entries · {paused ? "Paused" : "Live"}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setPaused(!paused)}
            className={`p-2 rounded-lg border text-sm ${paused ? "border-green-500/20 text-green-400" : "border-amber-500/20 text-amber-400"}`}>
            {paused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
          </button>
          <button onClick={() => setLogs([])} className="p-2 rounded-lg border border-white/10 text-gray-400 hover:text-red-400">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input type="text" placeholder="Filter logs..." value={filter} onChange={(e) => setFilter(e.target.value)}
            className="w-full bg-black/20 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-white text-sm focus:border-cyan-500/50 focus:outline-none" />
        </div>
        <select value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)}
          className="bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-cyan-500/50 focus:outline-none">
          <option value="all">All Levels</option>
          <option value="info">Info</option>
          <option value="warn">Warning</option>
          <option value="error">Error</option>
          <option value="debug">Debug</option>
        </select>
      </div>

      <div className="flex-1 bg-[#0a0e17] border border-white/5 rounded-xl overflow-hidden font-mono text-xs">
        <div className="h-full overflow-y-auto p-1">
          {filtered.map((log) => (
            <div key={log.id} className={`flex gap-3 px-3 py-1 hover:bg-white/[0.02] ${levelBg[log.level]}/0`}>
              <span className="text-gray-600 shrink-0 w-20">{new Date(log.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
              <span className={`shrink-0 w-12 uppercase font-bold ${levelColors[log.level]}`}>{log.level}</span>
              <span className="text-purple-400 shrink-0 w-20 truncate">[{log.source}]</span>
              <span className="text-gray-300 break-all">{log.message}</span>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      </div>
    </div>
  );
}
