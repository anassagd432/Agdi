"use client";

import React, { useState, useEffect } from "react";
import {
  ScrollText, Shield, User, Key, Settings, Globe, Bot, Monitor,
  ChevronDown, Search, Download, Filter,
} from "lucide-react";
import { toast } from "sonner";

interface AuditEntry {
  id: string; ts: number; actor: string;
  action: string; resource: string; detail: string;
  severity: "info" | "warn" | "critical";
  ip: string;
}

const actions = [
  { action: "login", resource: "auth", detail: "User logged in from Chrome/Windows", severity: "info" as const, icon: User },
  { action: "api_key_created", resource: "keys", detail: "Created API key 'ci-deploy' with read/write", severity: "info" as const, icon: Key },
  { action: "agent_spawned", resource: "agents", detail: "Spawned agent 'coder' with claude-opus-4.6", severity: "info" as const, icon: Bot },
  { action: "settings_changed", resource: "config", detail: "Changed gateway.mode from remote to local", severity: "warn" as const, icon: Settings },
  { action: "device_registered", resource: "devices", detail: "Registered 'Ubuntu-VM' (linux/x86_64)", severity: "info" as const, icon: Monitor },
  { action: "permission_changed", resource: "auth", detail: "Role changed for user 'viewer' → 'editor'", severity: "warn" as const, icon: Shield },
  { action: "failed_login", resource: "auth", detail: "Failed login attempt from 185.220.101.x", severity: "critical" as const, icon: Shield },
  { action: "webhook_triggered", resource: "webhooks", detail: "Webhook 'deploy-notify' fired (200 OK)", severity: "info" as const, icon: Globe },
  { action: "agent_stopped", resource: "agents", detail: "Agent 'researcher' terminated by user", severity: "warn" as const, icon: Bot },
  { action: "backup_created", resource: "system", detail: "Full backup created (12.4 MB)", severity: "info" as const, icon: ScrollText },
];

const actors = ["admin", "system", "api-key:ci", "user:viewer"];
const ips = ["192.168.1.10", "10.0.0.1", "172.16.0.5", "185.220.101.42", "127.0.0.1"];

function generateEntry(): AuditEntry {
  const tmpl = actions[Math.floor(Math.random() * actions.length)];
  return {
    id: crypto.randomUUID(), ts: Date.now(),
    actor: actors[Math.floor(Math.random() * actors.length)],
    action: tmpl.action, resource: tmpl.resource,
    detail: tmpl.detail, severity: tmpl.severity,
    ip: ips[Math.floor(Math.random() * ips.length)],
  };
}

const sevColors = {
  info: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
  warn: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  critical: "text-red-400 bg-red-500/10 border-red-500/20",
};

export default function AuditPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [mounted, setMounted] = useState(false);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    setMounted(true);
    setEntries(
      Array.from({ length: 20 }, (_, i) => ({
        ...generateEntry(),
        ts: Date.now() - i * 120000 - Math.random() * 60000,
      })).sort((a, b) => b.ts - a.ts),
    );
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const interval = setInterval(() => {
      setEntries((prev) => [generateEntry(), ...prev].slice(0, 100));
    }, 8000 + Math.random() * 5000);
    return () => clearInterval(interval);
  }, [mounted]);

  const filtered = entries
    .filter((e) => filter === "all" || e.severity === filter)
    .filter((e) => !search || e.detail.toLowerCase().includes(search.toLowerCase()) || e.action.includes(search.toLowerCase()));

  const exportLog = () => {
    const csv = "Timestamp,Actor,Action,Resource,Detail,Severity,IP\n" +
      entries.map((e) => `${new Date(e.ts).toISOString()},${e.actor},${e.action},${e.resource},"${e.detail}",${e.severity},${e.ip}`).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `audit-log-${new Date().toISOString().slice(0,10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast.success("Audit log exported as CSV.");
  };

  function timeAgo(ts: number): string {
    const s = Math.floor((Date.now() - ts) / 1000);
    if (s < 60) return "just now";
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return `${Math.floor(s / 86400)}d ago`;
  }

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-500 max-w-6xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            <ScrollText className="w-7 h-7 sm:w-8 sm:h-8 text-cyan-400" /> Audit Log
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">{entries.length} entries · Live</p>
        </div>
        <button onClick={exportLog}
          className="px-3 py-2 border border-white/10 rounded-lg text-sm text-gray-400 hover:text-white flex items-center gap-2">
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input type="text" placeholder="Search audit entries..." value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-black/20 border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white focus:border-cyan-500/50 focus:outline-none" />
        </div>
        <div className="flex rounded-lg border border-white/10 overflow-hidden">
          {["all", "info", "warn", "critical"].map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-2 text-xs font-semibold capitalize ${filter === f ? "bg-cyan-500/10 text-cyan-400" : "text-gray-500 hover:text-white"}`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 glass-panel rounded-xl border border-white/5 overflow-y-auto">
        {!mounted && <div className="p-8 text-center text-xs text-gray-600">Loading audit log...</div>}
        {filtered.map((e, i) => (
          <div key={e.id}
            className={`flex items-start gap-3 px-4 py-3 border-b border-white/5 hover:bg-white/[0.02] ${i === 0 && mounted ? "animate-in fade-in duration-300" : ""}`}>
            <span className={`mt-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border ${sevColors[e.severity]}`}>
              {e.severity}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 text-xs">
                <code className="text-white font-semibold">{e.action}</code>
                <span className="text-gray-600">by</span>
                <span className="text-cyan-400">{e.actor}</span>
              </div>
              <p className="text-[11px] text-gray-500 mt-0.5">{e.detail}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-[10px] text-gray-600">{timeAgo(e.ts)}</p>
              <p className="text-[9px] text-gray-700 font-mono">{e.ip}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
