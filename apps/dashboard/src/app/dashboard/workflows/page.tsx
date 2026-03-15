"use client";

import React, { useState } from "react";
import {
  Workflow, Play, Pause, Clock, CheckCircle2, XCircle, RefreshCw, Loader2,
} from "lucide-react";
import { toast } from "sonner";

interface WorkflowItem {
  id: string; name: string; active: boolean; lastRun?: number;
  status: "success" | "error" | "idle"; executions: number; nodes: number;
}

const mockWorkflows: WorkflowItem[] = [
  { id: "1", name: "Customer Onboarding", active: true, lastRun: Date.now() - 300000, status: "success", executions: 45, nodes: 8 },
  { id: "2", name: "Slack Alert Pipeline", active: true, lastRun: Date.now() - 60000, status: "success", executions: 128, nodes: 5 },
  { id: "3", name: "Data Sync (Hourly)", active: false, lastRun: Date.now() - 3600000, status: "error", executions: 22, nodes: 12 },
  { id: "4", name: "Report Generator", active: true, lastRun: Date.now() - 86400000, status: "success", executions: 7, nodes: 6 },
  { id: "5", name: "Ticket Triage Bot", active: false, status: "idle", executions: 0, nodes: 4 },
];

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState(mockWorkflows);

  const toggle = (id: string) => {
    setWorkflows((wf) => wf.map((w) => w.id === id ? { ...w, active: !w.active } : w));
    toast.success("Workflow toggled.");
  };

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-500 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2">
          <Workflow className="w-7 h-7 sm:w-8 sm:h-8 text-cyan-400" /> Workflows
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {workflows.filter((w) => w.active).length} active · Powered by n8n
        </p>
      </div>

      <div className="space-y-3">
        {workflows.map((wf) => (
          <div key={wf.id} className="glass-panel p-5 border border-white/5 rounded-xl flex items-center justify-between hover:border-white/10 transition-all">
            <div className="flex items-center gap-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${wf.active ? "bg-cyan-500/10" : "bg-white/5"}`}>
                <Workflow className={`w-5 h-5 ${wf.active ? "text-cyan-400" : "text-gray-500"}`} />
              </div>
              <div>
                <h3 className="font-semibold text-white text-sm">{wf.name}</h3>
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                  <span>{wf.nodes} nodes</span>
                  <span>{wf.executions} runs</span>
                  {wf.lastRun && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(wf.lastRun).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {wf.status === "success" && <CheckCircle2 className="w-4 h-4 text-green-400" />}
              {wf.status === "error" && <XCircle className="w-4 h-4 text-red-400" />}
              <button onClick={() => toggle(wf.id)}
                className={`p-2 rounded-lg border text-sm ${wf.active ? "border-amber-500/20 text-amber-400 hover:bg-amber-500/10" : "border-green-500/20 text-green-400 hover:bg-green-500/10"}`}>
                {wf.active ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </button>
              <button onClick={() => toast.info("Workflow execution requires n8n connection.")}
                className="p-2 rounded-lg border border-white/10 text-gray-400 hover:text-white">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
