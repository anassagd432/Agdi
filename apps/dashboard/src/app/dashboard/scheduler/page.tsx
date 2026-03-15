"use client";

import React, { useState } from "react";
import {
  Clock, Plus, Trash2, Play, Pause, Edit3, Save,
  Calendar, X, CheckCircle2, XCircle, Loader2,
} from "lucide-react";
import { toast } from "sonner";

/* ── Types ────────────────────────────────────────────────────────── */

interface CronJob {
  id: string; name: string; schedule: string; command: string;
  enabled: boolean; lastRun?: number; nextRun?: number;
  status: "idle" | "running" | "failed";
}

const STORAGE_KEY = "agdi-cron-jobs";

function loadJobs(): CronJob[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; }
}

function saveJobs(j: CronJob[]) { localStorage.setItem(STORAGE_KEY, JSON.stringify(j)); }

const presets = [
  { label: "Every minute", cron: "* * * * *" },
  { label: "Every 5 min", cron: "*/5 * * * *" },
  { label: "Every hour", cron: "0 * * * *" },
  { label: "Daily midnight", cron: "0 0 * * *" },
  { label: "Weekly Monday", cron: "0 0 * * 1" },
  { label: "Monthly 1st", cron: "0 0 1 * *" },
];

const defaultJobs: CronJob[] = [
  { id: "j1", name: "Metrics Collection", schedule: "*/5 * * * *", command: "agdi metrics collect", enabled: true, lastRun: Date.now() - 120000, nextRun: Date.now() + 180000, status: "idle" },
  { id: "j2", name: "Knowledge Sync", schedule: "0 * * * *", command: "agdi knowledge sync", enabled: true, lastRun: Date.now() - 1800000, nextRun: Date.now() + 1800000, status: "idle" },
  { id: "j3", name: "Daily Backup", schedule: "0 2 * * *", command: "agdi backup create", enabled: true, lastRun: Date.now() - 72000000, nextRun: Date.now() + 14400000, status: "idle" },
  { id: "j4", name: "Log Rotation", schedule: "0 0 * * *", command: "agdi logs rotate --keep 7", enabled: false, lastRun: Date.now() - 86400000, status: "idle" },
  { id: "j5", name: "Health Report", schedule: "0 0 * * 1", command: "agdi health report --email", enabled: true, lastRun: Date.now() - 432000000, nextRun: Date.now() + 172800000, status: "idle" },
];

/* ── Page ─────────────────────────────────────────────────────────── */

export default function SchedulerPage() {
  const [jobs, setJobs] = useState<CronJob[]>(() => {
    const saved = loadJobs();
    return saved.length > 0 ? saved : defaultJobs;
  });
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newSchedule, setNewSchedule] = useState("*/5 * * * *");
  const [newCommand, setNewCommand] = useState("");

  const create = () => {
    if (!newName.trim() || !newCommand.trim()) return toast.error("Name and command required.");
    const job: CronJob = {
      id: crypto.randomUUID(), name: newName.trim(),
      schedule: newSchedule, command: newCommand.trim(),
      enabled: true, status: "idle",
    };
    const next = [job, ...jobs];
    setJobs(next); saveJobs(next);
    setNewName(""); setNewCommand(""); setShowCreate(false);
    toast.success("Job created!");
  };

  const toggle = (id: string) => {
    const next = jobs.map((j) => j.id === id ? { ...j, enabled: !j.enabled } : j);
    setJobs(next); saveJobs(next);
  };

  const remove = (id: string) => {
    if (!confirm("Delete this scheduled job?")) return;
    const next = jobs.filter((j) => j.id !== id);
    setJobs(next); saveJobs(next);
    toast.success("Job deleted.");
  };

  const runNow = (id: string) => {
    setJobs((prev) => prev.map((j) => j.id === id ? { ...j, status: "running" } : j));
    setTimeout(() => {
      setJobs((prev) => {
        const next = prev.map((j) => j.id === id ? { ...j, status: "idle" as const, lastRun: Date.now() } : j);
        saveJobs(next); return next;
      });
      toast.success("Job completed.");
    }, 2000);
  };

  function timeFromNow(ts?: number): string {
    if (!ts) return "—";
    const d = Math.abs(ts - Date.now());
    if (d < 60000) return "< 1m";
    if (d < 3600000) return `${Math.floor(d / 60000)}m`;
    if (d < 86400000) return `${Math.floor(d / 3600000)}h`;
    return `${Math.floor(d / 86400000)}d`;
  }

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-500 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            <Calendar className="w-7 h-7 sm:w-8 sm:h-8 text-cyan-400" /> Scheduler
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">{jobs.filter((j) => j.enabled).length} active jobs</p>
        </div>
        <button onClick={() => setShowCreate(!showCreate)}
          className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 ${
            showCreate ? "bg-red-500/10 text-red-400 border border-red-500/20" : "bg-cyan-500 text-black hover:bg-cyan-400"}`}>
          {showCreate ? <><X className="w-4 h-4" /> Cancel</> : <><Plus className="w-4 h-4" /> New Job</>}
        </button>
      </div>

      {showCreate && (
        <div className="glass-panel p-5 border border-cyan-500/20 rounded-xl animate-in slide-in-from-top-4 duration-300 space-y-4">
          <input type="text" placeholder="Job name" value={newName} onChange={(e) => setNewName(e.target.value)}
            className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:border-cyan-500/50 focus:outline-none" />
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Schedule (cron)</p>
            <input type="text" value={newSchedule} onChange={(e) => setNewSchedule(e.target.value)}
              className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm font-mono focus:border-cyan-500/50 focus:outline-none mb-2" />
            <div className="flex flex-wrap gap-1.5">
              {presets.map((p) => (
                <button key={p.cron} onClick={() => setNewSchedule(p.cron)}
                  className={`px-2 py-1 rounded text-[10px] font-semibold border ${
                    newSchedule === p.cron ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" : "border-white/10 text-gray-500"}`}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <input type="text" placeholder="Command to execute" value={newCommand} onChange={(e) => setNewCommand(e.target.value)}
            className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm font-mono focus:border-cyan-500/50 focus:outline-none" />
          <button onClick={create}
            className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold px-5 py-2 rounded-lg text-sm">
            Create Job
          </button>
        </div>
      )}

      <div className="space-y-3 stagger-in">
        {jobs.map((job) => (
          <div key={job.id}
            className={`glass-panel p-5 border rounded-xl transition-all ${
              !job.enabled ? "opacity-50 border-white/5" : "border-white/5 hover:border-white/10"}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-2.5 h-2.5 rounded-full ${
                  job.status === "running" ? "bg-cyan-400 animate-pulse" :
                  job.status === "failed" ? "bg-red-500" :
                  job.enabled ? "bg-green-500" : "bg-gray-500"}`} />
                <div>
                  <h3 className="text-sm font-semibold text-white">{job.name}</h3>
                  <code className="text-[10px] text-gray-500 font-mono">{job.schedule}</code>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => runNow(job.id)} disabled={job.status === "running"}
                  className="p-1.5 rounded-lg border border-white/10 text-gray-400 hover:text-cyan-400 disabled:opacity-30" title="Run now">
                  {job.status === "running" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                </button>
                <button onClick={() => toggle(job.id)}
                  className={`w-9 h-5 rounded-full transition-all relative ${job.enabled ? "bg-cyan-500" : "bg-white/10"}`}>
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all ${job.enabled ? "left-[18px]" : "left-0.5"}`} />
                </button>
                <button onClick={() => remove(job.id)}
                  className="p-1.5 text-gray-500 hover:text-red-400">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <div className="mt-2 flex items-center gap-4 text-[10px] text-gray-600">
              <code className="text-gray-500">{job.command}</code>
              {job.lastRun && <span>Last: {timeFromNow(job.lastRun)} ago</span>}
              {job.nextRun && job.enabled && <span className="text-cyan-400/60">Next: in {timeFromNow(job.nextRun)}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
