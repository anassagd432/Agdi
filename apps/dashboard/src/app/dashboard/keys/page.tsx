"use client";

import React, { useState } from "react";
import {
  Key, Plus, Copy, Trash2, Eye, EyeOff, Clock,
  Shield, AlertTriangle, CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";

interface ApiKey {
  id: string; name: string; key: string;
  permissions: string[]; created: number;
  lastUsed?: number; active: boolean;
}

const STORAGE_KEY = "agdi-api-keys";

function loadKeys(): ApiKey[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; }
}
function saveKeys(k: ApiKey[]) { localStorage.setItem(STORAGE_KEY, JSON.stringify(k)); }

function generateApiKey(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  const seg = (n: number) => Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `agdi_${seg(8)}_${seg(16)}`;
}

const defaultKeys: ApiKey[] = [
  { id: "k1", name: "Production Deploy", key: "agdi_prod8key_a1b2c3d4e5f6g7h8", permissions: ["read", "write", "admin"], created: Date.now() - 86400000 * 30, lastUsed: Date.now() - 3600000, active: true },
  { id: "k2", name: "CI/CD Pipeline", key: "agdi_ci9dploy_x9y8z7w6v5u4t3s2", permissions: ["read", "write"], created: Date.now() - 86400000 * 14, lastUsed: Date.now() - 86400000, active: true },
  { id: "k3", name: "Read-Only Monitor", key: "agdi_mon1tor_q1w2e3r4t5y6u7i8", permissions: ["read"], created: Date.now() - 86400000 * 7, lastUsed: Date.now() - 7200000, active: true },
  { id: "k4", name: "Legacy Key (deprecated)", key: "agdi_old0key_m1n2o3p4q5r6s7t8", permissions: ["read"], created: Date.now() - 86400000 * 90, active: false },
];

const allPerms = ["read", "write", "admin", "agents", "devices", "webhooks"];

const permColors: Record<string, string> = {
  read: "bg-green-500/10 text-green-400 border-green-500/20",
  write: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  admin: "bg-red-500/10 text-red-400 border-red-500/20",
  agents: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  devices: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  webhooks: "bg-amber-500/10 text-amber-400 border-amber-500/20",
};

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>(() => {
    const saved = loadKeys();
    return saved.length > 0 ? saved : defaultKeys;
  });
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPerms, setNewPerms] = useState<Set<string>>(new Set(["read"]));

  const create = () => {
    if (!newName.trim()) return toast.error("Key name is required.");
    const key: ApiKey = {
      id: crypto.randomUUID(), name: newName.trim(),
      key: generateApiKey(), permissions: [...newPerms],
      created: Date.now(), active: true,
    };
    const next = [key, ...keys];
    setKeys(next); saveKeys(next);
    setNewName(""); setNewPerms(new Set(["read"])); setShowCreate(false);
    setRevealed(new Set([key.id]));
    toast.success("API key created! Copy it now — it won't be shown again.");
  };

  const deleteKey = (id: string) => {
    if (!confirm("Permanently revoke this API key?")) return;
    const next = keys.filter((k) => k.id !== id);
    setKeys(next); saveKeys(next);
    toast.success("Key revoked.");
  };

  const toggleActive = (id: string) => {
    const next = keys.map((k) => k.id === id ? { ...k, active: !k.active } : k);
    setKeys(next); saveKeys(next);
  };

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    toast.success("API key copied!");
  };

  function timeAgo(ts?: number): string {
    if (!ts) return "Never";
    const d = Date.now() - ts;
    if (d < 3600000) return `${Math.floor(d / 60000)}m ago`;
    if (d < 86400000) return `${Math.floor(d / 3600000)}h ago`;
    return `${Math.floor(d / 86400000)}d ago`;
  }

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-500 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            <Key className="w-7 h-7 sm:w-8 sm:h-8 text-cyan-400" /> API Keys
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">{keys.filter((k) => k.active).length} active keys</p>
        </div>
        <button onClick={() => setShowCreate(!showCreate)}
          className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 ${
            showCreate ? "bg-red-500/10 text-red-400 border border-red-500/20" : "bg-cyan-500 text-black hover:bg-cyan-400"}`}>
          {showCreate ? "Cancel" : <><Plus className="w-4 h-4" /> Generate Key</>}
        </button>
      </div>

      {showCreate && (
        <div className="glass-panel p-5 border border-cyan-500/20 rounded-xl animate-in slide-in-from-top-4 duration-300 space-y-4">
          <input type="text" placeholder="Key name (e.g. Production, CI/CD)" value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:border-cyan-500/50 focus:outline-none" />
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Permissions</p>
            <div className="flex flex-wrap gap-2">
              {allPerms.map((p) => (
                <button key={p} onClick={() => {
                  const next = new Set(newPerms);
                  if (next.has(p)) next.delete(p); else next.add(p);
                  setNewPerms(next);
                }}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold border capitalize ${
                    newPerms.has(p) ? permColors[p] : "border-white/10 text-gray-600"}`}>
                  {p}
                </button>
              ))}
            </div>
          </div>
          <button onClick={create} className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold px-5 py-2 rounded-lg text-sm">
            Generate
          </button>
        </div>
      )}

      <div className="space-y-3 stagger-in">
        {keys.map((k) => (
          <div key={k.id}
            className={`glass-panel p-5 border rounded-xl transition-all ${
              !k.active ? "opacity-50 border-white/5" : "border-white/5 hover:border-white/10"}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={`w-2.5 h-2.5 rounded-full ${k.active ? "bg-green-500" : "bg-gray-600"}`} />
                <h3 className="text-sm font-semibold text-white">{k.name}</h3>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => toggleActive(k.id)}
                  className={`w-9 h-5 rounded-full transition-all relative ${k.active ? "bg-cyan-500" : "bg-white/10"}`}>
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all ${k.active ? "left-[18px]" : "left-0.5"}`} />
                </button>
                <button onClick={() => deleteKey(k.id)} className="p-1.5 text-gray-500 hover:text-red-400">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-black/20 rounded-lg px-3 py-2 mb-3">
              <code className="flex-1 text-xs text-gray-400 font-mono">
                {revealed.has(k.id) ? k.key : `${k.key.slice(0, 10)}${"•".repeat(20)}`}
              </code>
              <button onClick={() => { const n = new Set(revealed); if (n.has(k.id)) n.delete(k.id); else n.add(k.id); setRevealed(n); }}
                className="p-1 text-gray-500 hover:text-white">
                {revealed.has(k.id) ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
              <button onClick={() => copyKey(k.key)} className="p-1 text-gray-500 hover:text-cyan-400">
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex gap-1.5">
                {k.permissions.map((p) => (
                  <span key={p} className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border ${permColors[p] || "border-white/10 text-gray-500"}`}>
                    {p}
                  </span>
                ))}
              </div>
              <div className="flex gap-3 text-[10px] text-gray-600">
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Created {timeAgo(k.created)}</span>
                {k.lastUsed && <span>Last used {timeAgo(k.lastUsed)}</span>}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 text-xs text-gray-600">
        <AlertTriangle className="w-4 h-4 text-amber-400" />
        <span>API keys are shown once at creation. Store them securely.</span>
      </div>
    </div>
  );
}
