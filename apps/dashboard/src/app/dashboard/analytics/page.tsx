"use client";

import React, { useState, useEffect, useCallback } from "react";
import { BarChart, TrendingUp, DollarSign, Activity, Zap, HardDrive, RefreshCw, Download } from "lucide-react";
import { agdi } from "@/lib/agdi-client";
import { downloadCSV, exportFilename } from "@/lib/export";

// ── Types ────────────────────────────────────────────────────────────────────
interface SystemStatus {
  tokens: number;
  activeAgents: number;
  uptime: number;
  memory: string;
  cost: number;
}

interface ProviderEntry {
  provider: string;
  totals: { totalTokens: number; totalCost: number };
}

interface DailyBar {
  date: string;
  tokens: number;
  cost: number;
}

interface AnalyticsData {
  system: SystemStatus | null;
  providers: ProviderEntry[];
  dailyBars: DailyBar[];
  totalTokens: number;
  totalCost: number;
  lastRefreshed: Date | null;
}

const PROVIDER_COLORS: Record<string, string> = {
  anthropic: "bg-purple-500",
  openai: "bg-cyan-500",
  google: "bg-orange-500",
  openrouter: "bg-blue-500",
  ollama: "bg-emerald-500",
  groq: "bg-pink-500",
};

const PROVIDER_TEXT_COLORS: Record<string, string> = {
  anthropic: "text-purple-400",
  openai: "text-cyan-400",
  google: "text-orange-400",
  openrouter: "text-blue-400",
  ollama: "text-emerald-400",
  groq: "text-pink-400",
};

function providerLabel(raw: string): string {
  const map: Record<string, string> = {
    anthropic: "Anthropic (Claude)",
    openai: "OpenAI (GPT series)",
    google: "Google (Gemini)",
    openrouter: "OpenRouter",
    ollama: "Local (Ollama)",
    groq: "Groq",
  };
  return map[raw.toLowerCase()] ?? raw;
}

function fmtUptime(secs: number): string {
  if (!secs) return "0s";
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function fmtTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

// Build last N days of bars anchored to today (fills gaps with 0)
function buildDailyBars(raw: DailyBar[], days: number): DailyBar[] {
  const map = new Map(raw.map((d) => [d.date, d]));
  const result: DailyBar[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    result.push(map.get(dateStr) ?? { date: dateStr, tokens: 0, cost: 0 });
  }
  return result;
}

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function AnalyticsPage() {
  const [range, setRange] = useState<7 | 30>(7);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AnalyticsData>({
    system: null,
    providers: [],
    dailyBars: [],
    totalTokens: 0,
    totalCost: 0,
    lastRefreshed: null,
  });

  const fetchAll = useCallback(async () => {
    try {
      // Fetch system status and usage in parallel
      const [sysRes, usageRes] = await Promise.allSettled([
        agdi.call("system.status"),
        agdi.call("usage.cost", { days: range }),
      ]);

      const sys: SystemStatus | null =
        sysRes.status === "fulfilled" && sysRes.value ? sysRes.value : null;

      let providers: ProviderEntry[] = [];
      let dailyBars: DailyBar[] = [];
      let totalTokens = sys?.tokens ?? 0;
      let totalCost = sys?.cost ?? 0;

      if (usageRes.status === "fulfilled" && usageRes.value) {
        const usage = usageRes.value;

        // Provider breakdown
        if (Array.isArray(usage.byProvider)) {
          providers = usage.byProvider as ProviderEntry[];
        }

        // Daily bars
        if (Array.isArray(usage.daily)) {
          dailyBars = (usage.daily as DailyBar[]).map((d: DailyBar) => ({
            date: d.date,
            tokens: d.tokens ?? 0,
            cost: d.cost ?? 0,
          }));
        }

        // Aggregate totals from usage if available
        if (usage.totals) {
          totalTokens = usage.totals.totalTokens ?? totalTokens;
          totalCost = usage.totals.totalCost ?? totalCost;
        }
      }

      // Pad/align daily bars to match range
      const filledBars = buildDailyBars(dailyBars, range);

      setData({
        system: sys,
        providers,
        dailyBars: filledBars,
        totalTokens,
        totalCost,
        lastRefreshed: new Date(),
      });
    } catch (e) {
      console.warn("Analytics fetch error:", e);
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    setLoading(true);
    fetchAll();
    const intv = setInterval(fetchAll, 15000);
    return () => clearInterval(intv);
  }, [fetchAll]);

  const maxBar = Math.max(...data.dailyBars.map((d) => d.tokens), 1);
  const totalProviders = data.providers.reduce((s, p) => s + p.totals.totalTokens, 1);

  // X-axis labels: day-of-week for 7d, or date for 30d
  const xLabels = data.dailyBars.map((d) => {
    const dt = new Date(d.date + "T00:00:00");
    return range === 7 ? DAY_LABELS[dt.getDay() === 0 ? 6 : dt.getDay() - 1] : String(dt.getDate());
  });

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-500 max-w-7xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            <BarChart className="w-8 h-8 text-cyan-400" /> Analytics &amp; Cost
          </h1>
          <p className="text-muted-foreground mt-2">
            Live token usage, LLM API spend, and agent fleet efficiency.
            {data.lastRefreshed && (
              <span className="text-gray-600 ml-2 text-xs">
                Updated {data.lastRefreshed.toLocaleTimeString()}
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Range selector */}
          <div className="flex bg-black/40 border border-white/10 rounded-lg p-1">
            {([7, 30] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  range === r ? "bg-white/10 text-white" : "text-gray-400 hover:text-white"
                }`}
              >
                {r} Days
              </button>
            ))}
          </div>
          {/* Manual refresh */}
          <button
            onClick={() => { setLoading(true); fetchAll(); }}
            className="p-2 rounded-lg border border-white/10 text-gray-400 hover:text-white transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          {/* Export CSV */}
          <button
            onClick={() => downloadCSV(
              data.dailyBars.map((d) => ({ date: d.date, tokens: d.tokens, cost: d.cost })),
              exportFilename("analytics"),
              [{ key: "date", label: "Date" }, { key: "tokens", label: "Tokens" }, { key: "cost", label: "Cost ($)" }],
            )}
            disabled={data.dailyBars.length === 0}
            className="p-2 rounded-lg border border-white/10 text-gray-400 hover:text-white transition-colors disabled:opacity-30"
            title="Export CSV"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KpiCard
          icon={<DollarSign className="w-4 h-4 text-emerald-400" />}
          label="Total API Spend"
          value={data.totalCost > 0 ? `$${data.totalCost.toFixed(2)}` : "$0.00"}
          sub={data.totalCost > 0 ? "from sessions" : "No billing data yet"}
          glow="bg-emerald-500/10"
        />
        <KpiCard
          icon={<Activity className="w-4 h-4 text-purple-400" />}
          label="Total Tokens"
          value={fmtTokens(data.totalTokens)}
          sub="All sessions"
          glow="bg-purple-500/10"
        />
        <KpiCard
          icon={<HardDrive className="w-4 h-4 text-blue-400" />}
          label="Heap Memory"
          value={data.system?.memory ?? "—"}
          sub="Live process"
          glow="bg-blue-500/10"
        />
        <KpiCard
          icon={<Zap className="w-4 h-4 text-orange-400" />}
          label="Daemon Uptime"
          value={data.system?.uptime ? fmtUptime(data.system.uptime) : "—"}
          sub={data.system ? "Running" : "Offline"}
          subColor={data.system ? "text-emerald-400" : "text-red-400"}
          glow="bg-orange-500/10"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Token Usage Chart */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-xl border border-white/5 flex flex-col" style={{ height: "22rem" }}>
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-cyan-400" />
            Token Usage — Last {range} Days
          </h3>

          {data.dailyBars.every((b) => b.tokens === 0) ? (
            <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">
              No token data yet — start a session to see real usage.
            </div>
          ) : (
            <>
              <div className="flex-1 flex items-end gap-1 border-b border-white/10 pb-3 relative">
                <div className="absolute -left-1 top-0 bottom-4 flex flex-col justify-between text-xs text-gray-600 font-mono text-right pr-1" style={{ width: "2.5rem" }}>
                  <span>{fmtTokens(maxBar)}</span>
                  <span>{fmtTokens(Math.round(maxBar / 2))}</span>
                  <span>0</span>
                </div>
                <div className="flex-1 flex items-end justify-between h-full pl-10 gap-1">
                  {data.dailyBars.map((bar, idx) => (
                    <div key={idx} className="flex flex-col items-center gap-1 w-full">
                      <div
                        className="w-full bg-gradient-to-t from-cyan-500/30 to-cyan-400 rounded-t-sm relative group cursor-pointer transition-all hover:brightness-125 min-h-[2px]"
                        style={{ height: `${(bar.tokens / maxBar) * 100}%` }}
                      >
                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-black/90 border border-white/10 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity font-mono whitespace-nowrap z-10">
                          {fmtTokens(bar.tokens)} tokens<br />
                          <span className="text-emerald-400">${bar.cost.toFixed(4)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex justify-between pl-10 mt-2 text-xs text-gray-500 font-medium gap-1">
                {xLabels.map((l, i) => (
                  <span key={i} className="w-full text-center truncate">{l}</span>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Provider Breakdown */}
        <div className="glass-panel p-6 rounded-xl border border-white/5 flex flex-col" style={{ height: "22rem" }}>
          <h3 className="font-semibold text-white mb-4">Cost by Model Provider</h3>

          {data.providers.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-gray-500 text-sm text-center">
              No provider data yet. Sessions with API calls will appear here.
            </div>
          ) : (
            <div className="flex-1 flex flex-col justify-center gap-4 overflow-y-auto">
              {data.providers.slice(0, 5).map((p) => {
                const pKey = p.provider?.toLowerCase() ?? "unknown";
                const pct = Math.round((p.totals.totalTokens / totalProviders) * 100);
                return (
                  <div key={pKey}>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="text-gray-300 truncate">{providerLabel(p.provider)}</span>
                      <span className={`font-mono ml-2 flex-shrink-0 ${PROVIDER_TEXT_COLORS[pKey] ?? "text-gray-400"}`}>
                        ${p.totals.totalCost.toFixed(2)}
                      </span>
                    </div>
                    <div className="w-full h-2 bg-black/50 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${PROVIDER_COLORS[pKey] ?? "bg-gray-500"} rounded-full transition-all duration-500`}
                        style={{ width: `${Math.max(pct, 1)}%` }}
                      />
                    </div>
                    <div className="text-xs text-gray-600 mt-0.5">{fmtTokens(p.totals.totalTokens)} tokens · {pct}%</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── KPI Card Component ───────────────────────────────────────────────────────
function KpiCard({
  icon, label, value, sub, subColor = "text-gray-400", glow,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  subColor?: string;
  glow: string;
}) {
  return (
    <div className="glass-panel p-6 rounded-xl border border-white/5 relative overflow-hidden">
      <div className={`absolute -right-4 -top-4 w-24 h-24 ${glow} rounded-full blur-2xl`} />
      <p className="text-sm font-medium text-gray-400 flex items-center gap-2 mb-2">
        {icon} {label}
      </p>
      <p className="text-3xl font-bold text-white">{value}</p>
      <p className={`text-xs mt-1 ${subColor}`}>{sub}</p>
    </div>
  );
}
