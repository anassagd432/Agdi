"use client";

import React, { useState } from "react";
import {
  Archive, Download, Upload, Trash2, Clock, CheckCircle2,
  AlertTriangle, Loader2, HardDrive, Shield,
} from "lucide-react";
import { toast } from "sonner";

interface Backup {
  id: string; name: string; size: string;
  created: number; type: "full" | "config" | "data";
  status: "ready" | "creating" | "failed";
}

const defaultBackups: Backup[] = [
  { id: "b1", name: "Full Backup", size: "12.4 MB", created: Date.now() - 86400000 * 1, type: "full", status: "ready" },
  { id: "b2", name: "Config Only", size: "48 KB", created: Date.now() - 86400000 * 3, type: "config", status: "ready" },
  { id: "b3", name: "Full Backup", size: "11.8 MB", created: Date.now() - 86400000 * 7, type: "full", status: "ready" },
  { id: "b4", name: "Data Export", size: "3.2 MB", created: Date.now() - 86400000 * 14, type: "data", status: "ready" },
  { id: "b5", name: "Full Backup", size: "10.1 MB", created: Date.now() - 86400000 * 30, type: "full", status: "ready" },
];

const typeColors: Record<string, { bg: string; text: string }> = {
  full:   { bg: "bg-cyan-500/10 border-cyan-500/20", text: "text-cyan-400" },
  config: { bg: "bg-amber-500/10 border-amber-500/20", text: "text-amber-400" },
  data:   { bg: "bg-purple-500/10 border-purple-500/20", text: "text-purple-400" },
};

export default function BackupsPage() {
  const [backups, setBackups] = useState<Backup[]>(defaultBackups);
  const [creating, setCreating] = useState<string | null>(null);

  const createBackup = (type: Backup["type"]) => {
    setCreating(type);
    const newBackup: Backup = {
      id: crypto.randomUUID(),
      name: type === "full" ? "Full Backup" : type === "config" ? "Config Only" : "Data Export",
      size: type === "full" ? "12.8 MB" : type === "config" ? "52 KB" : "3.5 MB",
      created: Date.now(), type, status: "creating",
    };
    setBackups((prev) => [newBackup, ...prev]);

    setTimeout(() => {
      setBackups((prev) => prev.map((b) => b.id === newBackup.id ? { ...b, status: "ready" as const } : b));
      setCreating(null);
      toast.success(`${newBackup.name} created successfully!`);
    }, 3000);
  };

  const deleteBackup = (id: string) => {
    if (!confirm("Delete this backup permanently?")) return;
    setBackups((prev) => prev.filter((b) => b.id !== id));
    toast.success("Backup deleted.");
  };

  const downloadBackup = (backup: Backup) => {
    const data = JSON.stringify({ backup: backup.name, type: backup.type, created: new Date(backup.created).toISOString(), content: "simulated" }, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `agdi-backup-${backup.type}-${new Date(backup.created).toISOString().slice(0,10)}.json`;
    a.click(); URL.revokeObjectURL(url);
    toast.success("Download started.");
  };

  const totalSize = backups.reduce((sum, b) => {
    const m = b.size.match(/([\d.]+)\s*(KB|MB)/);
    if (!m) return sum;
    return sum + parseFloat(m[1]) * (m[2] === "MB" ? 1 : 0.001);
  }, 0);

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-500 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            <Archive className="w-7 h-7 sm:w-8 sm:h-8 text-cyan-400" /> Backups
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">{backups.length} backups · {totalSize.toFixed(1)} MB total</p>
        </div>
      </div>

      {/* Create buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {([
          { type: "full" as const, label: "Full Backup", desc: "All config, data, sessions, and knowledge", icon: <HardDrive className="w-5 h-5 text-cyan-400" /> },
          { type: "config" as const, label: "Config Only", desc: "Settings, API keys, and preferences", icon: <Shield className="w-5 h-5 text-amber-400" /> },
          { type: "data" as const, label: "Data Export", desc: "Agents, devices, sessions, and history", icon: <Archive className="w-5 h-5 text-purple-400" /> },
        ]).map((opt) => (
          <button key={opt.type} onClick={() => createBackup(opt.type)} disabled={creating !== null}
            className={`glass-panel p-4 border rounded-xl text-left hover:bg-white/[0.02] transition-all disabled:opacity-50 ${typeColors[opt.type].bg}`}>
            <div className="flex items-center gap-3">
              {opt.icon}
              <div>
                <p className="text-sm font-semibold text-white">{opt.label}</p>
                <p className="text-[10px] text-gray-500">{opt.desc}</p>
              </div>
              {creating === opt.type && <Loader2 className="w-4 h-4 animate-spin text-cyan-400 ml-auto" />}
            </div>
          </button>
        ))}
      </div>

      {/* Backup list */}
      <div className="space-y-2 stagger-in">
        {backups.map((b) => {
          const tc = typeColors[b.type];
          return (
            <div key={b.id} className="glass-panel p-4 border border-white/5 rounded-xl flex items-center justify-between hover:border-white/10 transition-all">
              <div className="flex items-center gap-4">
                <div className={`p-2 rounded-lg ${tc.bg}`}>
                  {b.status === "creating"
                    ? <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                    : <Archive className={`w-4 h-4 ${tc.text}`} />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white">{b.name}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border ${tc.bg} ${tc.text}`}>
                      {b.type}
                    </span>
                    {b.status === "creating" && <span className="text-[10px] text-cyan-400 animate-pulse">Creating...</span>}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 text-[10px] text-gray-600">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(b.created).toLocaleDateString()}</span>
                    <span>{b.size}</span>
                  </div>
                </div>
              </div>
              {b.status === "ready" && (
                <div className="flex items-center gap-1.5">
                  <button onClick={() => downloadBackup(b)}
                    className="p-2 rounded-lg border border-white/10 text-gray-400 hover:text-cyan-400" title="Download">
                    <Download className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => deleteBackup(b.id)}
                    className="p-2 rounded-lg border border-white/10 text-gray-400 hover:text-red-400" title="Delete">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Restore */}
      <div className="glass-panel p-5 border border-white/5 rounded-xl">
        <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
          <Upload className="w-4 h-4 text-cyan-400" /> Restore from Backup
        </h3>
        <p className="text-xs text-gray-500 mb-3">Upload a previously exported backup file to restore settings and data.</p>
        <button onClick={() => toast.info("Restore flow: select a .json backup file to restore.")}
          className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-gray-400 hover:text-white flex items-center gap-2">
          <Upload className="w-4 h-4" /> Choose Backup File
        </button>
      </div>
    </div>
  );
}
