"use client";

import React from "react";
import Link from "next/link";
import { Settings, Users, Key, Palette, Bell, Globe } from "lucide-react";

const settingsLinks = [
  { href: "/dashboard/settings/users", label: "User Management", desc: "Add, remove, and manage user roles", icon: Users, color: "text-cyan-400" },
  { href: "/dashboard/settings/keys", label: "API Keys", desc: "Generate and revoke API keys", icon: Key, color: "text-amber-400" },
];

export default function SettingsPage() {
  return (
    <div className="flex flex-col h-full animate-in fade-in duration-500 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2">
          <Settings className="w-7 h-7 sm:w-8 sm:h-8 text-cyan-400" /> Settings
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">Configure your Agdi dashboard.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {settingsLinks.map(({ href, label, desc, icon: Icon, color }) => (
          <Link key={href} href={href}
            className="glass-panel p-5 border border-white/5 rounded-xl flex items-start gap-4 hover:border-white/10 hover:bg-white/[0.03] transition-all group">
            <div className={`p-2.5 rounded-xl bg-white/5 group-hover:bg-white/10 transition-colors`}>
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <div>
              <h3 className="font-semibold text-white text-sm">{label}</h3>
              <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
