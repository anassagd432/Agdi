"use client";

import React, { useState } from "react";
import {
  BarChart3, TrendingUp, DollarSign, Cpu, Calendar, Download,
} from "lucide-react";
import { downloadCSV, exportFilename } from "@/lib/export";

interface DayData {
  date: string; tokens: number; cost: number; messages: number; agents: number;
}

function generateData(): DayData[] {
  const data: DayData[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    data.push({
      date: d.toISOString().slice(0, 10),
      tokens: Math.floor(20000 + Math.random() * 180000),
      cost: +(0.5 + Math.random() * 4.5).toFixed(2),
      messages: Math.floor(20 + Math.random() * 180),
      agents: Math.floor(1 + Math.random() * 5),
    });
  }
  return data;
}

function MiniBar({ values, color, maxH = 48 }: { values: number[]; color: string; maxH?: number }) {
  const max = Math.max(...values, 1);
  return (
    <div className="flex items-end gap-[2px] h-12">
      {values.map((v, i) => (
        <div key={i} className={`${color} rounded-sm transition-all hover:opacity-80`}
          style={{ height: `${Math.max(2, (v / max) * maxH)}px`, width: "100%", minWidth: "3px" }}
          title={`${v.toLocaleString()}`} />
      ))}
    </div>
  );
}

export default function AnalyticsPage() {
  const [data] = useState(generateData);
  const [range, setRange] = useState("30d");

  const sliced = range === "7d" ? data.slice(-7) : data;
  const totalTokens = sliced.reduce((s, d) => s + d.tokens, 0);
  const totalCost = sliced.reduce((s, d) => s + d.cost, 0);
  const totalMessages = sliced.reduce((s, d) => s + d.messages, 0);
  const avgAgents = +(sliced.reduce((s, d) => s + d.agents, 0) / sliced.length).toFixed(1);

  const cards = [
    { label: "Total Tokens", value: totalTokens >= 1_000_000 ? `${(totalTokens / 1_000_000).toFixed(1)}M` : `${(totalTokens / 1000).toFixed(0)}K`, icon: <Cpu className="w-5 h-5 text-purple-400" />, color: "bg-purple-500/10", chart: sliced.map((d) => d.tokens), barColor: "bg-purple-500/60" },
    { label: "Total Cost", value: `$${totalCost.toFixed(2)}`, icon: <DollarSign className="w-5 h-5 text-green-400" />, color: "bg-green-500/10", chart: sliced.map((d) => d.cost), barColor: "bg-green-500/60" },
    { label: "Messages", value: totalMessages.toLocaleString(), icon: <TrendingUp className="w-5 h-5 text-cyan-400" />, color: "bg-cyan-500/10", chart: sliced.map((d) => d.messages), barColor: "bg-cyan-500/60" },
    { label: "Avg Agents", value: String(avgAgents), icon: <BarChart3 className="w-5 h-5 text-amber-400" />, color: "bg-amber-500/10", chart: sliced.map((d) => d.agents), barColor: "bg-amber-500/60" },
  ];

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-500 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            <BarChart3 className="w-7 h-7 sm:w-8 sm:h-8 text-cyan-400" /> Analytics
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">Usage and cost metrics over time</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-white/10 overflow-hidden">
            {["7d", "30d"].map((r) => (
              <button key={r} onClick={() => setRange(r)}
                className={`px-3 py-1.5 text-xs font-semibold ${range === r ? "bg-cyan-500/10 text-cyan-400" : "text-gray-500 hover:text-white"}`}>
                {r === "7d" ? "7 Days" : "30 Days"}
              </button>
            ))}
          </div>
          <button onClick={() => downloadCSV(sliced.map((d) => ({ ...d })) as Record<string, unknown>[], exportFilename("analytics"))}
            className="p-2 rounded-lg border border-white/10 text-gray-400 hover:text-white">
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="glass-panel p-5 border border-white/5 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{c.label}</span>
              <div className={`p-2 rounded-lg ${c.color}`}>{c.icon}</div>
            </div>
            <div className="text-2xl font-bold text-white">{c.value}</div>
            <MiniBar values={c.chart} color={c.barColor} />
          </div>
        ))}
      </div>

      <div className="glass-panel rounded-xl border border-white/5 overflow-hidden">
        <div className="p-4 border-b border-white/10 bg-black/40 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Calendar className="w-4 h-4 text-cyan-400" /> Daily Breakdown
          </h2>
        </div>
        <div className="grid grid-cols-[1fr_100px_80px_80px_60px] gap-3 px-5 py-2.5 border-b border-white/10 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
          <div>Date</div><div>Tokens</div><div>Cost</div><div>Msgs</div><div>Agents</div>
        </div>
        {sliced.slice().reverse().map((d) => (
          <div key={d.date} className="grid grid-cols-[1fr_100px_80px_80px_60px] gap-3 px-5 py-2.5 border-b border-white/5 items-center hover:bg-white/[0.02] text-sm">
            <div className="text-gray-300">{new Date(d.date).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })}</div>
            <div className="text-gray-300">{(d.tokens / 1000).toFixed(0)}K</div>
            <div className="text-green-400 font-mono">${d.cost}</div>
            <div className="text-gray-300">{d.messages}</div>
            <div className="text-gray-300">{d.agents}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
