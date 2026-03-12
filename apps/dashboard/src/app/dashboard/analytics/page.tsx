"use client";

import React from 'react';
import { BarChart, TrendingUp, DollarSign, Activity, Zap, HardDrive } from 'lucide-react';

export default function AnalyticsPage() {
  
  // Simulated data for the bar charts
  const tokenData = [40, 70, 45, 90, 65, 110, 85];
  const maxToken = Math.max(...tokenData);

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-500 max-w-7xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            <BarChart className="w-8 h-8 text-cyan-400" /> Analytics & Cost
          </h1>
          <p className="text-muted-foreground mt-2">
            Track token usage, LLM API spend, and overall agent fleet efficiency.
          </p>
        </div>
        
        <div className="flex bg-black/40 border border-white/10 rounded-lg p-1">
           <button className="px-3 py-1.5 text-sm font-medium bg-white/10 text-white rounded-md">7 Days</button>
           <button className="px-3 py-1.5 text-sm font-medium text-gray-400 hover:text-white transition-colors">30 Days</button>
           <button className="px-3 py-1.5 text-sm font-medium text-gray-400 hover:text-white transition-colors">All Time</button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
        <div className="glass-panel p-6 rounded-xl border border-white/5 relative overflow-hidden">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-cyan-500/10 rounded-full blur-2xl"></div>
          <p className="text-sm font-medium text-gray-400 flex items-center gap-2 mb-2"><DollarSign className="w-4 h-4 text-emerald-400" /> Total API Spend</p>
          <p className="text-3xl font-bold text-white">$142.50 <span className="text-xs text-emerald-400 font-normal ml-2">+12%</span></p>
        </div>
        
        <div className="glass-panel p-6 rounded-xl border border-white/5 relative overflow-hidden">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl"></div>
          <p className="text-sm font-medium text-gray-400 flex items-center gap-2 mb-2"><Activity className="w-4 h-4 text-purple-400" /> Total Tokens</p>
          <p className="text-3xl font-bold text-white">4.2M <span className="text-xs text-red-400 font-normal ml-2">-5%</span></p>
        </div>

        <div className="glass-panel p-6 rounded-xl border border-white/5 relative overflow-hidden">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl"></div>
          <p className="text-sm font-medium text-gray-400 flex items-center gap-2 mb-2"><HardDrive className="w-4 h-4 text-blue-400" /> Vector Database Storage</p>
          <p className="text-3xl font-bold text-white">1.8 GB <span className="text-xs text-emerald-400 font-normal ml-2">+2%</span></p>
        </div>

        <div className="glass-panel p-6 rounded-xl border border-white/5 relative overflow-hidden">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-orange-500/10 rounded-full blur-2xl"></div>
          <p className="text-sm font-medium text-gray-400 flex items-center gap-2 mb-2"><Zap className="w-4 h-4 text-orange-400" /> Agent Task Completion</p>
          <p className="text-3xl font-bold text-white">98.4% <span className="text-xs text-emerald-400 font-normal ml-2">Stable</span></p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Token Usage Chart (Simulated) */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-xl border border-white/5 flex flex-col h-80">
          <h3 className="font-semibold text-white mb-6 flex items-center gap-2">
             <TrendingUp className="w-4 h-4 text-cyan-400" /> Token Usage Over Time
          </h3>
          
          <div className="flex-1 flex items-end gap-4 mt-auto border-b border-white/10 pb-4 relative">
             {/* Y-axis labels */}
             <div className="absolute -left-2 top-0 bottom-4 flex flex-col justify-between text-xs text-gray-600 font-mono text-right pr-2">
               <span>120k</span>
               <span>60k</span>
               <span>0</span>
             </div>
             
             {/* Chart Bars */}
             <div className="flex-1 flex items-end justify-between h-full pl-8">
               {tokenData.map((val, idx) => (
                 <div key={idx} className="flex flex-col items-center gap-2 w-full px-2">
                   <div 
                     className="w-full bg-gradient-to-t from-cyan-500/20 to-cyan-400 rounded-t-sm relative group cursor-pointer transition-all hover:brightness-125"
                     style={{ height: `${(val / maxToken) * 100}%` }}
                   >
                     {/* Tooltip */}
                     <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity font-mono">
                       {val}k
                     </div>
                   </div>
                 </div>
               ))}
             </div>
          </div>
          
          {/* X-axis labels */}
          <div className="flex justify-between pl-8 mt-4 text-xs text-gray-500 font-medium">
             <span>Mon</span>
             <span>Tue</span>
             <span>Wed</span>
             <span>Thu</span>
             <span>Fri</span>
             <span>Sat</span>
             <span>Sun</span>
          </div>
        </div>

        {/* Cost Breakdown */}
        <div className="glass-panel p-6 rounded-xl border border-white/5 flex flex-col h-80">
           <h3 className="font-semibold text-white mb-6">Cost by Model Provider</h3>
           
           <div className="flex-1 flex flex-col justify-center gap-6">
              
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-300">OpenAI (GPT-4o)</span>
                  <span className="font-mono text-cyan-400">$85.20</span>
                </div>
                <div className="w-full h-2 bg-black/50 rounded-full overflow-hidden">
                  <div className="h-full bg-cyan-500 w-[60%]"></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-300">Anthropic (Claude 3.5 Sonnet)</span>
                  <span className="font-mono text-purple-400">$42.10</span>
                </div>
                <div className="w-full h-2 bg-black/50 rounded-full overflow-hidden">
                  <div className="h-full bg-purple-500 w-[30%]"></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-300">Local (Ollama / Llama 3)</span>
                  <span className="font-mono text-emerald-400">$0.00</span>
                </div>
                <div className="w-full h-2 bg-black/50 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 w-[8%]"></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-300">Google (Gemini 1.5 Pro)</span>
                  <span className="font-mono text-orange-400">$15.20</span>
                </div>
                <div className="w-full h-2 bg-black/50 rounded-full overflow-hidden">
                  <div className="h-full bg-orange-500 w-[12%]"></div>
                </div>
              </div>

           </div>
        </div>

      </div>

    </div>
  );
}
