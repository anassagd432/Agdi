"use client";

import { useEffect, useState } from "react";
import { agdi, AgentStatus, LogEntry } from "@/lib/agdi-client";
import { Power, Bot, TerminalSquare, Activity, Cpu, Database, Network, Clock, CheckCircle2, ChevronRight, Zap } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

export default function DashboardOverview() {
  const [status, setStatus] = useState<AgentStatus>(agdi.status);
  const [uptime] = useState(new Date(Date.now() - 1000 * 60 * 60 * 2.5)); // 2.5 hours ago mock

  useEffect(() => {
    const interval = setInterval(() => {
      setStatus({ ...agdi.status });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleSpawn = () => {
    agdi.spawnAgent("Analyze codebase architecture");
    toast.success("Parallel Agent spawned and added to task queue.");
  };
  
  const handleCommand = () => {
    agdi.runCommand("agdi doctor --verbose");
    toast.info("Running CLI Diagnostics: agdi doctor --verbose");
  };

  const handleEmergencyStop = () => {
    agdi.status.status = "paused"; 
    agdi.runCommand("Emergency Stop Issued.");
    toast.error("EMERGENCY STOP ISSUED. All sub-agents halted.", {
      style: { background: 'rgba(220, 38, 38, 0.2)', border: '1px solid rgba(220, 38, 38, 0.5)', color: '#f87171' }
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-white mb-1">Command Center</h1>
        <p className="text-muted-foreground">Enterprise telemetry and autonomous agent orchestration.</p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* Core System Metrics */}
        <div className="glass-panel p-6 flex flex-col gap-3 relative overflow-hidden group">
           <div className="absolute -right-4 -top-4 w-24 h-24 bg-cyan-500/10 rounded-full blur-2xl group-hover:bg-cyan-500/20 transition-all" />
           <div className="flex items-center justify-between">
             <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
               <Cpu className="w-4 h-4" /> Core Daemon
             </h3>
             <span className="flex items-center gap-1.5 text-xs font-semibold text-cyan-400 bg-cyan-400/10 px-2 py-0.5 rounded-full border border-cyan-400/20">
               <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
               ONLINE
             </span>
           </div>
           <div className="flex flex-col">
             <span className="text-2xl font-bold text-white tracking-tight">0.8% CPU</span>
             <span className="text-xs text-muted-foreground mt-1">Uptime: {formatDistanceToNow(uptime)}</span>
           </div>
        </div>
        
        <div className="glass-panel p-6 flex flex-col gap-3 relative overflow-hidden group">
           <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-all" />
           <div className="flex items-center justify-between">
             <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
               <Zap className="w-4 h-4" /> Active Sub-Agents
             </h3>
           </div>
           <div className="flex flex-col">
             <span className="text-2xl font-bold text-white tracking-tight">{status.activeTasks}</span>
             <span className="text-xs text-blue-400 mt-1 flex items-center gap-1">
                +1 spawned recently
             </span>
           </div>
        </div>

        <div className="glass-panel p-6 flex flex-col gap-3 relative overflow-hidden group">
           <div className="absolute -right-4 -top-4 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl group-hover:bg-purple-500/20 transition-all" />
           <div className="flex items-center justify-between">
             <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
               <Database className="w-4 h-4" /> Token Usage
             </h3>
           </div>
           <div className="flex flex-col">
             <span className="text-2xl font-bold text-white tracking-tight">124.5k</span>
             <div className="w-full bg-black/40 h-1.5 rounded-full mt-2 overflow-hidden">
                <div className="bg-purple-400 h-full w-[45%]" />
             </div>
             <span className="text-xs text-muted-foreground mt-1">Daily Quota: 45%</span>
           </div>
        </div>

        <div className="glass-panel p-6 flex flex-col gap-3 relative overflow-hidden group">
           <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-all" />
           <div className="flex items-center justify-between">
             <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
               <Network className="w-4 h-4" /> Local Gateway
             </h3>
           </div>
           <div className="flex flex-col">
             <span className="text-2xl font-bold text-white tracking-tight">12ms</span>
             <span className="text-xs text-emerald-400 mt-1 flex items-center gap-1">
                Port 18789 is listening
             </span>
           </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <div className="glass-panel flex flex-col lg:col-span-4 min-h-[400px] overflow-hidden">
           <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
             <h2 className="text-lg font-semibold flex items-center gap-2 text-white">
               <Activity className="w-5 h-5 text-cyan-400" /> Live Task Queue
             </h2>
             <span className="text-xs font-medium text-muted-foreground bg-black/40 px-2.5 py-1 rounded border border-white/10">
               Auto-sync Active
             </span>
           </div>
           
           <div className="flex-1 overflow-auto p-0">
             <table className="w-full text-sm text-left">
               <thead className="text-xs text-muted-foreground bg-black/40 border-b border-white/5 sticky top-0">
                 <tr>
                   <th className="px-6 py-3 font-medium">Task ID</th>
                   <th className="px-6 py-3 font-medium">Description</th>
                   <th className="px-6 py-3 font-medium">Status</th>
                   <th className="px-6 py-3 font-medium text-right">Time</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-white/5">
                 {/* Mock Queue Items */}
                 <tr className="hover:bg-white/[0.02] transition-colors group">
                   <td className="px-6 py-4 font-mono text-xs text-cyan-400/70">#AG-8492</td>
                   <td className="px-6 py-4 text-gray-300 font-medium group-hover:text-white transition-colors">Analyze Codebase Dependencies</td>
                   <td className="px-6 py-4">
                     <span className="inline-flex items-center gap-1.5 bg-blue-500/10 text-blue-400 text-xs px-2 py-1 rounded-md border border-blue-500/20">
                       <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" /> Running
                     </span>
                   </td>
                   <td className="px-6 py-4 text-right text-muted-foreground text-xs text-nowrap">2m ago</td>
                 </tr>
                 <tr className="hover:bg-white/[0.02] transition-colors group">
                   <td className="px-6 py-4 font-mono text-xs text-muted-foreground">#AG-8491</td>
                   <td className="px-6 py-4 text-gray-400 group-hover:text-gray-300 transition-colors">System Health Check</td>
                   <td className="px-6 py-4">
                     <span className="inline-flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 text-xs px-2 py-1 rounded-md border border-emerald-500/20">
                       <CheckCircle2 className="w-3 h-3" /> Completed
                     </span>
                   </td>
                   <td className="px-6 py-4 text-right text-muted-foreground text-xs text-nowrap">15m ago</td>
                 </tr>
                 <tr className="hover:bg-white/[0.02] transition-colors group">
                   <td className="px-6 py-4 font-mono text-xs text-muted-foreground">#AG-8490</td>
                   <td className="px-6 py-4 text-gray-400 group-hover:text-gray-300 transition-colors">Update Local Gateway TLS</td>
                   <td className="px-6 py-4">
                     <span className="inline-flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 text-xs px-2 py-1 rounded-md border border-emerald-500/20">
                       <CheckCircle2 className="w-3 h-3" /> Completed
                     </span>
                   </td>
                   <td className="px-6 py-4 text-right text-muted-foreground text-xs text-nowrap">1h ago</td>
                 </tr>
               </tbody>
             </table>
           </div>
        </div>
        
        <div className="glass-panel flex flex-col lg:col-span-3 min-h-[400px]">
           <div className="p-6 border-b border-white/5 bg-white/[0.02]">
             <h2 className="text-lg font-semibold text-white">Quick Actions</h2>
             <p className="text-sm text-muted-foreground mt-1">Direct commands to the local AGDI Daemon</p>
           </div>
           
           <div className="p-6 flex flex-col gap-4">
              <button onClick={handleSpawn} className="group relative overflow-hidden bg-cyan-950/30 hover:bg-cyan-900/40 border border-cyan-500/30 w-full flex flex-col gap-2 p-4 rounded-xl transition-all hover:border-cyan-400/50 text-left">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-cyan-500/20 rounded-lg text-cyan-400 group-hover:scale-110 transition-transform">
                    <Bot className="w-5 h-5" />
                  </div>
                  <div className="font-semibold text-white">Spawn Parallel Agent</div>
                </div>
                <p className="text-xs text-cyan-100/60 ml-12">Allocate a new autonomous worker thread to handle background research or generation.</p>
              </button>

              <button onClick={handleCommand} className="group relative overflow-hidden bg-white/5 hover:bg-white/10 border border-white/10 w-full flex flex-col gap-2 p-4 rounded-xl transition-all hover:border-white/20 text-left">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-500/20 rounded-lg text-purple-400 group-hover:scale-110 transition-transform">
                    <TerminalSquare className="w-5 h-5" />
                  </div>
                  <div className="font-semibold text-white">Run CLI Diagnostics</div>
                </div>
                <p className="text-xs text-muted-foreground ml-12">Execute `agdi doctor` to verify local dependencies and environment variables.</p>
              </button>

              <div className="mt-auto pt-4 border-t border-white/5">
                <button onClick={handleEmergencyStop} className="group bg-red-950/30 hover:bg-red-900/50 border border-red-900 w-full flex items-center justify-between p-4 rounded-xl transition-all">
                  <div className="flex items-center gap-3 text-red-500 font-medium">
                    <Power className="w-5 h-5 group-hover:animate-pulse" /> Emergency Pause All
                  </div>
                  <ChevronRight className="w-4 h-4 text-red-700 group-hover:text-red-500 transition-colors" />
                </button>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
