"use client";

import React, { useState, useEffect } from "react";
import {
  Key, Globe, Clock, Trash2, Shield, Monitor, Loader2,
} from "lucide-react";
import { toast } from "sonner";

interface Session {
  id: string; device: string; platform: string;
  browser: string; ip: string; location: string;
  lastActive: number; createdAt: number; current: boolean;
}

function mockSessions(): Session[] {
  return [
    { id: "s1", device: "Windows 11 PC", platform: "🪟 Windows", browser: "Chrome 122", ip: "192.168.1.10", location: "Casablanca, MA", lastActive: Date.now(), createdAt: Date.now() - 86400000 * 3, current: true },
    { id: "s2", device: "MacBook Pro", platform: "🍎 macOS", browser: "Safari 18.3", ip: "192.168.1.15", location: "Casablanca, MA", lastActive: Date.now() - 1800000, createdAt: Date.now() - 86400000 * 7, current: false },
    { id: "s3", device: "iPhone 16 Pro", platform: "📱 iOS", browser: "Safari Mobile", ip: "10.0.0.22", location: "Rabat, MA", lastActive: Date.now() - 7200000, createdAt: Date.now() - 86400000 * 1, current: false },
    { id: "s4", device: "Galaxy S24", platform: "🤖 Android", browser: "Chrome Mobile", ip: "10.0.0.30", location: "Marrakech, MA", lastActive: Date.now() - 86400000, createdAt: Date.now() - 86400000 * 14, current: false },
    { id: "s5", device: "Ubuntu Server", platform: "🐧 Linux", browser: "API Client", ip: "10.0.0.50", location: "Frankfurt, DE", lastActive: Date.now() - 3600000 * 4, createdAt: Date.now() - 86400000 * 30, current: false },
  ];
}

function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "Active now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export default function SessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => { setSessions(mockSessions()); setLoading(false); }, 600);
    return () => clearTimeout(timer);
  }, []);

  const revokeSession = (id: string) => {
    if (!confirm("Revoke this session? The device will be signed out.")) return;
    setSessions((prev) => prev.filter((s) => s.id !== id));
    toast.success("Session revoked.");
  };

  const revokeAll = () => {
    if (!confirm("Revoke all other sessions? All devices except this one will be signed out.")) return;
    setSessions((prev) => prev.filter((s) => s.current));
    toast.success("All other sessions revoked.");
  };

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-500 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            <Key className="w-7 h-7 sm:w-8 sm:h-8 text-cyan-400" /> Active Sessions
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">{sessions.length} active sessions</p>
        </div>
        {sessions.filter((s) => !s.current).length > 0 && (
          <button onClick={revokeAll}
            className="px-4 py-2 rounded-lg text-sm font-semibold bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20">
            Revoke All Others
          </button>
        )}
      </div>

      {loading && <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 text-cyan-400 animate-spin" /></div>}

      <div className="space-y-3 stagger-in">
        {sessions.map((s) => (
          <div key={s.id}
            className={`glass-panel p-5 border rounded-xl flex items-center justify-between transition-all ${
              s.current ? "border-cyan-500/20 ring-1 ring-cyan-500/10" : "border-white/5 hover:border-white/10"}`}>
            <div className="flex items-center gap-4">
              <div className="text-2xl">{s.platform.split(" ")[0]}</div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-white">{s.device}</h3>
                  {s.current && (
                    <span className="px-2 py-0.5 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 rounded-full text-[10px] font-bold">
                      CURRENT
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><Globe className="w-3 h-3" /> {s.browser}</span>
                  <span className="font-mono">{s.ip}</span>
                  <span>{s.location}</span>
                </div>
                <div className="flex items-center gap-3 mt-0.5 text-[10px] text-gray-600">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span className={s.current ? "text-green-400" : ""}>{timeAgo(s.lastActive)}</span>
                  </span>
                  <span>Created {new Date(s.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
            {!s.current && (
              <button onClick={() => revokeSession(s.id)}
                className="p-2 rounded-lg border border-red-500/20 text-red-400 hover:bg-red-500/10">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
