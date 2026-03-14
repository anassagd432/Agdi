"use client";

import { useEffect, useState, useCallback } from "react";
import { agdi } from "@/lib/agdi-client";
import {
  Power,
  Bot,
  TerminalSquare,
  Activity,
  Cpu,
  Database,
  Network,
  CheckCircle2,
  ChevronRight,
  Zap,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

// ── Types ────────────────────────────────────────────────────────────────────
interface SysStatus {
  tokens: number;
  activeAgents: number;
  uptime: number;
  memory: string;
  cost: number;
  rss?: string;
}

interface SessionRow {
  key: string;
  label?: string;
  updatedAt?: number;
  channel?: string;
  model?: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function fmtUptime(secs: number): string {
  if (!secs) return "0s";
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${secs % 60}s`;
}

function fmtTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

function timeAgo(ts: number): string {
  const secs = Math.floor((Date.now() - ts) / 1000);
  if (secs < 60) return `${secs}s ago`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function DashboardOverview() {
  const [sys, setSys] = useState<SysStatus | null>(null);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    try {
      const [sysRes, sessRes] = await Promise.allSettled([
        agdi.call("system.status"),
        agdi.call("sessions.list", { limit: 8, sortBy: "updatedAt" }),
      ]);
      if (sysRes.status === "fulfilled" && sysRes.value) setSys(sysRes.value as SysStatus);
      if (sessRes.status === "fulfilled" && sessRes.value) {
        const raw = sessRes.value as { sessions?: SessionRow[] };
        setSessions(raw.sessions ?? []);
      }
    } catch (e) {
      console.warn("dashboard fetch:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const iv = setInterval(fetchAll, 5000);
    return () => clearInterval(iv);
  }, [fetchAll]);

  // ── Actions ────────────────────────────────────────────────────────────────
  const handleSpawn = async () => {
    try {
      await agdi.call("agents.create", {
        name: "Parallel Worker",
        task: "Analyze codebase architecture and summarize findings.",
      });
      toast.success("Parallel agent spawned.");
      fetchAll();
    } catch (e: unknown) {
      toast.error(`Spawn failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const handleDiagnostics = async () => {
    try {
      toast.info("Running agdi doctor…");
      await agdi.call("system.doctor");
      toast.success("Diagnostics complete — check your agent chat for results.");
    } catch {
      // doctor may not be exposed as an RPC; fall back to a chat message
      toast.info("Run `agdi doctor` in your terminal for full diagnostics.");
    }
  };

  const handleEmergencyStop = async () => {
    if (!confirm("Stop ALL running agents?")) return;
    try {
      const agentsRes = await agdi.call("agents.list");
      const allAgents = (agentsRes as { agents?: { id: string }[] })?.agents ?? [];
      await Promise.allSettled(
        allAgents.map((a) => agdi.call("agents.stop", { id: a.id }))
      );
      toast.error("Emergency stop issued. All agents halted.", {
        style: {
          background: "rgba(220,38,38,0.2)",
          border: "1px solid rgba(220,38,38,0.5)",
          color: "#f87171",
        },
      });
      fetchAll();
    } catch (e: unknown) {
      toast.error(`Stop failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight text-white mb-1">Command Center</h1>
          <p className="text-muted-foreground">Real-time telemetry and autonomous agent orchestration.</p>
        </div>
        <button
          onClick={() => { setLoading(true); fetchAll(); }}
          className="p-2 rounded-lg border border-white/10 text-gray-400 hover:text-white transition-colors mt-1"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          color="cyan"
          icon={<Cpu className="w-4 h-4" />}
          label="Core Daemon"
          badge={sys ? "ONLINE" : "OFFLINE"}
          badgeColor={sys ? "cyan" : "red"}
          value={sys?.memory ?? "—"}
          sub={sys ? `Uptime: ${fmtUptime(sys.uptime)}` : "Not connected"}
        />
        <KpiCard
          color="blue"
          icon={<Zap className="w-4 h-4" />}
          label="Active Agents"
          value={String(sys?.activeAgents ?? "—")}
          sub={`${sessions.length} recent sessions`}
        />
        <KpiCard
          color="purple"
          icon={<Database className="w-4 h-4" />}
          label="Token Usage"
          value={sys ? fmtTokens(sys.tokens) : "—"}
          sub={sys && sys.cost > 0 ? `Est. $${sys.cost.toFixed(3)} cost` : "No billing data"}
        />
        <KpiCard
          color="emerald"
          icon={<Network className="w-4 h-4" />}
          label="Memory RSS"
          value={sys?.rss ?? sys?.memory ?? "—"}
          sub="Process memory"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        {/* Session History */}
        <div className="glass-panel flex flex-col lg:col-span-4 min-h-[400px] overflow-hidden">
          <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
            <h2 className="text-lg font-semibold flex items-center gap-2 text-white">
              <Activity className="w-5 h-5 text-cyan-400" /> Recent Sessions
            </h2>
            <span className="text-xs font-medium text-muted-foreground bg-black/40 px-2.5 py-1 rounded border border-white/10">
              Live · 5s poll
            </span>
          </div>

          <div className="flex-1 overflow-auto p-0">
            {sessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-16 text-gray-500 text-sm gap-2">
                <Bot className="w-8 h-8 opacity-30" />
                No sessions yet — send a message to start one.
              </div>
            ) : (
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground bg-black/40 border-b border-white/5 sticky top-0">
                  <tr>
                    <th className="px-6 py-3 font-medium">Session</th>
                    <th className="px-6 py-3 font-medium">Channel</th>
                    <th className="px-6 py-3 font-medium text-right">Last active</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {sessions.map((s) => (
                    <tr key={s.key} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                          <span className="font-mono text-xs text-cyan-400/70 truncate max-w-[140px]">
                            {s.label ?? s.key}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-400 text-xs">{s.channel ?? "—"}</td>
                      <td className="px-6 py-4 text-right text-muted-foreground text-xs text-nowrap">
                        {s.updatedAt ? timeAgo(s.updatedAt) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="glass-panel flex flex-col lg:col-span-3 min-h-[400px]">
          <div className="p-6 border-b border-white/5 bg-white/[0.02]">
            <h2 className="text-lg font-semibold text-white">Quick Actions</h2>
            <p className="text-sm text-muted-foreground mt-1">Direct commands to the Agdi Gateway</p>
          </div>

          <div className="p-6 flex flex-col gap-4">
            <button
              onClick={handleSpawn}
              className="group relative overflow-hidden bg-cyan-950/30 hover:bg-cyan-900/40 border border-cyan-500/30 w-full flex flex-col gap-2 p-4 rounded-xl transition-all hover:border-cyan-400/50 text-left"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-cyan-500/20 rounded-lg text-cyan-400 group-hover:scale-110 transition-transform">
                  <Bot className="w-5 h-5" />
                </div>
                <div className="font-semibold text-white">Spawn Parallel Agent</div>
              </div>
              <p className="text-xs text-cyan-100/60 ml-12">
                Allocate a new autonomous worker via <code>agents.create</code>.
              </p>
            </button>

            <button
              onClick={handleDiagnostics}
              className="group relative overflow-hidden bg-white/5 hover:bg-white/10 border border-white/10 w-full flex flex-col gap-2 p-4 rounded-xl transition-all hover:border-white/20 text-left"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/20 rounded-lg text-purple-400 group-hover:scale-110 transition-transform">
                  <TerminalSquare className="w-5 h-5" />
                </div>
                <div className="font-semibold text-white">Run Diagnostics</div>
              </div>
              <p className="text-xs text-muted-foreground ml-12">
                Call <code>system.doctor</code> to verify environment and config.
              </p>
            </button>

            <Link
              href="/dashboard/analytics"
              className="group bg-white/5 hover:bg-white/10 border border-white/10 w-full flex items-center gap-3 p-4 rounded-xl transition-all hover:border-white/20"
            >
              <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-400 group-hover:scale-110 transition-transform">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <div className="font-semibold text-white text-sm">View Analytics</div>
                <div className="text-xs text-muted-foreground">Live cost, token usage &amp; provider breakdown</div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto" />
            </Link>

            <div className="mt-auto pt-4 border-t border-white/5">
              <button
                onClick={handleEmergencyStop}
                className="group bg-red-950/30 hover:bg-red-900/50 border border-red-900 w-full flex items-center justify-between p-4 rounded-xl transition-all"
              >
                <div className="flex items-center gap-3 text-red-500 font-medium">
                  <AlertTriangle className="w-5 h-5 group-hover:animate-pulse" />
                  Emergency Stop All
                </div>
                <Power className="w-4 h-4 text-red-700 group-hover:text-red-500 transition-colors" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({
  color, icon, label, badge, badgeColor, value, sub,
}: {
  color: string;
  icon: React.ReactNode;
  label: string;
  badge?: string;
  badgeColor?: string;
  value: string;
  sub: string;
}) {
  const glow: Record<string, string> = {
    cyan: "bg-cyan-500/10",
    blue: "bg-blue-500/10",
    purple: "bg-purple-500/10",
    emerald: "bg-emerald-500/10",
  };
  const badgeStyle: Record<string, string> = {
    cyan: "text-cyan-400 bg-cyan-400/10 border-cyan-400/20",
    red: "text-red-400 bg-red-400/10 border-red-400/20",
  };
  return (
    <div className="glass-panel p-6 flex flex-col gap-3 relative overflow-hidden group">
      <div className={`absolute -right-4 -top-4 w-24 h-24 ${glow[color]} rounded-full blur-2xl group-hover:opacity-150 transition-all`} />
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          {icon} {label}
        </h3>
        {badge && (
          <span className={`flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full border ${badgeStyle[badgeColor ?? "cyan"]}`}>
            <div className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
            {badge}
          </span>
        )}
      </div>
      <div className="flex flex-col">
        <span className="text-2xl font-bold text-white tracking-tight">{value}</span>
        <span className="text-xs text-muted-foreground mt-1">{sub}</span>
      </div>
    </div>
  );
}
