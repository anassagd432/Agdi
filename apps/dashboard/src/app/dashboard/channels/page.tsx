"use client";

import React, { useState } from "react";
import { MessageSquare, Wifi, WifiOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  WhatsAppLogo, DiscordLogo, TelegramLogo,
  SlackLogo, SignalLogo, IMessageLogo,
} from "@/components/BrandLogos";

const channels = [
  { name: "WhatsApp", status: "connected", icon: <WhatsAppLogo className="w-7 h-7" />, color: "text-green-400", bg: "bg-green-500/10", border: "border-green-500/20", messages: 1240 },
  { name: "Discord", status: "connected", icon: <DiscordLogo className="w-7 h-7" />, color: "text-indigo-400", bg: "bg-indigo-500/10", border: "border-indigo-500/20", messages: 850 },
  { name: "Telegram", status: "connected", icon: <TelegramLogo className="w-7 h-7" />, color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20", messages: 620 },
  { name: "Slack", status: "disconnected", icon: <SlackLogo className="w-7 h-7" />, color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20", messages: 0 },
  { name: "Signal", status: "disconnected", icon: <SignalLogo className="w-7 h-7" />, color: "text-cyan-400", bg: "bg-cyan-500/10", border: "border-cyan-500/20", messages: 0 },
  { name: "iMessage", status: "disconnected", icon: <IMessageLogo className="w-7 h-7" />, color: "text-gray-400", bg: "bg-gray-500/10", border: "border-gray-500/20", messages: 0 },
];

export default function ChannelsPage() {
  const [channelsState, setChannelsState] = useState(channels);
  const [connecting, setConnecting] = useState<string | null>(null);

  const toggleConnection = async (name: string) => {
    const ch = channelsState.find(c => c.name === name);
    if (!ch) return;
    
    if (ch.status === "connected") {
      setChannelsState(prev => prev.map(c => c.name === name ? { ...c, status: "disconnected" } : c));
      toast.success(`${name} disconnected.`);
    } else {
      setConnecting(name);
      await new Promise(r => setTimeout(r, 1000));
      setChannelsState(prev => prev.map(c => c.name === name ? { ...c, status: "connected" } : c));
      setConnecting(null);
      toast.success(`${name} connected successfully!`);
    }
  };

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-500 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2">
          <MessageSquare className="w-7 h-7 sm:w-8 sm:h-8 text-cyan-400" /> Channels
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {channelsState.filter((c) => c.status === "connected").length} of {channelsState.length} channels connected
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {channelsState.map((ch) => (
          <div key={ch.name} className={`glass-panel p-5 border ${ch.border} rounded-xl space-y-4 hover:bg-white/[0.02] transition-all`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl ${ch.bg} flex items-center justify-center`}>
                  {ch.icon}
                </div>
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
              <button 
                onClick={() => toggleConnection(ch.name)}
                disabled={connecting === ch.name}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold disabled:opacity-50 ${
                ch.status === "connected" ? "bg-red-500/10 border border-red-500/20 text-red-400" : "bg-cyan-500/10 border border-cyan-500/20 text-cyan-400"
              }`}>
                {connecting === ch.name && <Loader2 className="w-3 h-3 animate-spin" />}
                {ch.status === "connected" ? "Disconnect" : "Connect"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
