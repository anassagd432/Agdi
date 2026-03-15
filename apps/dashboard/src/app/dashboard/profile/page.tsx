"use client";

import React, { useState, useEffect } from "react";
import {
  User, Mail, Shield, Camera, Save, Key, Clock, LogOut,
  Loader2, CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";

const STORAGE_KEY = "agdi-profile";

interface Profile {
  username: string; email: string; displayName: string;
  role: string; avatar?: string; timezone: string;
  joined: number;
}

function loadProfile(): Profile {
  if (typeof window === "undefined") return defaultProfile();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : defaultProfile();
  } catch { return defaultProfile(); }
}

function defaultProfile(): Profile {
  return {
    username: "admin", email: "admin@agdi.ai",
    displayName: "Admin User", role: "Administrator",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    joined: Date.now() - 86400000 * 60,
  };
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile>(defaultProfile);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => { setProfile(loadProfile()); }, []);

  const update = (key: keyof Profile, value: string) => {
    setProfile((p) => ({ ...p, [key]: value }));
    setSaved(false);
  };

  const save = async () => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 800));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    localStorage.setItem("agdi-username", profile.username);
    setSaving(false); setSaved(true);
    toast.success("Profile saved!");
  };

  const initials = profile.displayName.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-500 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2">
          <User className="w-7 h-7 sm:w-8 sm:h-8 text-cyan-400" /> Profile
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">Manage your account settings</p>
      </div>

      {/* Avatar Section */}
      <div className="glass-panel p-6 border border-white/5 rounded-xl flex items-center gap-6">
        <div className="relative group">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-400/20 to-blue-600/20 border-2 border-cyan-500/20 flex items-center justify-center text-2xl font-bold text-cyan-400">
            {initials}
          </div>
          <button className="absolute inset-0 rounded-2xl bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Camera className="w-5 h-5 text-white" />
          </button>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white">{profile.displayName}</h2>
          <p className="text-sm text-gray-400">@{profile.username}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="px-2 py-0.5 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 rounded-full text-[10px] font-bold uppercase">
              {profile.role}
            </span>
            <span className="text-[10px] text-gray-600 flex items-center gap-1">
              <Clock className="w-3 h-3" /> Joined {new Date(profile.joined).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="glass-panel border border-white/5 rounded-xl overflow-hidden">
        <div className="p-5 border-b border-white/10 bg-black/40">
          <h3 className="text-sm font-semibold text-white">Account Details</h3>
        </div>
        <div className="p-5 space-y-4">
          {([
            { key: "displayName", label: "Display Name", icon: <User className="w-4 h-4 text-gray-500" />, type: "text" },
            { key: "username", label: "Username", icon: <User className="w-4 h-4 text-gray-500" />, type: "text" },
            { key: "email", label: "Email", icon: <Mail className="w-4 h-4 text-gray-500" />, type: "email" },
          ] as const).map((field) => (
            <div key={field.key} className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{field.label}</label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2">{field.icon}</div>
                <input type={field.type} value={profile[field.key]}
                  onChange={(e) => update(field.key, e.target.value)}
                  className="w-full bg-black/20 border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-white text-sm focus:border-cyan-500/50 focus:outline-none" />
              </div>
            </div>
          ))}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Timezone</label>
            <select value={profile.timezone} onChange={(e) => update("timezone", e.target.value)}
              className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:border-cyan-500/50 focus:outline-none">
              {["America/New_York", "America/Los_Angeles", "Europe/London", "Europe/Paris", "Africa/Casablanca", "Asia/Tokyo", "Asia/Dubai"].map((tz) => (
                <option key={tz} value={tz}>{tz.replace("_", " ")}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <a href="/dashboard/sessions"
            className="px-4 py-2 rounded-lg border border-white/10 text-gray-400 hover:text-white text-sm font-semibold flex items-center gap-2">
            <Key className="w-4 h-4" /> Active Sessions
          </a>
          <a href="/dashboard/security"
            className="px-4 py-2 rounded-lg border border-white/10 text-gray-400 hover:text-white text-sm font-semibold flex items-center gap-2">
            <Shield className="w-4 h-4" /> Security Log
          </a>
        </div>
        <button onClick={save} disabled={saving}
          className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold rounded-lg text-sm flex items-center gap-2 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saving ? "Saving..." : saved ? "Saved!" : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
