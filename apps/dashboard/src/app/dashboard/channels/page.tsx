"use client";

import React from "react";
import { MessageSquare, Wifi, WifiOff } from "lucide-react";

const channels = [
  { name: "WhatsApp", status: "connected", icon: "💬", color: "text-green-400", bg: "bg-green-500/10", border: "border-green-500/20", messages: 1240 },
  { name: "Discord", status: "connected", icon: "🎮", color: "text-indigo-400", bg: "bg-indigo-500/10", border: "border-indigo-500/20", messages: 850 },
  { name: "Telegram", status: "connected", icon: "✈️", color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20", messages: 620 },
  { name: "Slack", status: "disconnected", icon: "📢", color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20", messages: 0 },
  { name: "Signal", status: "disconnected", icon: "🔒", color: "text-cyan-400", bg: "bg-cyan-500/10", border: "border-cyan-500/20", messages: 0 },
  { name: "iMessage", status: "disconnected", icon: "🍎", color: "text-gray-400", bg: "bg-gray-500/10", border: "border-gray-500/20", messages: 0 },
];

export default function ChannelsPage() {
  return (
    <div className="flex flex-col h-full animate-in fade-in duration-500 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2">
          <MessageSquare className="w-7 h-7 sm:w-8 sm:h-8 text-cyan-400" /> Channels
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {channels.filter((c) => c.status === "connected").length} of {channels.length} channels connected
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {channels.map((ch) => (
          <div key={ch.name} className={`glass-panel p-5 border ${ch.border} rounded-xl space-y-4 hover:bg-white/[0.02] transition-all`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{ch.icon}</span>
                <div>
                  <h3 className="font-semibold text-white text-sm">{ch.name}</h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {ch.status === "connected"
                      ? <><Wifi className="w-3 h-3 text-green-400" /><span className="text-[10px] text-green-400 uppercase font-semibold">Connected</span></>
                      : <><WifiOff className="w-3 h-3 text-gray-500" /><span className="text-[10px] text-gray-500 uppercase font-semibold">Offline</span></>}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">{ch.messages > 0 ? `${ch.messages.toLocaleString()} messages` : "No messages yet"}</span>
              <button className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                ch.status === "connected" ? "bg-red-500/10 border border-red-500/20 text-red-400" : "bg-cyan-500/10 border border-cyan-500/20 text-cyan-400"
              }`}>
                {ch.status === "connected" ? "Disconnect" : "Connect"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
