"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Bot, Plus, Search, Loader2, MessageSquare, Cpu, Power, Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { agdi } from "@/lib/agdi-client";

interface Agent {
  id: string;
  name: string;
  model: string;
  status: "running" | "idle" | "stopped";
  systemPrompt?: string;
  messages: number;
  createdAt: number;
}

const statusColors: Record<string, string> = {
  running: "bg-green-500", idle: "bg-amber-500", stopped: "bg-gray-500",
};

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newAgent, setNewAgent] = useState({ name: "", model: "claude-4-opus", systemPrompt: "" });

  useEffect(() => {
    const load = async () => {
      const raw = (await agdi.getAgents()) as Record<string, unknown>[];
      setAgents(raw.map((a, i) => ({
        id: String(a.id || i), name: String(a.name || `Agent ${i + 1}`),
        model: String(a.model || "claude-4-opus"),
        status: (a.status as Agent["status"]) || "idle",
        systemPrompt: a.systemPrompt ? String(a.systemPrompt) : undefined,
        messages: Number(a.messages || 0), createdAt: Number(a.createdAt || Date.now()),
      })));
      setLoading(false);
    };
    load();
  }, []);

  const filtered = agents.filter((a) =>
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    a.model.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-500 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            <Bot className="w-7 h-7 sm:w-8 sm:h-8 text-cyan-400" /> Agents
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">{agents.length} agents configured</p>
        </div>
        <button onClick={() => setShowCreate(!showCreate)}
          className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 ${
            showCreate ? "bg-red-500/10 text-red-400 border border-red-500/20" : "bg-cyan-500 text-black hover:bg-cyan-400"}`}>
          {showCreate ? "Cancel" : <><Plus className="w-4 h-4" /> Spawn Agent</>}
        </button>
      </div>

      {showCreate && (
        <div className="glass-panel p-5 border-cyan-500/30 ring-1 ring-cyan-500/20 animate-in slide-in-from-top-4 duration-300 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input type="text" placeholder="Agent name" value={newAgent.name}
              onChange={(e) => setNewAgent({ ...newAgent, name: e.target.value })}
              className="bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-cyan-500/50 focus:outline-none" />
            <select value={newAgent.model} onChange={(e) => setNewAgent({ ...newAgent, model: e.target.value })}
              className="bg-[#0a0e17] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-cyan-500/50 focus:outline-none appearance-none cursor-pointer">
              <option value="claude-4-opus" className="bg-[#0a0e17] text-white">Claude 4 Opus</option>
              <option value="claude-3.7-sonnet" className="bg-[#0a0e17] text-white">Claude 3.7 Sonnet</option>
              <option value="gpt-5" className="bg-[#0a0e17] text-white">GPT-5</option>
              <option value="gpt-4.1" className="bg-[#0a0e17] text-white">GPT-4.1</option>
              <option value="gemini-2.5-pro" className="bg-[#0a0e17] text-white">Gemini 2.5 Pro</option>
              <option value="grok-3" className="bg-[#0a0e17] text-white">Grok 3</option>
              <option value="deepseek-r1" className="bg-[#0a0e17] text-white">DeepSeek R1</option>
              <option value="llama-4-maverick" className="bg-[#0a0e17] text-white">Llama 4 Maverick</option>
            </select>
          </div>
          <textarea placeholder="System prompt (optional)..." rows={3} value={newAgent.systemPrompt}
            onChange={(e) => setNewAgent({ ...newAgent, systemPrompt: e.target.value })}
            className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-cyan-500/50 focus:outline-none resize-none" />
          <button onClick={() => toast.info("Agent spawning requires a running gateway.")}
            className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold px-5 py-2 rounded-lg text-sm flex items-center gap-2">
            <Power className="w-4 h-4" /> Spawn Agent
          </button>
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input type="text" placeholder="Search agents..." value={search} onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-black/20 border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-white text-sm focus:border-cyan-500/50 focus:outline-none" />
      </div>

      {loading && <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 text-cyan-400 animate-spin" /></div>}

      {!loading && filtered.length === 0 && (
        <div className="text-center py-16 space-y-3">
          <Bot className="w-12 h-12 text-gray-600 mx-auto" />
          <p className="text-muted-foreground">{search ? "No matching agents" : "No agents yet. Spawn one to get started."}</p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((agent) => (
          <Link key={agent.id} href={`/dashboard/agents/${agent.id}`}
            className="glass-panel p-5 border border-white/5 rounded-xl hover:border-cyan-500/20 hover:shadow-[0_0_30px_rgba(6,182,212,0.05)] transition-all group">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-cyan-400/20 to-blue-600/20 rounded-xl flex items-center justify-center group-hover:from-cyan-400/30 group-hover:to-blue-600/30 transition-colors">
                  <Bot className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white text-sm">{agent.name}</h3>
                  <p className="text-xs text-gray-500">{agent.model}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${statusColors[agent.status]}`} />
                <span className="text-[10px] text-gray-400 uppercase font-semibold">{agent.status}</span>
              </div>
            </div>
            {agent.systemPrompt && (
              <p className="text-xs text-gray-500 mb-3 line-clamp-2">{agent.systemPrompt}</p>
            )}
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" /> {agent.messages} msgs</span>
              <span className="flex items-center gap-1"><Cpu className="w-3 h-3" /> {agent.model.split("-").pop()}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
