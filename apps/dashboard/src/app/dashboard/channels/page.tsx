"use client";

import React, { useState } from 'react';
import { MessageSquare, Phone, MessageCircle, Hash, Zap, Plus, RefreshCw, Key, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface Channel {
  id: string;
  name: string;
  provider: string;
  status: 'connected' | 'disconnected' | 'connecting';
  icon: React.ElementType;
  colorClass: string;
  description: string;
}

export default function ChannelsPage() {
  const [channels, setChannels] = useState<Channel[]>([
    { id: 'wh-1', name: 'WhatsApp Primary', provider: 'WhatsApp', status: 'connected', icon: Phone, colorClass: 'text-green-400', description: 'Primary business number routing to Support Agent.' },
    { id: 'tg-1', name: 'Telegram Bot', provider: 'Telegram', status: 'connected', icon: MessageCircle, colorClass: 'text-blue-400', description: 'Public facing bot (@agdi_bot).' },
    { id: 'dc-1', name: 'Discord Dev Server', provider: 'Discord', status: 'disconnected', icon: Hash, colorClass: 'text-indigo-400', description: 'Internal team server integration.' },
    { id: 'sl-1', name: 'Slack Workspace', provider: 'Slack', status: 'disconnected', icon: Hash, colorClass: 'text-orange-400', description: '#general channel observer.' },
  ]);

  const [isPairing, setIsPairing] = useState<string | null>(null);

  const toggleConnection = (channelId: string) => {
    setIsPairing(channelId);
    
    // Simulate connection process
    setTimeout(() => {
      setChannels(prev => prev.map(ch => {
        if (ch.id === channelId) {
          const newStatus = ch.status === 'connected' ? 'disconnected' : 'connected';
          if (newStatus === 'connected') toast.success(`${ch.name} connected successfully!`);
          else toast.info(`${ch.name} disconnected.`);
          return { ...ch, status: newStatus };
        }
        return ch;
      }));
      setIsPairing(null);
    }, 1500);
  };

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-500 max-w-6xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            <MessageSquare className="w-8 h-8 text-cyan-400" /> Channels & Integrations
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage external messaging surfaces connected to your Agdi Gateway.
          </p>
        </div>
        <button className="bg-cyan-500 hover:bg-cyan-400 text-black font-semibold py-2 px-4 rounded-lg flex items-center gap-2 transition-colors">
          <Plus className="w-4 h-4" /> Add Integration
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
        {channels.map(channel => (
          <div key={channel.id} className="glass-panel p-6 rounded-xl border border-white/5 hover:border-white/10 transition-colors flex flex-col h-full relative overflow-hidden group">
            
            {/* Status Indicator */}
            <div className="absolute top-4 right-4 flex items-center gap-2">
               {channel.status === 'connected' && (
                 <span className="flex h-2 w-2 relative">
                   <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                   <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                 </span>
               )}
               {channel.status === 'disconnected' && (
                 <span className="flex h-2 w-2 rounded-full bg-red-500/50"></span>
               )}
            </div>

            <div className="flex items-center gap-4 mb-4">
              <div className={`p-3 rounded-lg bg-black/40 border border-white/5 ${channel.colorClass}`}>
                <channel.icon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-lg text-white">{channel.name}</h3>
                <span className="text-xs text-muted-foreground font-mono">{channel.provider} Gateway</span>
              </div>
            </div>

            <p className="text-sm text-gray-400 mb-6 flex-grow leading-relaxed">
              {channel.description}
            </p>

            <div className="pt-4 border-t border-white/5 flex gap-3 mt-auto">
              <button 
                onClick={() => toggleConnection(channel.id)}
                disabled={isPairing === channel.id}
                className={`flex-1 py-2 rounded-md font-medium text-sm flex items-center justify-center gap-2 transition-colors ${
                  channel.status === 'connected' 
                    ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20' 
                    : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20'
                }`}
              >
                {isPairing === channel.id ? (
                  <><RefreshCw className="w-4 h-4 animate-spin" /> Pairing...</>
                ) : channel.status === 'connected' ? (
                  'Disconnect'
                ) : (
                  'Pair Device'
                )}
              </button>
              
              <button className="p-2 bg-white/5 hover:bg-white/10 rounded-md text-muted-foreground hover:text-white transition-colors border border-white/5" title="Configure Secrets">
                <Key className="w-4 h-4" />
              </button>
            </div>
            
          </div>
        ))}

        {/* Placeholder / Add New */}
        <div className="glass-panel p-6 rounded-xl border border-dashed border-white/20 hover:border-cyan-500/50 transition-colors flex flex-col h-full items-center justify-center text-center cursor-pointer group min-h-[220px]">
           <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-cyan-500/20 transition-all">
             <Plus className="w-6 h-6 text-muted-foreground group-hover:text-cyan-400" />
           </div>
           <h3 className="font-medium text-white mb-1">More Integrations</h3>
           <p className="text-sm text-muted-foreground">Add Signal, iMessage, Teams, Matrix and more.</p>
        </div>
      </div>
    </div>
  );
}
