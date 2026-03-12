"use client";

import React, { useState } from 'react';
import { Network, Play, Pause, Power, Clock, Settings, Zap, History } from 'lucide-react';
import { toast } from 'sonner';

interface Automation {
  id: string;
  name: string;
  type: 'cron' | 'webhook' | 'pubsub';
  trigger: string;
  status: 'active' | 'paused';
  lastRun: string;
}

export default function AutomationsPage() {
  const [automations, setAutomations] = useState<Automation[]>([
    { id: 'auto-1', name: 'Daily Standup Report', type: 'cron', trigger: '0 9 * * 1-5', status: 'active', lastRun: '2 hours ago' },
    { id: 'auto-2', name: 'GitHub PR Summarizer', type: 'webhook', trigger: '/api/webhook/github_pr', status: 'active', lastRun: '15 mins ago' },
    { id: 'auto-3', name: 'Support Inbox Scraper', type: 'pubsub', trigger: 'Gmail Label: Urgent', status: 'paused', lastRun: '3 days ago' },
  ]);

  const toggleStatus = (id: string, name: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'paused' : 'active';
    setAutomations(prev => prev.map(a => a.id === id ? { ...a, status: newStatus } : a));
    
    if (newStatus === 'active') {
      toast.success(`${name} is now active and listening.`);
    } else {
      toast.info(`${name} has been paused.`);
    }
  };

  const manuallyRun = (name: string) => {
    toast.success(`Triggering manual execution for ${name}...`);
  };

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-500 max-w-6xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            <Network className="w-8 h-8 text-cyan-400" /> Automations
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage your Cron jobs, Webhooks, and Event-Driven Agent workflows.
          </p>
        </div>
        <button className="bg-cyan-500 hover:bg-cyan-400 text-black font-semibold py-2 px-4 rounded-lg flex items-center gap-2 transition-colors">
          <Zap className="w-4 h-4 fill-black" /> New Workflow
        </button>
      </div>

      {/* Automations Table */}
      <div className="glass-panel overflow-hidden rounded-xl border border-white/10 mt-6">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/10 bg-black/40 text-sm text-muted-foreground">
              <th className="py-4 px-6 font-medium">Workflow Name</th>
              <th className="py-4 px-6 font-medium">Trigger Type</th>
              <th className="py-4 px-6 font-medium">Trigger Definition</th>
              <th className="py-4 px-6 font-medium">Last Run</th>
              <th className="py-4 px-6 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {automations.map((item, idx) => (
              <tr key={item.id} className={`border-b border-white/5 hover:bg-white/5 transition-colors ${idx === automations.length - 1 ? 'border-b-0' : ''}`}>
                <td className="py-4 px-6">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${item.status === 'active' ? 'bg-emerald-400 animate-pulse' : 'bg-gray-500'}`}></div>
                    <span className={`font-medium ${item.status === 'active' ? 'text-white' : 'text-gray-400'}`}>{item.name}</span>
                  </div>
                </td>
                <td className="py-4 px-6">
                  <span className={`text-xs font-mono uppercase tracking-wider px-2 py-1 rounded-md border ${
                    item.type === 'cron' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 
                    item.type === 'webhook' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 
                    'bg-orange-500/10 text-orange-400 border-orange-500/20'
                  }`}>
                    {item.type}
                  </span>
                </td>
                <td className="py-4 px-6 font-mono text-sm text-gray-400">
                  {item.trigger}
                </td>
                <td className="py-4 px-6 text-sm text-gray-400 flex items-center gap-2">
                  <History className="w-3.5 h-3.5" /> {item.lastRun}
                </td>
                <td className="py-4 px-6">
                  <div className="flex items-center justify-end gap-2">
                    <button 
                      onClick={() => manuallyRun(item.name)}
                      className="p-1.5 bg-white/5 hover:bg-white/10 rounded-md text-gray-400 hover:text-white transition-colors"
                      title="Run Now"
                    >
                      <Play className="w-4 h-4 fill-current" />
                    </button>
                    <button 
                      onClick={() => toggleStatus(item.id, item.name, item.status)}
                      className={`p-1.5 rounded-md transition-colors ${item.status === 'active' ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'}`}
                      title={item.status === 'active' ? 'Pause Workflow' : 'Activate Workflow'}
                    >
                      {item.status === 'active' ? <Pause className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                    </button>
                    <button className="p-1.5 bg-white/5 hover:bg-white/10 rounded-md text-gray-400 hover:text-white transition-colors">
                      <Settings className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {automations.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
             <Network className="w-12 h-12 mx-auto mb-3 opacity-20" />
             <p>No automations configured yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
