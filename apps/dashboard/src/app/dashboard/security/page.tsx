"use client";

import React, { useState, useEffect } from "react";
import { Shield, Search, Download, RefreshCw, Loader2 } from "lucide-react";
import { downloadCSV, exportFilename } from "@/lib/export";

interface SecurityEvent {
  id: string; ts: number; type: string; ip?: string; ua?: string; detail?: string;
}

const typeColors: Record<string, string> = {
  login_success: "text-green-400", login_failed: "text-red-400",
  login_rate_limited: "text-amber-400", login_locked_out: "text-red-500",
  session_refreshed: "text-cyan-400", session_fingerprint_mismatch: "text-red-400",
  csrf_rejected: "text-red-400", ws_connected: "text-green-400",
  ws_disconnected: "text-amber-400", input_rejected: "text-red-400",
};

export default function SecurityPage() {
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const fetchEvents = async () => {
    try {
      const res = await fetch("/api/security/events");
      if (res.ok) setEvents((await res.json()).events || []);
    } catch { /* skip */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchEvents(); }, []);

  const types = [...new Set(events.map((e) => e.type))];
  const filtered = events.filter((e) => {
    if (typeFilter !== "all" && e.type !== typeFilter) return false;
    if (filter && !e.type.includes(filter.toLowerCase()) && !(e.detail || "").toLowerCase().includes(filter.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-500 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            <Shield className="w-7 h-7 sm:w-8 sm:h-8 text-cyan-400" /> Security Audit Log
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">{events.length} events recorded</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { setLoading(true); fetchEvents(); }}
            className="p-2 rounded-lg border border-white/10 text-gray-400 hover:text-white">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button onClick={() => downloadCSV(filtered as unknown as Record<string, unknown>[], exportFilename("security-audit"))}
            className="p-2 rounded-lg border border-white/10 text-gray-400 hover:text-white">
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input type="text" placeholder="Filter events..." value={filter} onChange={(e) => setFilter(e.target.value)}
            className="w-full bg-black/20 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-white text-sm focus:border-cyan-500/50 focus:outline-none" />
        </div>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
          className="bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white text-sm">
          <option value="all">All Types</option>
          {types.map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
        </select>
      </div>

      <div className="glass-panel rounded-xl border border-white/5 overflow-hidden">
        <div className="grid grid-cols-[140px_1fr_120px_1fr] gap-3 px-5 py-2.5 border-b border-white/10 bg-black/40 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
          <div>Time</div><div>Event</div><div>IP</div><div>Detail</div>
        </div>
        {loading && <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-cyan-400 animate-spin" /></div>}
        {!loading && filtered.length === 0 && <div className="text-center py-12 text-muted-foreground text-sm">No security events.</div>}
        {!loading && filtered.map((e) => (
          <div key={e.id} className="grid grid-cols-[140px_1fr_120px_1fr] gap-3 px-5 py-2.5 border-b border-white/5 hover:bg-white/[0.02] items-center">
            <div className="text-xs text-gray-500">{new Date(e.ts).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" })}</div>
            <div className={`text-xs font-mono font-semibold ${typeColors[e.type] || "text-gray-400"}`}>{e.type}</div>
            <div className="text-xs text-gray-500 font-mono">{e.ip || "—"}</div>
            <div className="text-xs text-gray-400 truncate">{e.detail || "—"}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
