"use client";

import React, { useState } from 'react';
import { Bot, Cpu, Database, Activity, Play, Pause, XCircle, Plus, Terminal, MessageSquare, Sparkles, X, Save } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

const mockAgents = [
  {
    id: "ag-core-01",
    name: "Primary Orchestrator",
    type: "Coordinator",
    status: "Active",
    task: "Monitoring Sub-Agents & Routing",
    cpu: "12%",
    ram: "1.2 GB",
    uptime: "3h 14m",
  },
  {
    id: "ag-code-04",
    name: "Frontend Refactor Bot",
    type: "Coder",
    status: "Busy",
    task: "Compiling Tailwind CSS / Next.js",
    cpu: "84%",
    ram: "3.4 GB",
    uptime: "45m",
  },
  {
    id: "ag-web-02",
    name: "Documentation Scraper",
    type: "Web automation",
    status: "Idle",
    task: "Waiting for next crawl cycle",
    cpu: "1%",
    ram: "450 MB",
    uptime: "2h 10m",
  }
];

export default function AgentsPage() {
  const [agents, setAgents] = useState(mockAgents);
  const [isCreating, setIsCreating] = useState(false);
  const [newAgentName, setNewAgentName] = useState("");
  const [newAgentTask, setNewAgentTask] = useState("");

  const handleSpawn = () => {
    if (!newAgentName || !newAgentTask) {
      toast.error('Agent Name and System Prompt are required.');
      return;
    }
    
    const newAgent = {
      id: `ag-custom-${Math.floor(Math.random() * 1000)}`,
      name: newAgentName,
      type: "Custom",
      status: "Idle",
      task: newAgentTask.substring(0, 40) + "...",
      cpu: "0%",
      ram: "100 MB",
      uptime: "0m",
    };
    
    setAgents([newAgent, ...agents]);
    setIsCreating(false);
    setNewAgentName('');
    setNewAgentTask('');
    toast.success(`${newAgentName} Initialized & Booted Successfully.`);
  };

  const handleKill = (id: string, name: string) => {
    setAgents(agents.filter(a => a.id !== id));
    toast.error(`Agent ${name} Terminated.`);
  };

  const handleLogs = (name: string) => {
    toast.info(`Fetching live logs for ${name}...`);
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
          className={`glass-button px-6 py-2.5 rounded-md font-medium flex items-center gap-2 transition-colors ${isCreating ? 'bg-cyan-500 text-black border-cyan-400' : ''}`}
        >
          {isCreating ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {isCreating ? 'Cancel Creation' : 'Spawn New Agent'}
        </button>
      </div>

      {isCreating && (
        <div className="glass-panel p-6 animate-in slide-in-from-top-4 duration-300 border-cyan-500/30 ring-1 ring-cyan-500/20">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/10">
            <div className="p-2 bg-cyan-500/20 text-cyan-400 rounded-lg">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">Initialize Sub-Agent</h2>
              <p className="text-sm text-muted-foreground">Define the boundaries and instructions for a new autonomous worker.</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium text-white/80">Agent Name / Designation</label>
                <input 
                  type="text" 
                  value={newAgentName}
                  onChange={(e) => setNewAgentName(e.target.value)}
                  placeholder="e.g., Database Migration Bot" 
                  className="glass bg-black/20 border-white/10 px-3 py-2 rounded-md outline-none focus:border-cyan-500/50 text-white" 
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium text-white/80">Core Intelligence (LLM)</label>
                <select className="glass bg-black/20 border-white/10 px-3 py-2 rounded-md outline-none focus:border-cyan-500/50 text-white appearance-none">
                  <option>Anthropic Claude 3.5 Sonnet</option>
                  <option>OpenAI GPT-4o</option>
                  <option>Google Gemini 1.5 Pro</option>
                  <option>Local Ollama (Llama 3)</option>
                </select>
              </div>
              <div className="grid gap-2 pt-2">
                <label className="text-sm font-medium text-white/80">Granted MCP Permissions</label>
                <div className="flex flex-wrap gap-2">
                  <span className="text-xs bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2 py-1 rounded">Filesystem (RW)</span>
                  <span className="text-xs bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2 py-1 rounded">Terminal (Restricted)</span>
                  <span className="text-xs bg-white/5 text-muted-foreground border border-white/10 px-2 py-1 rounded cursor-pointer hover:bg-white/10">Add +</span>
                </div>
              </div>
            </div>
            
            <div className="space-y-4 flex flex-col h-full">
              <div className="grid gap-2 flex-1">
                <label className="text-sm font-medium text-white/80 flex items-center gap-2">
                  System Instruction Prompt 
                  <span className="text-[10px] uppercase tracking-wider bg-white/10 text-muted-foreground px-1.5 rounded">Required</span>
                </label>
                <textarea 
                  value={newAgentTask}
                  onChange={(e) => setNewAgentTask(e.target.value)}
                  placeholder="You are an autonomous agent specialized in... Your primary directive is..." 
                  className="glass bg-black/20 border-white/10 px-3 py-3 rounded-md outline-none focus:border-cyan-500/50 text-white h-full min-h-[120px] resize-none font-mono text-sm leading-relaxed" 
                />
              </div>
            </div>
          </div>
          
          <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-white/10">
            <button onClick={() => setIsCreating(false)} className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-white transition-colors">
              Cancel
            </button>
            <button onClick={handleSpawn} className="glass-button bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 px-6 py-2 rounded-md text-sm font-medium flex items-center gap-2">
              <Play className="w-4 h-4" /> Initialize & Boot
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 mt-4">
        {agents.map((agent) => (
          <div key={agent.id} className="glass-panel p-6 flex flex-col hover:border-cyan-500/30 transition-all group">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-lg ${agent.status === 'Active' || agent.status === 'Busy' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-white/5 text-muted-foreground'}`}>
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
                <span className={`w-2 h-2 rounded-full ${agent.status === 'Busy' ? 'bg-amber-400 animate-pulse' : agent.status === 'Active' ? 'bg-cyan-400' : 'bg-zinc-500'}`} />
                <span className="text-xs font-medium text-muted-foreground uppercase">{agent.status}</span>
              </div>
            </div>

            <div className="space-y-4 mb-6 flex-1">
              <div>
                <p className="text-xs text-muted-foreground mb-1">CURRENT TASK</p>
                <p className="text-sm text-white font-medium">{agent.task}</p>
              </div>
              
              <div className="grid grid-cols-3 gap-2 py-3 border-y border-white/5">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Cpu className="w-3.5 h-3.5" /> CPU
                  </div>
                  <span className="text-sm font-semibold">{agent.cpu}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Database className="w-3.5 h-3.5" /> RAM
                  </div>
                  <span className="text-sm font-semibold">{agent.ram}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Activity className="w-3.5 h-3.5" /> UPTIME
                  </div>
                  <span className="text-sm font-semibold">{agent.uptime}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <Link href={`/dashboard/agents/${agent.id}`} className="flex-1 glass bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 py-2 rounded-md flex justify-center items-center gap-2 transition-colors text-sm font-medium border border-cyan-500/20">
                <MessageSquare className="w-4 h-4" />
                Chat
              </Link>
              <button onClick={() => handleLogs(agent.name)} className="flex-1 glass bg-black/20 hover:bg-white/10 hover:text-white text-muted-foreground py-2 rounded-md flex justify-center items-center gap-2 transition-colors text-sm font-medium">
                <Terminal className="w-4 h-4" />
                Logs
              </button>
              <button onClick={() => handleKill(agent.id, agent.name)} className="flex-1 glass bg-black/20 hover:bg-red-500/20 hover:text-red-400 text-muted-foreground py-2 rounded-md flex justify-center items-center gap-2 transition-colors text-sm font-medium group-hover:border-red-500/30">
                <XCircle className="w-4 h-4" />
                Kill
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
