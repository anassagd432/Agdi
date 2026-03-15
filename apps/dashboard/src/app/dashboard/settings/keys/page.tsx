"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Key, Plus, Trash2, Copy, Eye, EyeOff, RefreshCw, Loader2, Shield,
} from "lucide-react";
import { toast } from "sonner";

interface ApiKeyInfo {
  id: string;
  name: string;
  prefix: string;
  createdAt: number;
  lastUsed?: number;
  createdBy: string;
}

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKeyInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const fetchKeys = useCallback(async () => {
    try {
      const res = await fetch("/api/keys");
      if (res.ok) { setKeys((await res.json()).keys || []); }
    } catch { toast.error("Failed to fetch keys."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchKeys(); }, [fetchKeys]);

  const handleCreate = async () => {
    if (!newKeyName.trim()) { toast.error("Key name is required."); return; }
    setCreating(true);
    try {
      const res = await fetch("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newKeyName.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setRevealedKey(data.key);
        toast.success("API key created! Copy it now — it won't be shown again.");
        setNewKeyName("");
        setShowCreate(false);
        fetchKeys();
      } else { toast.error("Failed to create key."); }
    } catch { toast.error("Failed to create key."); }
    finally { setCreating(false); }
  };

  const handleRevoke = async (id: string, name: string) => {
    if (!confirm(`Revoke key "${name}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/keys?id=${id}`, { method: "DELETE" });
      if (res.ok) { toast.success("Key revoked."); fetchKeys(); }
      else { toast.error("Failed to revoke key."); }
    } catch { toast.error("Failed to revoke key."); }
  };

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    toast.success("Copied to clipboard!");
  };

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-500 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Key className="w-7 h-7 text-cyan-400" /> API Keys
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">Manage API keys for external integrations.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { setLoading(true); fetchKeys(); }}
            className="p-2 rounded-lg border border-white/10 text-gray-400 hover:text-white">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button onClick={() => setShowCreate(!showCreate)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 ${
              showCreate ? "bg-red-500/10 text-red-400 border border-red-500/20" : "bg-cyan-500 text-black hover:bg-cyan-400"
            }`}>
            {showCreate ? "Cancel" : <><Plus className="w-4 h-4" /> New Key</>}
          </button>
        </div>
      </div>

      {/* Revealed key banner */}
      {revealedKey && (
        <div className="glass-panel p-4 border-amber-500/30 ring-1 ring-amber-500/20 animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-amber-400 font-semibold uppercase">Your new API key (copy now!)</p>
              <code className="text-sm text-white font-mono mt-1 block">{revealedKey}</code>
            </div>
            <div className="flex gap-2">
              <button onClick={() => copyKey(revealedKey)} className="p-2 rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500/20">
                <Copy className="w-4 h-4" />
              </button>
              <button onClick={() => setRevealedKey(null)} className="p-2 rounded-lg bg-white/5 text-gray-400 hover:text-white">
                <EyeOff className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create form */}
      {showCreate && (
        <div className="glass-panel p-5 border-cyan-500/30 ring-1 ring-cyan-500/20 animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1.5">Key Name</label>
              <input type="text" value={newKeyName} onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="e.g. Production API" onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-cyan-500/50 focus:outline-none" />
            </div>
            <button onClick={handleCreate} disabled={creating || !newKeyName.trim()}
              className="bg-cyan-500 hover:bg-cyan-400 text-black font-semibold px-5 py-2 rounded-lg text-sm flex items-center gap-2 disabled:opacity-50">
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Create
            </button>
          </div>
        </div>
      )}

      {/* Keys table */}
      <div className="glass-panel rounded-xl border border-white/5 overflow-hidden">
        <div className="grid grid-cols-[1fr_120px_140px_140px_50px] gap-4 px-6 py-3 border-b border-white/10 bg-black/40 text-xs font-semibold text-gray-400 uppercase tracking-widest">
          <div>Key</div><div>Prefix</div><div>Created</div><div>Last Used</div><div></div>
        </div>

        {loading && <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 text-cyan-400 animate-spin" /></div>}
        {!loading && keys.length === 0 && <div className="text-center py-12 text-muted-foreground text-sm">No API keys. Click &quot;New Key&quot; to create one.</div>}

        {!loading && keys.map((k) => (
          <div key={k.id} className="grid grid-cols-[1fr_120px_140px_140px_50px] gap-4 px-6 py-3 border-b border-white/5 items-center hover:bg-white/[0.02]">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-cyan-400 shrink-0" />
              <span className="text-sm text-white font-medium truncate">{k.name}</span>
            </div>
            <code className="text-xs text-gray-500 font-mono">{k.prefix}...</code>
            <div className="text-xs text-gray-400">{new Date(k.createdAt).toLocaleDateString([], { month: "short", day: "numeric" })}</div>
            <div className="text-xs text-gray-400">{k.lastUsed ? new Date(k.lastUsed).toLocaleDateString([], { month: "short", day: "numeric" }) : "Never"}</div>
            <button onClick={() => handleRevoke(k.id, k.name)} className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
