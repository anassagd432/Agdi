"use client";

import React, { useState, useEffect } from "react";
import {
  Heart, Shield, Clock, Key, Users, FileText,
  Download, Upload, RefreshCw, Loader2, CheckCircle2,
  AlertTriangle, Palette, Globe, Bell,
} from "lucide-react";
import { toast } from "sonner";
import { downloadCSV, exportFilename } from "@/lib/export";

/* ── Settings sections ────────────────────────────────────────────── */

interface SettingToggle {
  id: string; label: string; description: string;
  enabled: boolean; icon: React.ReactNode;
}

const STORAGE_KEY = "agdi-dashboard-settings";

function loadSettings(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); } catch { return {}; }
}

function saveSettings(s: Record<string, boolean>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, boolean>>({});
  const [exporting, setExporting] = useState(false);

  useEffect(() => { setSettings(loadSettings()); }, []);

  const toggle = (id: string) => {
    const next = { ...settings, [id]: !settings[id] };
    setSettings(next);
    saveSettings(next);
    toast.success("Setting updated.");
  };

  const toggles: SettingToggle[] = [
    { id: "notifications", label: "Push Notifications", description: "Receive browser notifications for agent events", enabled: settings.notifications ?? true, icon: <Bell className="w-4 h-4 text-cyan-400" /> },
    { id: "auto_refresh", label: "Auto Refresh", description: "Automatically refresh metrics every 30 seconds", enabled: settings.auto_refresh ?? true, icon: <RefreshCw className="w-4 h-4 text-green-400" /> },
    { id: "compact_mode", label: "Compact Mode", description: "Use smaller cards and tighter spacing", enabled: settings.compact_mode ?? false, icon: <FileText className="w-4 h-4 text-purple-400" /> },
    { id: "show_costs", label: "Show Cost Estimates", description: "Display token cost estimates on agent cards", enabled: settings.show_costs ?? true, icon: <Key className="w-4 h-4 text-amber-400" /> },
    { id: "dark_console", label: "Dark Console", description: "Use darker background for console log viewer", enabled: settings.dark_console ?? true, icon: <Palette className="w-4 h-4 text-gray-400" /> },
    { id: "security_alerts", label: "Security Alerts", description: "Show alerts for suspicious login attempts", enabled: settings.security_alerts ?? true, icon: <Shield className="w-4 h-4 text-red-400" /> },
  ];

  const handleExport = async () => {
    setExporting(true);
    try {
      const data = {
        settings,
        exportedAt: new Date().toISOString(),
        version: "4.0.1",
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = exportFilename("settings") + ".json";
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Settings exported.");
    } finally { setExporting(false); }
  };

  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file"; input.accept = ".json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        if (data.settings) {
          setSettings(data.settings);
          saveSettings(data.settings);
          toast.success("Settings imported successfully!");
        }
      } catch { toast.error("Invalid settings file."); }
    };
    input.click();
  };

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-500 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            ⚙️ Settings
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">Dashboard preferences and configuration</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleImport}
            className="px-3 py-2 rounded-lg border border-white/10 text-gray-400 hover:text-white text-xs font-semibold flex items-center gap-1.5">
            <Upload className="w-3.5 h-3.5" /> Import
          </button>
          <button onClick={handleExport} disabled={exporting}
            className="px-3 py-2 rounded-lg border border-white/10 text-gray-400 hover:text-white text-xs font-semibold flex items-center gap-1.5">
            {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} Export
          </button>
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { href: "/dashboard/settings/users", icon: <Users className="w-5 h-5 text-cyan-400" />, label: "User Management", desc: "Manage users and roles", color: "bg-cyan-500/10 border-cyan-500/20" },
          { href: "/dashboard/settings/keys", icon: <Key className="w-5 h-5 text-amber-400" />, label: "API Keys", desc: "Create and manage API keys", color: "bg-amber-500/10 border-amber-500/20" },
          { href: "/dashboard/health", icon: <Heart className="w-5 h-5 text-red-400" />, label: "System Health", desc: "Service status and uptime", color: "bg-red-500/10 border-red-500/20" },
        ].map((link) => (
          <a key={link.href} href={link.href}
            className={`glass-panel p-4 border rounded-xl flex items-center gap-3 hover:bg-white/[0.02] transition-all ${link.color}`}>
            <div className="p-2 rounded-lg bg-white/5">{link.icon}</div>
            <div><p className="text-sm font-semibold text-white">{link.label}</p><p className="text-xs text-gray-500">{link.desc}</p></div>
          </a>
        ))}
      </div>

      {/* Toggle Settings */}
      <div>
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Preferences</h2>
        <div className="space-y-2">
          {toggles.map((t) => (
            <div key={t.id} className="glass-panel p-4 border border-white/5 rounded-xl flex items-center justify-between hover:border-white/10 transition-all">
              <div className="flex items-center gap-3">
                {t.icon}
                <div>
                  <p className="text-sm font-medium text-white">{t.label}</p>
                  <p className="text-xs text-gray-500">{t.description}</p>
                </div>
              </div>
              <button onClick={() => toggle(t.id)}
                className={`w-11 h-6 rounded-full transition-all relative ${t.enabled ? "bg-cyan-500" : "bg-white/10"}`}>
                <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-all ${t.enabled ? "left-[22px]" : "left-0.5"}`} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Danger Zone */}
      <div>
        <h2 className="text-sm font-semibold text-red-400 uppercase tracking-wider mb-3">Danger Zone</h2>
        <div className="glass-panel p-4 border border-red-500/20 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <div>
              <p className="text-sm font-medium text-white">Reset All Settings</p>
              <p className="text-xs text-gray-500">This will reset all preferences to their defaults</p>
            </div>
          </div>
          <button onClick={() => {
            if (!confirm("Reset all settings to defaults?")) return;
            setSettings({});
            saveSettings({});
            toast.success("Settings reset to defaults.");
          }}
            className="px-3 py-1.5 rounded-lg border border-red-500/20 bg-red-500/10 text-red-400 text-xs font-semibold hover:bg-red-500/20">
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}
