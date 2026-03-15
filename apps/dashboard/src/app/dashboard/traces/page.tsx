"use client";

import React, { useState } from "react";
import { Activity, Search, Clock, Cpu, ArrowRight, CheckCircle2, XCircle, Loader2 } from "lucide-react";

interface Trace {
  id: string; agentId: string; agentName: string;
  operation: string; status: "success" | "error" | "pending";
  duration: number; tokens: number; ts: number;
  steps: { name: string; duration: number; status: "success" | "error" }[];
}

function mockTraces(): Trace[] {
  const ops = ["chat.message", "tool.execute", "agent.spawn", "knowledge.search", "workflow.trigger"];
  const agents = ["Coder", "Researcher", "Writer", "Assistant"];
  const stepNames = ["parse_input", "llm_call", "tool_exec", "format_output", "validate"];
  return Array.from({ length: 25 }, (_, i) => ({
    id: `trace-${i}`, agentId: `agent-${i % 4}`, agentName: agents[i % 4],
    operation: ops[i % ops.length],
    status: i % 7 === 0 ? "error" : "success",
    duration: 50 + Math.floor(Math.random() * 2000),
    tokens: Math.floor(Math.random() * 5000),
    ts: Date.now() - i * 60000 * Math.random() * 10,
    steps: Array.from({ length: 2 + Math.floor(Math.random() * 3) }, (_, j) => ({
      name: stepNames[j % stepNames.length], duration: 10 + Math.floor(Math.random() * 500),
      status: (i % 7 === 0 && j === 2) ? "error" as const : "success" as const,
    })),
  }));
}

const statusIcon: Record<string, React.ReactNode> = {
  success: <CheckCircle2 className="w-4 h-4 text-green-400" />,
  error: <XCircle className="w-4 h-4 text-red-400" />,
  pending: <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />,
};

export default function TracesPage() {
  const [traces] = useState(mockTraces);
  const [filter, setFilter] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = traces.filter((t) =>
    t.operation.includes(filter.toLowerCase()) || t.agentName.toLowerCase().includes(filter.toLowerCase()),
  );

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-500 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2">
          <Activity className="w-7 h-7 sm:w-8 sm:h-8 text-cyan-400" /> Traces
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">Request tracing and performance profiling</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input type="text" placeholder="Filter by operation or agent..." value={filter} onChange={(e) => setFilter(e.target.value)}
          className="w-full bg-black/20 border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white focus:border-cyan-500/50 focus:outline-none" />
      </div>

      <div className="glass-panel rounded-xl border border-white/5 overflow-hidden">
        {filtered.map((t) => (
          <div key={t.id}>
            <button onClick={() => setExpanded(expanded === t.id ? null : t.id)}
              className="w-full grid grid-cols-[24px_1fr_140px_80px_80px_80px] gap-3 px-5 py-3 border-b border-white/5 items-center hover:bg-white/[0.02] text-left">
              {statusIcon[t.status]}
              <div>
                <span className="text-sm text-white font-mono">{t.operation}</span>
                <span className="text-xs text-gray-500 ml-2">{t.agentName}</span>
              </div>
              <div className="text-xs text-gray-500">{new Date(t.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</div>
              <div className="text-xs text-gray-300 flex items-center gap-1"><Clock className="w-3 h-3" /> {t.duration}ms</div>
              <div className="text-xs text-gray-300 flex items-center gap-1"><Cpu className="w-3 h-3" /> {t.tokens}</div>
              <div className="text-xs text-gray-500">{t.steps.length} steps</div>
            </button>
            {expanded === t.id && (
              <div className="bg-black/30 px-8 py-3 border-b border-white/5 space-y-1">
                {t.steps.map((s, i) => (
                  <div key={i} className="flex items-center gap-3 text-xs">
                    {statusIcon[s.status]}
                    <span className="text-gray-400 font-mono w-32">{s.name}</span>
                    <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${s.status === "error" ? "bg-red-500/60" : "bg-cyan-500/60"}`}
                        style={{ width: `${Math.min(100, (s.duration / t.duration) * 100)}%` }} />
                    </div>
                    <span className="text-gray-500 w-16 text-right">{s.duration}ms</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
