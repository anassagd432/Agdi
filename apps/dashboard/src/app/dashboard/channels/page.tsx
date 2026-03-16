"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { MessageSquare, Wifi, WifiOff, Loader2, Settings } from "lucide-react";
import { toast } from "sonner";
import {
  WhatsAppLogo, DiscordLogo, TelegramLogo,
  SlackLogo, SignalLogo, IMessageLogo,
} from "@/components/BrandLogos";
import { useAgdi } from "@/components/AgdiProvider";

type ChannelStatus = "connected" | "disconnected" | "error";

interface ChannelUIProps {
  id: string;
  name: string;
  status: ChannelStatus;
  icon: JSX.Element;
  color: string;
  bg: string;
  border: string;
  messages: number;
}

const baseChannels: ChannelUIProps[] = [
  { id: "whatsapp", name: "WhatsApp", status: "disconnected", icon: <WhatsAppLogo className="w-7 h-7" />, color: "text-green-400", bg: "bg-green-500/10", border: "border-green-500/20", messages: 0 },
  { id: "discord", name: "Discord", status: "disconnected", icon: <DiscordLogo className="w-7 h-7" />, color: "text-indigo-400", bg: "bg-indigo-500/10", border: "border-indigo-500/20", messages: 0 },
  { id: "telegram", name: "Telegram", status: "disconnected", icon: <TelegramLogo className="w-7 h-7" />, color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20", messages: 0 },
  { id: "slack", name: "Slack", status: "disconnected", icon: <SlackLogo className="w-7 h-7" />, color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20", messages: 0 },
  { id: "signal", name: "Signal", status: "disconnected", icon: <SignalLogo className="w-7 h-7" />, color: "text-cyan-400", bg: "bg-cyan-500/10", border: "border-cyan-500/20", messages: 0 },
  { id: "imessage", name: "iMessage", status: "disconnected", icon: <IMessageLogo className="w-7 h-7" />, color: "text-gray-400", bg: "bg-gray-500/10", border: "border-gray-500/20", messages: 0 },
];

export default function ChannelsPage() {
  const { request, isConnected } = useAgdi();
  const [channels, setChannels] = useState<ChannelUIProps[]>(baseChannels);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!isConnected) return;
      try {
        setLoading(true);
        const res = await request<any>("channels.status", { probe: false });
        if (!mounted) return;

        const accounts = res.channelAccounts || {};
        
        setChannels(prev => prev.map(ch => {
          const providerAccounts = accounts[ch.id] || [];
          let newStatus: ChannelStatus = "disconnected";
          if (providerAccounts.length > 0) {
             const anyConnected = providerAccounts.some((a: any) => a.connected === true);
             const anyError = providerAccounts.some((a: any) => a.lastError || (a.probe && a.probe.ok === false));
             newStatus = anyConnected ? "connected" : (anyError ? "error" : "disconnected");
          }
          return { ...ch, status: newStatus };
        }));

      } catch (e) {
        console.error("Failed to load channel status:", e);
        toast.error("Failed to fetch live channel status from Gateway.");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [isConnected, request]);

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

      {loading && (
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Loader2 className="w-4 h-4 animate-spin" /> Fetching live configuration...
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {channels.map((ch) => (
          <div key={ch.name} className={`glass-panel p-5 border ${ch.status === "connected" ? ch.border : "border-white/5"} rounded-xl space-y-4 hover:bg-white/[0.02] transition-all`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl ${ch.status === "connected" ? ch.bg : "bg-white/5"} flex items-center justify-center`}>
                  {ch.icon}
                </div>
                <div>
                  <h3 className="font-semibold text-white text-sm">{ch.name}</h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {ch.status === "connected" && <><Wifi className="w-3 h-3 text-green-400" /><span className="text-[10px] text-green-400 uppercase font-semibold">Connected</span></>}
                    {ch.status === "disconnected" && <><WifiOff className="w-3 h-3 text-gray-500" /><span className="text-[10px] text-gray-500 uppercase font-semibold">Offline</span></>}
                    {ch.status === "error" && <><WifiOff className="w-3 h-3 text-red-500" /><span className="text-[10px] text-red-500 uppercase font-semibold">Error</span></>}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs pt-2">
              <span className="text-gray-500">{ch.status === "connected" ? "Listening for messages" : "Not configured"}</span>
              <Link 
                href="/dashboard/settings"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-white/10 transition-colors ${
                ch.status === "connected" ? "text-gray-300" : "text-cyan-400 bg-cyan-500/10"
              }`}>
                <Settings className="w-3.5 h-3.5" /> Configure
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
