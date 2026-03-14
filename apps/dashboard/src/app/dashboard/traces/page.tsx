"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Activity, Clock, Database, ChevronRight, ChevronDown,
  CheckCircle2, XCircle, AlertCircle, Terminal, Command, RefreshCw, Download,
} from "lucide-react";
import { agdi } from "@/lib/agdi-client";
import { downloadCSV, exportFilename } from "@/lib/export";

interface TraceLog {
  id: string;
  type: "agent" | "llm" | "tool";
  name: string;
  latencyMs: number;
  tokens?: { prompt: number; completion: number };
  status: "success" | "error" | "pending";
  timestamp: string;
  input: string;
  output?: string;
  children?: TraceLog[];
}

export default function TracesPage() {
  const [traces, setTraces] = useState<TraceLog[]>([]);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const toggleNode = (id: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const fetchTraces = useCallback(async () => {
    try {
      const res = await agdi.call("memory.messages.list", { limit: 20 });
      if (res && res.messages) {
        const mapped: TraceLog[] = (res.messages as any[]).map((m: any, idx: number) => ({
          id: `trace-${m.id || idx}`,
          type: m.role === "tool" ? "tool" : m.role === "assistant" ? "llm" : "agent",
          name: m.name || (m.role === "tool" ? "Tool Call" : `Message: ${m.role}`),
          latencyMs: m.metrics?.latency ?? 0,
          status: "success",
          timestamp: new Date(m.timestamp || Date.now()).toISOString().split("T")[1]?.slice(0, 12) ?? "",
          input: m.content || JSON.stringify(m.tool_calls || []),
          tokens: m.metrics?.tokens
            ? { prompt: m.metrics.tokens.prompt || 0, completion: m.metrics.tokens.completion || 0 }
            : undefined,
          output: undefined,
          children: [],
        }));
        setTraces(mapped);
        // Auto-expand the first trace if any
        if (mapped.length > 0) {
          setExpandedNodes((prev) => {
            const next = new Set(Array.from(prev));
            next.add(mapped[0].id);
            return next;
          });
        }
      } else {
        setTraces([]);
      }
    } catch (e) {
      console.warn("memory.messages.list error:", e);
      setTraces([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTraces();
    const iv = setInterval(fetchTraces, 8000);
    return () => clearInterval(iv);
  }, [fetchTraces]);

  const getIcon = (type: string, status: string) => {
    if (status === "error") return <XCircle className="w-4 h-4 text-red-500" />;
    switch (type) {
      case "agent": return <Activity className="w-4 h-4 text-purple-400" />;
      case "llm": return <Database className="w-4 h-4 text-blue-400" />;
      case "tool": return <Command className="w-4 h-4 text-emerald-400" />;
      default: return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
    }
  };

  const renderTraceNode = (node: TraceLog, depth = 0) => {
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.children && node.children.length > 0;

    return (
      <div key={node.id} className="font-mono text-sm">
        <div
          className={`flex items-center gap-3 py-2 px-4 hover:bg-white/5 cursor-pointer border-b border-white/5 transition-colors ${depth === 0 ? "bg-black/20" : ""}`}
          style={{ paddingLeft: `${depth * 24 + 16}px` }}
          onClick={() => toggleNode(node.id)}
        >
          {hasChildren ? (
            isExpanded ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />
          ) : (
            <div className="w-4" />
          )}

          {getIcon(node.type, node.status)}

          <span className={`font-semibold truncate ${node.status === "error" ? "text-red-400" : "text-gray-200"}`}>
            {node.name}
          </span>

          <span className="text-xs text-gray-500 uppercase tracking-widest bg-white/5 px-2 py-0.5 rounded ml-2 flex-shrink-0">
            {node.type}
          </span>

          <div className="ml-auto flex items-center gap-6 text-xs text-gray-400 flex-shrink-0">
            {node.tokens && (
              <span className="flex items-center gap-1" title="Tokens (Prompt / Completion)">
                <Terminal className="w-3.5 h-3.5" />
                {node.tokens.prompt} / {node.tokens.completion}
              </span>
            )}
            {node.latencyMs > 0 && (
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {(node.latencyMs / 1000).toFixed(2)}s
              </span>
            )}
            <span className="text-gray-600">{node.timestamp}</span>
          </div>
        </div>

        {isExpanded && hasChildren && (
          <div className="border-l border-white/10 ml-[22px]">
            {node.children!.map((child) => renderTraceNode(child, depth + 1))}
          </div>
        )}

        {isExpanded && !hasChildren && node.input && (
          <div
            className="p-4 bg-black/40 border-b border-white/5 text-xs text-gray-300"
            style={{ paddingLeft: `${depth * 24 + 48}px` }}
          >
            <div className="text-gray-500 mb-1 uppercase tracking-wider font-semibold">Content</div>
            <div className="whitespace-pre-wrap break-all bg-black/50 p-2 rounded border border-white/5 font-mono max-h-40 overflow-y-auto">
              {node.input}
            </div>
            {node.output && (
              <div className="mt-3">
                <div className="text-gray-500 mb-1 uppercase tracking-wider font-semibold">Output</div>
                <div className={`whitespace-pre-wrap break-all bg-black/50 p-2 rounded border border-white/5 font-mono max-h-40 overflow-y-auto ${node.status === "error" ? "text-red-300 border-red-500/30" : ""}`}>
                  {node.output}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] animate-in fade-in duration-500 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            <Activity className="w-8 h-8 text-cyan-400" /> Execution Traces
          </h1>
          <p className="text-muted-foreground mt-2">
            Observe message history, LLM prompts, tool invocations, and latencies.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => downloadCSV(
              traces.map((t) => ({
                name: t.name,
                type: t.type,
                status: t.status,
                tokens: (t.tokens?.prompt ?? 0) + (t.tokens?.completion ?? 0),
                latencyMs: t.latencyMs,
                timestamp: t.timestamp,
                input: t.input,
              })),
              exportFilename("traces"),
              [
                { key: "name", label: "Name" },
                { key: "type", label: "Type" },
                { key: "status", label: "Status" },
                { key: "tokens", label: "Total Tokens" },
                { key: "latencyMs", label: "Latency (ms)" },
                { key: "timestamp", label: "Timestamp" },
                { key: "input", label: "Input" },
              ],
            )}
            disabled={traces.length === 0}
            className="bg-white/5 hover:bg-white/10 text-white border border-white/10 text-sm font-medium py-2 px-4 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-30"
          >
            <Download className="w-4 h-4" /> Export
          </button>
          <button
            onClick={() => { setLoading(true); fetchTraces(); }}
            className="bg-white/5 hover:bg-white/10 text-white border border-white/10 text-sm font-medium py-2 px-4 rounded-lg flex items-center gap-2 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>
      </div>

      {/* Waterfall Trace View */}
      <div className="glass-panel rounded-xl border border-white/10 flex-1 overflow-hidden flex flex-col">
        {/* Table Header */}
        <div className="flex items-center gap-3 py-3 px-4 border-b border-white/10 bg-black/60 text-xs font-semibold text-gray-400 uppercase tracking-widest pl-10">
          <div className="flex-1">Trace Step</div>
          <div className="w-24 text-right">Tokens</div>
          <div className="w-24 text-right">Latency</div>
          <div className="w-24 text-right">Time</div>
        </div>

        {/* Tree Content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden pb-4">
          {traces.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-24 text-gray-500 gap-3">
              <AlertCircle className="w-10 h-10 opacity-20" />
              <p className="text-sm">No trace data available yet.</p>
              <p className="text-xs text-gray-600">Send a message to an agent and traces will appear here.</p>
            </div>
          ) : (
            traces.map((trace) => renderTraceNode(trace, 0))
          )}
        </div>
      </div>
    </div>
  );
}
