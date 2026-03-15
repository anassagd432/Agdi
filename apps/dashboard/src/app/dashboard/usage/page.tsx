"use client";

import React, { useState, useEffect } from "react";
import {
  BarChart3, TrendingUp, DollarSign, Zap, Clock,
  ArrowUpRight, ArrowDownRight,
} from "lucide-react";

interface ProviderUsage {
  provider: string; model: string; icon: string;
  tokensIn: number; tokensOut: number;
  requests: number; cost: number;
  trend: number; // percentage change
}

const usageData: ProviderUsage[] = [
  { provider: "Anthropic", model: "Claude Opus 4.6", icon: "🧠", tokensIn: 2847000, tokensOut: 1423000, requests: 1847, cost: 42.36, trend: 12 },
  { provider: "Anthropic", model: "Claude Sonnet 4.6", icon: "🧠", tokensIn: 1562000, tokensOut: 890000, requests: 2341, cost: 18.72, trend: 8 },
  { provider: "Anthropic", model: "Claude Haiku 4.5", icon: "🧠", tokensIn: 982000, tokensOut: 456000, requests: 4521, cost: 3.24, trend: -5 },
  { provider: "OpenAI", model: "GPT-5.4", icon: "🤖", tokensIn: 1245000, tokensOut: 678000, requests: 1023, cost: 31.15, trend: 22 },
  { provider: "OpenAI", model: "o3", icon: "🤖", tokensIn: 456000, tokensOut: 234000, requests: 312, cost: 18.45, trend: 45 },
  { provider: "OpenAI", model: "GPT-4.1", icon: "🤖", tokensIn: 890000, tokensOut: 512000, requests: 1567, cost: 8.92, trend: -12 },
  { provider: "Google", model: "Gemini 3.1 Pro", icon: "✨", tokensIn: 678000, tokensOut: 345000, requests: 892, cost: 5.67, trend: 34 },
  { provider: "Google", model: "Gemini 3 Flash", icon: "✨", tokensIn: 1890000, tokensOut: 923000, requests: 3456, cost: 2.84, trend: 18 },
  { provider: "DeepSeek", model: "V3.2", icon: "🔬", tokensIn: 1234000, tokensOut: 567000, requests: 1789, cost: 1.23, trend: 67 },
  { provider: "DeepSeek", model: "R1", icon: "🔬", tokensIn: 345000, tokensOut: 189000, requests: 456, cost: 0.89, trend: 15 },
  { provider: "xAI", model: "Grok 4.2", icon: "🚀", tokensIn: 234000, tokensOut: 123000, requests: 234, cost: 4.56, trend: -8 },
  { provider: "Meta", model: "Llama 4 Maverick", icon: "🦥", tokensIn: 567000, tokensOut: 234000, requests: 789, cost: 0.00, trend: 28 },
];

function formatNum(n: number): string {
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return String(n);
}

export default function UsagePage() {
  const [period, setPeriod] = useState<"7d" | "30d" | "90d">("30d");
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const totalTokens = usageData.reduce((s, u) => s + u.tokensIn + u.tokensOut, 0);
  const totalCost = usageData.reduce((s, u) => s + u.cost, 0);
  const totalRequests = usageData.reduce((s, u) => s + u.requests, 0);
  const avgLatency = 342;

  const stats = [
    { label: "Total Tokens", value: formatNum(totalTokens), icon: <Zap className="w-5 h-5 text-cyan-400" />, change: "+14%" },
    { label: "Total Cost", value: `$${totalCost.toFixed(2)}`, icon: <DollarSign className="w-5 h-5 text-green-400" />, change: "+8%" },
    { label: "API Requests", value: formatNum(totalRequests), icon: <BarChart3 className="w-5 h-5 text-purple-400" />, change: "+21%" },
    { label: "Avg Latency", value: `${avgLatency}ms`, icon: <Clock className="w-5 h-5 text-amber-400" />, change: "-6%" },
  ];

  // Build a simple bar for token usage visualization
  const maxTokens = Math.max(...usageData.map((u) => u.tokensIn + u.tokensOut));

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-500 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            <TrendingUp className="w-7 h-7 sm:w-8 sm:h-8 text-cyan-400" /> Usage & Billing
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">Token consumption across all providers</p>
        </div>
        <div className="flex rounded-lg border border-white/10 overflow-hidden">
          {(["7d", "30d", "90d"] as const).map((p) => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-3 py-2 text-xs font-semibold ${period === p ? "bg-cyan-500/10 text-cyan-400" : "text-gray-500 hover:text-white"}`}>
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 stagger-in">
        {stats.map((s) => (
          <div key={s.label} className="glass-panel p-4 border border-white/5 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              {s.icon}
              <span className={`text-[10px] font-bold flex items-center gap-0.5 ${s.change.startsWith("+") ? "text-green-400" : "text-red-400"}`}>
                {s.change.startsWith("+") ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {s.change}
              </span>
            </div>
            <p className="text-xl font-bold text-white">{s.value}</p>
            <p className="text-[10px] text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Per-model usage table */}
      <div className="glass-panel rounded-xl border border-white/5 overflow-hidden">
        <div className="px-4 py-3 border-b border-white/10 bg-black/40">
          <h3 className="text-sm font-semibold text-white">Per-Model Breakdown</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] text-gray-500 uppercase tracking-wider border-b border-white/5">
                <th className="text-left font-semibold px-4 py-2.5">Model</th>
                <th className="text-right font-semibold px-4 py-2.5">Tokens In</th>
                <th className="text-right font-semibold px-4 py-2.5">Tokens Out</th>
                <th className="text-right font-semibold px-4 py-2.5">Requests</th>
                <th className="text-right font-semibold px-4 py-2.5">Cost</th>
                <th className="text-right font-semibold px-4 py-2.5">Trend</th>
                <th className="px-4 py-2.5 w-40">Usage</th>
              </tr>
            </thead>
            <tbody>
              {usageData.map((u) => {
                const total = u.tokensIn + u.tokensOut;
                const pct = (total / maxTokens) * 100;
                return (
                  <tr key={u.model} className="border-b border-white/5 hover:bg-white/[0.02]">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{u.icon}</span>
                        <div>
                          <p className="text-xs font-semibold text-white">{u.model}</p>
                          <p className="text-[10px] text-gray-600">{u.provider}</p>
                        </div>
                      </div>
                    </td>
                    <td className="text-right px-4 py-3 text-xs text-gray-400 font-mono">{formatNum(u.tokensIn)}</td>
                    <td className="text-right px-4 py-3 text-xs text-gray-400 font-mono">{formatNum(u.tokensOut)}</td>
                    <td className="text-right px-4 py-3 text-xs text-gray-400 font-mono">{formatNum(u.requests)}</td>
                    <td className="text-right px-4 py-3 text-xs font-mono">
                      <span className={u.cost === 0 ? "text-green-400" : "text-white"}>{u.cost === 0 ? "Free" : `$${u.cost.toFixed(2)}`}</span>
                    </td>
                    <td className="text-right px-4 py-3">
                      <span className={`text-[10px] font-bold flex items-center justify-end gap-0.5 ${u.trend >= 0 ? "text-green-400" : "text-red-400"}`}>
                        {u.trend >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        {Math.abs(u.trend)}%
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 transition-all"
                          style={{ width: mounted ? `${pct}%` : "0%" }} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
