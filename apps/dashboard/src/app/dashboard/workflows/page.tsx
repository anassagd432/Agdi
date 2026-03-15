"use client";

import React, { useState } from "react";
import {
  Workflow, Play, Pause, Clock, CheckCircle2, XCircle, RefreshCw,
  Plus, Trash2, Edit3,
} from "lucide-react";
import { toast } from "sonner";

interface WorkflowItem {
  id: string; name: string; active: boolean; lastRun?: number;
  status: "success" | "error" | "idle"; executions: number; nodes: number;
  description?: string;
}

const mockWorkflows: WorkflowItem[] = [
  { id: "1", name: "Customer Onboarding", description: "Automated user welcome flow with email + Slack", active: true, lastRun: Date.now() - 300000, status: "success", executions: 45, nodes: 8 },
  { id: "2", name: "Slack Alert Pipeline", description: "Forward critical alerts to #ops channel", active: true, lastRun: Date.now() - 60000, status: "success", executions: 128, nodes: 5 },
  { id: "3", name: "Data Sync (Hourly)", description: "Sync data between Supabase and analytics", active: false, lastRun: Date.now() - 3600000, status: "error", executions: 22, nodes: 12 },
  { id: "4", name: "Report Generator", description: "Weekly performance report via email", active: true, lastRun: Date.now() - 86400000, status: "success", executions: 7, nodes: 6 },
  { id: "5", name: "Ticket Triage Bot", description: "Auto-classify and route support tickets", active: false, status: "idle", executions: 0, nodes: 4 },
];

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState(mockWorkflows);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");

  const toggle = (id: string) => {
    setWorkflows((wf) => wf.map((w) => w.id === id ? { ...w, active: !w.active } : w));
    const wf = workflows.find((w) => w.id === id);
    toast.success(`${wf?.name} ${wf?.active ? "paused" : "activated"}.`);
  };

  const run = (id: string) => {
    setWorkflows((wf) => wf.map((w) => w.id === id ? { ...w, lastRun: Date.now(), executions: w.executions + 1, status: "success" as const } : w));
    toast.success("Workflow executed successfully.");
  };

  const deleteWf = (id: string) => {
    if (!confirm("Delete this workflow?")) return;
    setWorkflows((wf) => wf.filter((w) => w.id !== id));
    toast.success("Workflow deleted.");
  };

  const create = () => {
    if (!newName.trim()) return toast.error("Workflow name is required.");
    const wf: WorkflowItem = {
      id: crypto.randomUUID(), name: newName.trim(), description: newDesc.trim() || undefined,
      active: false, status: "idle", executions: 0, nodes: 1,
    };
    setWorkflows((prev) => [wf, ...prev]);
    setNewName(""); setNewDesc(""); setShowCreate(false);
    toast.success(`Workflow "${wf.name}" created.`);
  };

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-500 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            <Workflow className="w-7 h-7 sm:w-8 sm:h-8 text-cyan-400" /> Workflows
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {workflows.filter((w) => w.active).length} active · Powered by n8n
          </p>
        </div>
        <button onClick={() => setShowCreate(!showCreate)}
          className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 ${
            showCreate ? "bg-red-500/10 text-red-400 border border-red-500/20" : "bg-cyan-500 text-black hover:bg-cyan-400"}`}>
          {showCreate ? "Cancel" : <><Plus className="w-4 h-4" /> Create Workflow</>}
        </button>
      </div>

      {showCreate && (
        <div className="glass-panel p-5 border border-cyan-500/20 rounded-xl animate-in slide-in-from-top-4 duration-300 space-y-3">
          <input type="text" placeholder="Workflow name" value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:border-cyan-500/50 focus:outline-none" />
          <input type="text" placeholder="Description (optional)" value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:border-cyan-500/50 focus:outline-none" />
          <button onClick={create} className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold px-5 py-2 rounded-lg text-sm flex items-center gap-2">
            <Plus className="w-4 h-4" /> Create
          </button>
        </div>
      )}

      <div className="space-y-3">
        {workflows.map((wf) => (
          <div key={wf.id} className="glass-panel p-5 border border-white/5 rounded-xl flex items-center justify-between hover:border-white/10 transition-all">
            <div className="flex items-center gap-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${wf.active ? "bg-cyan-500/10" : "bg-white/5"}`}>
                <Workflow className={`w-5 h-5 ${wf.active ? "text-cyan-400" : "text-gray-500"}`} />
              </div>
              <div>
                <h3 className="font-semibold text-white text-sm">{wf.name}</h3>
                {wf.description && <p className="text-[11px] text-gray-500 mt-0.5">{wf.description}</p>}
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                  <span>{wf.nodes} nodes</span>
                  <span>{wf.executions} runs</span>
                  {wf.lastRun && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(wf.lastRun).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {wf.status === "success" && <CheckCircle2 className="w-4 h-4 text-green-400" />}
              {wf.status === "error" && <XCircle className="w-4 h-4 text-red-400" />}
              <button onClick={() => toggle(wf.id)}
                className={`p-2 rounded-lg border text-sm ${wf.active ? "border-amber-500/20 text-amber-400 hover:bg-amber-500/10" : "border-green-500/20 text-green-400 hover:bg-green-500/10"}`}>
                {wf.active ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </button>
              <button onClick={() => run(wf.id)} title="Run now"
                className="p-2 rounded-lg border border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/10">
                <RefreshCw className="w-4 h-4" />
              </button>
              <button onClick={() => deleteWf(wf.id)} title="Delete"
                className="p-2 rounded-lg border border-white/10 text-gray-500 hover:text-red-400 hover:border-red-500/20">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
