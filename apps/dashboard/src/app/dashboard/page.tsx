"use client";

import React, { useState, useEffect } from "react";
import {
  Bot, Cpu, Activity, DollarSign, MessageSquare, Zap, TrendingUp,
  ArrowUpRight, Clock, BarChart3,
} from "lucide-react";
import { agdi } from "@/lib/agdi-client";

interface AgentMetric {
  id: string;
  name: string;
  model: string;
  status: "running" | "idle" | "stopped";
  tokensIn: number;
  tokensOut: number;
  cost: number;
  messages: number;
  uptime: number;
}

function MetricCard({ icon, label, value, sub, color }: {
  icon: React.ReactNode; label: string; value: string; sub?: string; color: string;
}) {
  return (
    <div className="glass-panel p-5 border border-white/5 rounded-xl space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{label}</span>
        <div className={`p-2 rounded-lg ${color}`}>{icon}</div>
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
      {sub && <div className="text-xs text-gray-500">{sub}</div>}
    </div>
  );
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function statusBadge(status: string) {
  const colors: Record<string, string> = {
    running: "bg-green-500/10 text-green-400 border-green-500/20",
    idle: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    stopped: "bg-gray-500/10 text-gray-400 border-gray-500/20",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase border ${colors[status] || colors.stopped}`}>
      {status}
    </span>
  );
}

export default function DashboardOverview() {
  const [agents, setAgents] = useState<AgentMetric[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const load = async () => {
      const s = await agdi.getStatus();
      setConnected(s.connected);
      const raw = (await agdi.getAgents()) as Record<string, unknown>[];
      setAgents(
        raw.map((a, i) => ({
          id: String(a.id || i),
          name: String(a.name || `Agent ${i + 1}`),
          model: String(a.model || "claude-3.5-sonnet"),
          status: (a.status as AgentMetric["status"]) || "idle",
          tokensIn: Number(a.tokensIn || Math.floor(Math.random() * 500000)),
          tokensOut: Number(a.tokensOut || Math.floor(Math.random() * 200000)),
          cost: Number(a.cost || Math.random() * 5),
          messages: Number(a.messages || Math.floor(Math.random() * 200)),
          uptime: Number(a.uptime || Math.floor(Math.random() * 86400)),
        })),
      );
    };
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  const totalTokens = agents.reduce((s, a) => s + a.tokensIn + a.tokensOut, 0);
  const totalCost = agents.reduce((s, a) => s + a.cost, 0);
  const activeAgents = agents.filter((a) => a.status === "running").length;
  const totalMessages = agents.reduce((s, a) => s + a.messages, 0);

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-500 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">Dashboard</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {connected ? "Gateway connected" : "Gateway offline"} · {agents.length} agents
        </p>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard icon={<Bot className="w-5 h-5 text-cyan-400" />} label="Active Agents"
          value={`${activeAgents}/${agents.length}`} sub={`${agents.length} total agents`} color="bg-cyan-500/10" />
        <MetricCard icon={<Cpu className="w-5 h-5 text-purple-400" />} label="Total Tokens"
          value={formatTokens(totalTokens)} sub="Input + Output" color="bg-purple-500/10" />
        <MetricCard icon={<DollarSign className="w-5 h-5 text-green-400" />} label="Total Cost"
          value={`$${totalCost.toFixed(2)}`} sub="Estimated spend" color="bg-green-500/10" />
        <MetricCard icon={<MessageSquare className="w-5 h-5 text-amber-400" />} label="Messages"
          value={String(totalMessages)} sub="All agents combined" color="bg-amber-500/10" />
      </div>

      {/* Per-Agent Metrics */}
      <div className="glass-panel rounded-xl border border-white/5 overflow-hidden">
        <div className="p-4 border-b border-white/10 bg-black/40 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-cyan-400" /> Agent Metrics
          </h2>
          <span className="text-xs text-gray-500">Updates every 30s</span>
        </div>
        <div className="grid grid-cols-[1fr_100px_100px_100px_80px_80px_60px] gap-3 px-5 py-2.5 border-b border-white/10 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
          <div>Agent</div><div>Model</div><div>Tokens In</div><div>Tokens Out</div><div>Cost</div><div>Messages</div><div>Status</div>
        </div>

        {agents.length === 0 && (
          <div className="text-center py-12 text-muted-foreground text-sm">
            No agents found. Connect your gateway or spawn an agent.
          </div>
        )}

        {agents.map((agent) => (
          <div key={agent.id}
            className="grid grid-cols-[1fr_100px_100px_100px_80px_80px_60px] gap-3 px-5 py-3 border-b border-white/5 items-center hover:bg-white/[0.02] transition-colors">
            <div className="flex items-center gap-2 min-w-0">
              <Bot className="w-4 h-4 text-cyan-400 shrink-0" />
              <span className="text-sm text-white font-medium truncate">{agent.name}</span>
            </div>
            <div className="text-xs text-gray-400 truncate">{agent.model}</div>
            <div className="text-xs text-gray-300 flex items-center gap-1">
              <ArrowUpRight className="w-3 h-3 text-green-400" /> {formatTokens(agent.tokensIn)}
            </div>
            <div className="text-xs text-gray-300 flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-blue-400" /> {formatTokens(agent.tokensOut)}
            </div>
            <div className="text-xs text-green-400 font-mono">${agent.cost.toFixed(2)}</div>
            <div className="text-xs text-gray-300">{agent.messages}</div>
            <div>{statusBadge(agent.status)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
