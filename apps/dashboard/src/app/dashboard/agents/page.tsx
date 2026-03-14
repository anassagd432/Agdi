"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Bot, Cpu, Database, Activity, Play, Pause, XCircle, Plus,
  Terminal, MessageSquare, Sparkles, X, Loader2,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { agdi } from "@/lib/agdi-client";

interface AgentEntry {
  id: string;
  name: string;
  type: string;
  status: string;
  task: string;
  model?: string;
  uptime?: string;
}

interface ModelOption {
  id: string;
  name: string;
  provider?: string;
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<AgentEntry[]>([]);
  const [models, setModels] = useState<ModelOption[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newAgentName, setNewAgentName] = useState("");
  const [newAgentTask, setNewAgentTask] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [logsAgentId, setLogsAgentId] = useState<string | null>(null);
  const [logLines, setLogLines] = useState<string[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const fetchAgents = useCallback(async () => {
    try {
      const res = await agdi.call("agents.list");
      if (res && res.agents) {
        setAgents(
          (res.agents as any[]).map((a: any) => ({
            id: a.id,
            name: a.name || a.id,
            type: a.type || "Agent",
            status: a.state === "running" ? "Active" : a.state === "paused" ? "Paused" : "Idle",
            task: a.task || (a.state === "running" ? "Executing tasks…" : "Waiting for directives…"),
            model: a.model || a.modelProvider,
            uptime: a.uptime ? `${Math.round(a.uptime / 60)}m` : undefined,
          }))
        );
      } else {
        setAgents([]);
      }
    } catch (e) {
      console.warn("agents.list error:", e);
      setAgents([]);
    }
  }, []);

  const fetchModels = useCallback(async () => {
    try {
      const res = await agdi.call("models.list");
      if (res && Array.isArray(res.models)) {
        const opts: ModelOption[] = (res.models as any[]).map((m: any) => ({
          id: m.id ?? m.model ?? m.name,
          name: m.name ?? m.model ?? m.id,
          provider: m.provider,
        }));
        setModels(opts);
        if (opts.length > 0 && !selectedModel) setSelectedModel(opts[0].id);
      }
    } catch (e) {
      console.warn("models.list error:", e);
    }
  }, [selectedModel]);

  useEffect(() => {
    fetchAgents();
    fetchModels();
    const iv = setInterval(fetchAgents, 5000);
    return () => clearInterval(iv);
  }, [fetchAgents, fetchModels]);

  const handleSpawn = async () => {
    if (!newAgentName || !newAgentTask) {
      toast.error("Agent Name and System Prompt are required.");
      return;
    }
    toast.info(`Initializing ${newAgentName}…`);
    try {
      await agdi.call("agents.create", {
        name: newAgentName,
        task: newAgentTask,
        ...(selectedModel ? { model: selectedModel } : {}),
      });
      toast.success(`${newAgentName} booted successfully.`);
      setIsCreating(false);
      setNewAgentName("");
      setNewAgentTask("");
      fetchAgents();
    } catch (e: any) {
      toast.error(`Spawn failed: ${e.message || e}`);
    }
  };

  const handleAction = async (id: string, name: string, action: "start" | "stop" | "kill") => {
    toast.info(`Attempting to ${action} ${name}…`);
    try {
      if (action === "kill") {
        await agdi.call("agents.delete", { id });
      } else {
        await agdi.call(`agents.${action}` as any, { id });
      }
      toast.success(`Agent ${name} — ${action} command sent.`);
      fetchAgents();
    } catch (e: any) {
      toast.error(`Error: ${e.message || String(e)}`);
    }
  };

  const handleLogs = async (agentId: string, name: string) => {
    setLogsAgentId(agentId);
    setLoadingLogs(true);
    setLogLines([]);
    try {
      const key = `agent:${agentId}`;
      const res = await agdi.call("sessions.usage.logs", { key, limit: 40 });
      if (res && Array.isArray(res.logs)) {
        setLogLines(
          (res.logs as any[]).map((l: any) =>
            typeof l === "string" ? l : l.text ?? JSON.stringify(l)
          )
        );
      } else {
        setLogLines(["No log entries found for this agent."]);
      }
    } catch (e: any) {
      setLogLines([`Failed to fetch logs: ${e.message || e}`]);
    } finally {
      setLoadingLogs(false);
    }
  };

  return (
    <div className="space-y-6 flex flex-col h-full animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight text-white mb-1">Agent Fleet</h1>
          <p className="text-muted-foreground">Manage, monitor, and control your autonomous sub-agents.</p>
        </div>
        <button
          onClick={() => setIsCreating(!isCreating)}
          className={`glass-button px-6 py-2.5 rounded-md font-medium flex items-center gap-2 transition-colors ${isCreating ? "bg-cyan-500 text-black border-cyan-400" : ""}`}
        >
          {isCreating ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {isCreating ? "Cancel Creation" : "Spawn New Agent"}
        </button>
      </div>

      {/* Create Form */}
      {isCreating && (
        <div className="glass-panel p-6 animate-in slide-in-from-top-4 duration-300 border-cyan-500/30 ring-1 ring-cyan-500/20">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/10">
            <div className="p-2 bg-cyan-500/20 text-cyan-400 rounded-lg"><Sparkles className="w-5 h-5" /></div>
            <div>
              <h2 className="text-xl font-semibold text-white">Initialize Sub-Agent</h2>
              <p className="text-sm text-muted-foreground">Define boundaries and instructions for a new autonomous worker.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium text-white/80">Agent Name / Designation</label>
                <input type="text" value={newAgentName} onChange={(e) => setNewAgentName(e.target.value)} placeholder="e.g., Database Migration Bot" className="glass bg-black/20 border-white/10 px-3 py-2 rounded-md outline-none focus:border-cyan-500/50 text-white" />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium text-white/80">Core Intelligence (LLM)</label>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="glass bg-black/20 border-white/10 px-3 py-2 rounded-md outline-none focus:border-cyan-500/50 text-white appearance-none"
                >
                  {models.length === 0 && <option value="">Loading models…</option>}
                  {models.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.provider ? `${m.provider} — ${m.name}` : m.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-4 flex flex-col h-full">
              <div className="grid gap-2 flex-1">
                <label className="text-sm font-medium text-white/80 flex items-center gap-2">
                  System Instruction Prompt
                  <span className="text-[10px] uppercase tracking-wider bg-white/10 text-muted-foreground px-1.5 rounded">Required</span>
                </label>
                <textarea value={newAgentTask} onChange={(e) => setNewAgentTask(e.target.value)} placeholder="You are an autonomous agent specialized in…" className="glass bg-black/20 border-white/10 px-3 py-3 rounded-md outline-none focus:border-cyan-500/50 text-white h-full min-h-[120px] resize-none font-mono text-sm leading-relaxed" />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-white/10">
            <button onClick={() => setIsCreating(false)} className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-white transition-colors">Cancel</button>
            <button onClick={handleSpawn} className="glass-button bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 px-6 py-2 rounded-md text-sm font-medium flex items-center gap-2">
              <Play className="w-4 h-4" /> Initialize & Boot
            </button>
          </div>
        </div>
      )}

      {/* Log Drawer */}
      {logsAgentId && (
        <div className="glass-panel p-4 animate-in slide-in-from-top-2 duration-200 border-purple-500/20 ring-1 ring-purple-500/10 max-h-64 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Terminal className="w-4 h-4 text-purple-400" /> Logs — {logsAgentId}
            </h3>
            <button onClick={() => setLogsAgentId(null)} className="text-muted-foreground hover:text-white"><X className="w-4 h-4" /></button>
          </div>
          <div className="flex-1 overflow-y-auto bg-black/40 rounded p-3 font-mono text-xs text-gray-300 leading-relaxed">
            {loadingLogs ? (
              <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="w-3 h-3 animate-spin" /> Loading…</div>
            ) : (
              logLines.map((line, i) => <div key={i} className="py-0.5">{line}</div>)
            )}
          </div>
        </div>
      )}

      {/* Agent Cards or Empty State */}
      {agents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-gray-500 gap-3">
          <Bot className="w-12 h-12 opacity-20" />
          <p className="text-sm">No agents found. Spawn your first agent above.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 mt-4">
          {agents.map((agent) => (
            <div key={agent.id} className="glass-panel p-6 flex flex-col hover:border-cyan-500/30 transition-all group">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-lg ${agent.status === "Active" || agent.status === "Busy" ? "bg-cyan-500/20 text-cyan-400" : "bg-white/5 text-muted-foreground"}`}>
                    <Bot className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-white">{agent.name}</h3>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                      <span className="bg-white/10 px-2 py-0.5 rounded uppercase tracking-wider">{agent.type}</span>
                      <span>{agent.id}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${agent.status === "Active" ? "bg-cyan-400" : agent.status === "Busy" ? "bg-amber-400 animate-pulse" : "bg-zinc-500"}`} />
                  <span className="text-xs font-medium text-muted-foreground uppercase">{agent.status}</span>
                </div>
              </div>

              <div className="space-y-4 mb-6 flex-1">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">CURRENT TASK</p>
                  <p className="text-sm text-white font-medium truncate">{agent.task}</p>
                </div>
                {agent.model && (
                  <div className="text-xs text-muted-foreground">
                    Model: <span className="text-cyan-400/80">{agent.model}</span>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <div className="flex items-center gap-2">
                  <Link href={`/dashboard/agents/${agent.id}`} className="flex-1 glass bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 py-2 rounded-md flex justify-center items-center gap-2 transition-colors text-sm font-medium border border-cyan-500/20">
                    <MessageSquare className="w-4 h-4" /> Chat
                  </Link>
                  <button onClick={() => handleLogs(agent.id, agent.name)} className="flex-1 glass bg-black/20 hover:bg-white/10 hover:text-white text-muted-foreground py-2 rounded-md flex justify-center items-center gap-2 transition-colors text-sm font-medium">
                    <Terminal className="w-4 h-4" /> Logs
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  {agent.status === "Active" || agent.status === "Busy" ? (
                    <button onClick={() => handleAction(agent.id, agent.name, "stop")} className="flex-1 glass bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 py-2 rounded-md flex justify-center items-center gap-2 transition-colors text-sm font-medium border border-amber-500/20">
                      <Pause className="w-4 h-4" /> Stop
                    </button>
                  ) : (
                    <button onClick={() => handleAction(agent.id, agent.name, "start")} className="flex-1 glass bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 py-2 rounded-md flex justify-center items-center gap-2 transition-colors text-sm font-medium border border-emerald-500/20">
                      <Play className="w-4 h-4" /> Start
                    </button>
                  )}
                  <button onClick={() => handleAction(agent.id, agent.name, "kill")} className="flex-1 glass bg-black/20 hover:bg-red-500/20 hover:text-red-400 text-muted-foreground py-2 rounded-md flex justify-center items-center gap-2 transition-colors text-sm font-medium">
                    <XCircle className="w-4 h-4" /> Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
