"use client";

import React, { useState } from "react";
import {
  Variable, Eye, EyeOff, Copy, Plus, Trash2, Save,
  Lock, AlertTriangle, Search,
} from "lucide-react";
import { toast } from "sonner";

interface EnvVar {
  key: string; value: string; secret: boolean;
  source: "config" | "env" | "custom";
}

const defaultVars: EnvVar[] = [
  { key: "AGDI_GATEWAY_PORT", value: "18789", secret: false, source: "config" },
  { key: "AGDI_GATEWAY_MODE", value: "local", secret: false, source: "config" },
  { key: "AGDI_LOG_LEVEL", value: "info", secret: false, source: "config" },
  { key: "OPENAI_API_KEY", value: "sk-proj-xxxxxxxxxxxxx", secret: true, source: "env" },
  { key: "ANTHROPIC_API_KEY", value: "sk-ant-xxxxxxxxxxxxx", secret: true, source: "env" },
  { key: "DISCORD_BOT_TOKEN", value: "MTIx...", secret: true, source: "env" },
  { key: "AGDI_DATA_DIR", value: "~/.agdi", secret: false, source: "config" },
  { key: "NODE_ENV", value: "production", secret: false, source: "env" },
  { key: "AGDI_TELEMETRY", value: "false", secret: false, source: "config" },
  { key: "AGDI_AUTO_UPDATE", value: "true", secret: false, source: "config" },
];

const sourceColors: Record<string, string> = {
  config: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  env: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  custom: "bg-purple-500/10 text-purple-400 border-purple-500/20",
};

export default function EnvironmentPage() {
  const [vars, setVars] = useState<EnvVar[]>(defaultVars);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [newVal, setNewVal] = useState("");
  const [newSecret, setNewSecret] = useState(false);

  const filtered = vars.filter((v) =>
    v.key.toLowerCase().includes(search.toLowerCase()) ||
    (!v.secret && v.value.toLowerCase().includes(search.toLowerCase())),
  );

  const toggleReveal = (key: string) => {
    setRevealed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const copyValue = (v: EnvVar) => {
    navigator.clipboard.writeText(v.value);
    toast.success(`Copied ${v.key}`);
  };

  const addVar = () => {
    if (!newKey.trim()) return toast.error("Key is required.");
    if (vars.some((v) => v.key === newKey.trim())) return toast.error("Key already exists.");
    setVars((prev) => [...prev, { key: newKey.trim(), value: newVal, secret: newSecret, source: "custom" }]);
    setNewKey(""); setNewVal(""); setNewSecret(false); setShowAdd(false);
    toast.success("Variable added.");
  };

  const deleteVar = (key: string) => {
    const v = vars.find((v) => v.key === key);
    if (v?.source !== "custom") return toast.error("Can only delete custom variables.");
    setVars((prev) => prev.filter((v) => v.key !== key));
    toast.success("Variable removed.");
  };

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-500 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            <Variable className="w-7 h-7 sm:w-8 sm:h-8 text-cyan-400" /> Environment
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {vars.length} variables · {vars.filter((v) => v.secret).length} secrets
          </p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)}
          className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 ${
            showAdd ? "bg-red-500/10 text-red-400 border border-red-500/20" : "bg-cyan-500 text-black hover:bg-cyan-400"}`}>
          {showAdd ? "Cancel" : <><Plus className="w-4 h-4" /> Add Variable</>}
        </button>
      </div>

      {showAdd && (
        <div className="glass-panel p-5 border border-cyan-500/20 rounded-xl animate-in slide-in-from-top-4 duration-300 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input type="text" placeholder="KEY_NAME" value={newKey} onChange={(e) => setNewKey(e.target.value.toUpperCase())}
              className="bg-black/20 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm font-mono focus:border-cyan-500/50 focus:outline-none" />
            <input type="text" placeholder="value" value={newVal} onChange={(e) => setNewVal(e.target.value)}
              className="bg-black/20 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm font-mono focus:border-cyan-500/50 focus:outline-none" />
          </div>
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
              <input type="checkbox" checked={newSecret} onChange={() => setNewSecret(!newSecret)}
                className="rounded border-white/10" />
              <Lock className="w-3 h-3" /> Mark as secret
            </label>
            <button onClick={addVar} className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold px-5 py-2 rounded-lg text-sm">
              Add
            </button>
          </div>
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input type="text" placeholder="Search variables..." value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-black/20 border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white focus:border-cyan-500/50 focus:outline-none" />
      </div>

      <div className="glass-panel rounded-xl border border-white/5 overflow-hidden">
        <div className="grid grid-cols-[200px_1fr_80px_60px] gap-2 px-4 py-2.5 border-b border-white/10 bg-black/40 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
          <div>Key</div><div>Value</div><div>Source</div><div></div>
        </div>
        {filtered.map((v) => (
          <div key={v.key} className="grid grid-cols-[200px_1fr_80px_60px] gap-2 px-4 py-3 border-b border-white/5 items-center hover:bg-white/[0.02] group">
            <div className="flex items-center gap-2">
              {v.secret && <Lock className="w-3 h-3 text-amber-400" />}
              <code className="text-xs text-white font-mono truncate">{v.key}</code>
            </div>
            <div className="flex items-center gap-2">
              <code className="text-xs text-gray-400 font-mono truncate">
                {v.secret && !revealed.has(v.key) ? "•".repeat(16) : v.value}
              </code>
              {v.secret && (
                <button onClick={() => toggleReveal(v.key)} className="p-0.5 text-gray-600 hover:text-white">
                  {revealed.has(v.key) ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                </button>
              )}
            </div>
            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border text-center ${sourceColors[v.source]}`}>
              {v.source}
            </span>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
              <button onClick={() => copyValue(v)} className="p-1 text-gray-500 hover:text-white"><Copy className="w-3 h-3" /></button>
              {v.source === "custom" && (
                <button onClick={() => deleteVar(v.key)} className="p-1 text-gray-500 hover:text-red-400"><Trash2 className="w-3 h-3" /></button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 text-xs text-gray-600">
        <AlertTriangle className="w-4 h-4 text-amber-400" />
        <span>Secret values are masked by default. Source: <strong>config</strong> = config.json, <strong>env</strong> = environment, <strong>custom</strong> = user-added.</span>
      </div>
    </div>
  );
}
