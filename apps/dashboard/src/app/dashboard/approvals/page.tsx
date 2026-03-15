"use client";
import React from "react";
import { CheckSquare, Clock, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";

const approvals = [
  { id: 1, title: "Deploy production build v2.4", agent: "Coder", status: "pending", priority: "high", ts: Date.now() - 300000 },
  { id: 2, title: "Install dependency: sharp@0.33", agent: "Assistant", status: "approved", priority: "medium", ts: Date.now() - 3600000 },
  { id: 3, title: "Delete old log files (>30 days)", agent: "Researcher", status: "pending", priority: "low", ts: Date.now() - 7200000 },
  { id: 4, title: "Run database migration #47", agent: "Coder", status: "rejected", priority: "high", ts: Date.now() - 86400000 },
  { id: 5, title: "Send newsletter to 5k subscribers", agent: "Writer", status: "pending", priority: "high", ts: Date.now() - 1800000 },
];

const statusConfig: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
  pending: { icon: <Clock className="w-4 h-4" />, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
  approved: { icon: <CheckCircle2 className="w-4 h-4" />, color: "text-green-400", bg: "bg-green-500/10 border-green-500/20" },
  rejected: { icon: <XCircle className="w-4 h-4" />, color: "text-red-400", bg: "bg-red-500/10 border-red-500/20" },
};

const priorityColors: Record<string, string> = {
  high: "text-red-400", medium: "text-amber-400", low: "text-gray-400",
};

export default function ApprovalsPage() {
  return (
    <div className="flex flex-col h-full animate-in fade-in duration-500 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2">
          <CheckSquare className="w-7 h-7 sm:w-8 sm:h-8 text-cyan-400" /> Approvals
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {approvals.filter((a) => a.status === "pending").length} pending review
        </p>
      </div>

      <div className="space-y-3">
        {approvals.map((a) => {
          const s = statusConfig[a.status];
          return (
            <div key={a.id} className="glass-panel p-5 border border-white/5 rounded-xl flex items-center justify-between hover:border-white/10 transition-all">
              <div className="flex items-center gap-4">
                <div className={`${s.color}`}>{s.icon}</div>
                <div>
                  <h3 className="text-sm font-semibold text-white">{a.title}</h3>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                    <span>by {a.agent}</span>
                    <span className={`font-bold uppercase ${priorityColors[a.priority]}`}>{a.priority}</span>
                    <span>{new Date(a.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                </div>
              </div>
              {a.status === "pending" && (
                <div className="flex gap-2">
                  <button className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-green-500/10 border border-green-500/20 text-green-400 hover:bg-green-500/20">Approve</button>
                  <button className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20">Reject</button>
                </div>
              )}
              {a.status !== "pending" && (
                <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase border ${s.bg} ${s.color}`}>{a.status}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
