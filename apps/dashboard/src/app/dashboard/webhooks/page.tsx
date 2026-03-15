"use client";

import React, { useState, useEffect } from "react";
import {
  Link2, Plus, Trash2, Copy, CheckCircle2, XCircle,
  RefreshCw, Loader2, Globe, Bell,
} from "lucide-react";
import { toast } from "sonner";

interface Webhook {
  id: string; url: string; events: string[];
  active: boolean; secret: string; createdAt: number;
  lastTriggered?: number; failures: number;
}

const availableEvents = [
  "agent.message", "agent.spawn", "agent.stop",
  "channel.message", "channel.connect", "channel.disconnect",
  "auth.login", "auth.logout", "auth.failed",
  "device.online", "device.offline", "device.command",
  "workflow.trigger", "workflow.complete", "workflow.error",
];

const STORAGE_KEY = "agdi-webhooks";

function loadWebhooks(): Webhook[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; }
}

function saveWebhooks(w: Webhook[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(w));
}

export default function WebhooksPage() {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newUrl, setNewUrl] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);

  useEffect(() => { setWebhooks(loadWebhooks()); }, []);

  const createWebhook = () => {
    if (!newUrl.trim()) return toast.error("URL is required.");
    if (selectedEvents.length === 0) return toast.error("Select at least one event.");
    const wh: Webhook = {
      id: crypto.randomUUID(), url: newUrl.trim(),
      events: selectedEvents, active: true,
      secret: crypto.randomUUID().replace(/-/g, ""),
      createdAt: Date.now(), failures: 0,
    };
    const next = [wh, ...webhooks];
    setWebhooks(next); saveWebhooks(next);
    setNewUrl(""); setSelectedEvents([]); setShowCreate(false);
    toast.success("Webhook created!");
  };

  const toggleWebhook = (id: string) => {
    const next = webhooks.map((w) => w.id === id ? { ...w, active: !w.active } : w);
    setWebhooks(next); saveWebhooks(next);
  };

  const deleteWebhook = (id: string) => {
    if (!confirm("Delete this webhook?")) return;
    const next = webhooks.filter((w) => w.id !== id);
    setWebhooks(next); saveWebhooks(next);
    toast.success("Webhook deleted.");
  };

  const toggleEvent = (event: string) => {
    setSelectedEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event],
    );
  };

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-500 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            <Link2 className="w-7 h-7 sm:w-8 sm:h-8 text-cyan-400" /> Webhooks
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">{webhooks.length} webhooks configured</p>
        </div>
        <button onClick={() => setShowCreate(!showCreate)}
          className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 ${
            showCreate ? "bg-red-500/10 text-red-400 border border-red-500/20" : "bg-cyan-500 text-black hover:bg-cyan-400"}`}>
          {showCreate ? "Cancel" : <><Plus className="w-4 h-4" /> New Webhook</>}
        </button>
      </div>

      {showCreate && (
        <div className="glass-panel p-5 border border-cyan-500/20 ring-1 ring-cyan-500/10 rounded-xl animate-in slide-in-from-top-4 duration-300 space-y-4">
          <input type="url" placeholder="https://example.com/webhook" value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:border-cyan-500/50 focus:outline-none" />
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Events</p>
            <div className="flex flex-wrap gap-2">
              {availableEvents.map((evt) => (
                <button key={evt} onClick={() => toggleEvent(evt)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                    selectedEvents.includes(evt)
                      ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400"
                      : "border-white/10 text-gray-500 hover:text-white"}`}>
                  {evt}
                </button>
              ))}
            </div>
          </div>
          <button onClick={createWebhook}
            className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold px-5 py-2 rounded-lg text-sm">
            Create Webhook
          </button>
        </div>
      )}

      {webhooks.length === 0 && !showCreate && (
        <div className="text-center py-16 space-y-3">
          <Link2 className="w-12 h-12 text-gray-600 mx-auto" />
          <p className="text-muted-foreground">No webhooks configured yet.</p>
        </div>
      )}

      <div className="space-y-3">
        {webhooks.map((wh) => (
          <div key={wh.id} className="glass-panel p-5 border border-white/5 rounded-xl space-y-3 hover:border-white/10 transition-all">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-2.5 h-2.5 rounded-full ${wh.active ? "bg-green-500" : "bg-gray-500"}`} />
                <span className="text-sm font-mono text-white truncate max-w-sm">{wh.url}</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => toggleWebhook(wh.id)}
                  className={`w-9 h-5 rounded-full transition-all relative ${wh.active ? "bg-cyan-500" : "bg-white/10"}`}>
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all ${wh.active ? "left-[18px]" : "left-0.5"}`} />
                </button>
                <button onClick={() => deleteWebhook(wh.id)} className="p-1.5 text-gray-500 hover:text-red-400">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-1">
              {wh.events.map((evt) => (
                <span key={evt} className="px-2 py-0.5 bg-white/5 rounded text-[10px] text-gray-400 font-mono">{evt}</span>
              ))}
            </div>
            <div className="flex items-center gap-4 text-[10px] text-gray-600">
              <span>Created {new Date(wh.createdAt).toLocaleDateString()}</span>
              {wh.lastTriggered && <span>Last fired {new Date(wh.lastTriggered).toLocaleString()}</span>}
              {wh.failures > 0 && <span className="text-red-400">{wh.failures} failures</span>}
              <button onClick={() => { navigator.clipboard.writeText(wh.secret); toast.success("Secret copied!"); }}
                className="flex items-center gap-1 text-gray-500 hover:text-white">
                <Copy className="w-3 h-3" /> Copy secret
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
