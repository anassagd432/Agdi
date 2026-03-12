"use client";

import React, { useState } from 'react';
import { Globe, ArrowLeft, ArrowRight, RotateCw, Lock, ShieldAlert, Monitor, CheckCircle2, ChevronRight, XCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function BrowserViewPage() {
  const [url, setUrl] = useState('https://agdi.ai/docs/reference/computer-use');
  const [isAgentControlling, setIsAgentControlling] = useState(true);

  const handleNavigate = (e: React.FormEvent) => {
    e.preventDefault();
    toast.info(`Agent instructed to navigate to: ${url}`);
  };

  const toggleControl = () => {
    setIsAgentControlling(!isAgentControlling);
    toast.success(isAgentControlling ? "Manual browser control enabled." : "Agent autonomous control resumed.");
  };

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/10 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Globe className="w-6 h-6 text-cyan-400" /> Agent Browser
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Live view of the autonomous web environment.</p>
        </div>

        <div className="flex items-center gap-3 bg-black/40 p-1.5 rounded-lg border border-white/5">
           <button 
             onClick={toggleControl}
             className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${isAgentControlling ? 'bg-cyan-500 text-black shadow-md shadow-cyan-500/20' : 'text-muted-foreground hover:bg-white/10'}`}
           >
              <Monitor className="w-4 h-4" /> Agent Control
           </button>
           <button 
             onClick={toggleControl}
             className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${!isAgentControlling ? 'bg-white/10 text-white' : 'text-muted-foreground hover:bg-white/10'}`}
           >
              Manual
           </button>
        </div>
      </div>

      {/* Browser Chrome Container */}
      <div className="flex-1 rounded-xl glass-panel overflow-hidden border border-white/10 flex flex-col relative shadow-2xl">
        
        {/* URL Bar Area */}
        <div className="bg-black/80 border-b border-white/10 p-3 flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-1">
            <button className="p-1.5 hover:bg-white/10 rounded text-muted-foreground transition-colors"><ArrowLeft className="w-4 h-4" /></button>
            <button className="p-1.5 hover:bg-white/10 rounded text-white/30 transition-colors"><ArrowRight className="w-4 h-4" /></button>
            <button className="p-1.5 hover:bg-white/10 rounded text-muted-foreground transition-colors"><RotateCw className="w-4 h-4" /></button>
          </div>

          <form onSubmit={handleNavigate} className="flex-1 relative group">
            <div className="absolute left-3 top-1/2 -translate-y-1/2">
              <Lock className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <input 
              type="text" 
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={isAgentControlling}
              className={`w-full bg-white/5 border border-white/10 rounded-full py-1.5 pl-9 pr-4 text-sm text-white focus:outline-none focus:border-cyan-500/50 transition-all ${isAgentControlling ? 'opacity-80 cursor-not-allowed' : ''}`}
            />
          </form>

          <div className="flex items-center gap-2 ml-2">
            <button className="p-1.5 hover:bg-white/10 rounded text-muted-foreground transition-colors" title="Extensions">
              <ShieldAlert className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Viewport Area */}
        <div className="flex-1 relative bg-[#0e1117] overflow-hidden flex flex-col isolate">
            
            {/* Overlay if Agent is controlling */}
            {isAgentControlling && (
              <div className="absolute top-4 right-4 z-10 flex items-center gap-2 bg-black/80 border border-cyan-500/30 text-cyan-400 px-3 py-1.5 rounded-full text-xs font-medium backdrop-blur-md shadow-lg pointer-events-none">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                </span>
                Agent Orchestrating View
              </div>
            )}

            {/* FAKE AGDI DOCS CONTENT (Simulating iframe) */}
            <div className={`flex-1 overflow-auto p-12 transition-opacity duration-300 ${isAgentControlling ? 'opacity-90 grayscale-[20%]' : ''}`}>
               <div className="max-w-3xl mx-auto space-y-6">
                 <div className="flex items-center gap-2 text-cyan-400 font-medium mb-8">
                   <Globe className="w-5 h-5" /> AGDI Documentation
                 </div>
                 <h1 className="text-4xl font-bold text-white tracking-tight">Computer Use (MCP)</h1>
                 <p className="text-xl text-muted-foreground leading-relaxed">
                   The Model Context Protocol allows the AGDI agent to orchestrate the host operating system, navigating browsers, clicking elements, and reading visual DOM structures autonomously.
                 </p>
                 
                 <div className="p-6 bg-white/5 border border-white/10 rounded-xl mt-8">
                   <h3 className="font-semibold text-white mb-4">Live Agent Task</h3>
                   <ul className="space-y-3">
                     <li className="flex items-center gap-3 text-sm text-muted-foreground">
                       <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                       Navigate to reference documentation.
                     </li>
                     <li className="flex items-center gap-3 text-sm text-muted-foreground">
                       <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                       Extract initialization parameters for `AgentBrowserView`.
                     </li>
                     <li className="flex items-center gap-3 text-sm text-white font-medium bg-white/5 p-2 rounded -ml-2">
                       <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin shrink-0" />
                       Generating React component structure...
                     </li>
                     <li className="flex items-center gap-3 text-sm text-muted-foreground opacity-50">
                       <div className="w-4 h-4 rounded-full border border-white/20 shrink-0" />
                       Verify implementation.
                     </li>
                   </ul>
                 </div>
                 
                 <div className="mt-8 space-y-4">
                   <h3 className="text-xl font-semibold text-white">Installation</h3>
                   <div className="bg-black border border-white/10 p-4 rounded-lg font-mono text-sm text-cyan-400">
                     pnpm add @agdi/mcp-computer-use
                   </div>
                 </div>
               </div>
            </div>

            {/* Fake Agent Mouse Cursor */}
            {isAgentControlling && (
               <div className="absolute top-[45%] left-[55%] pointer-events-none drop-shadow-md z-20 motion-safe:animate-[bounce_3s_ease-in-out_infinite]">
                 <svg className="w-6 h-6 text-white rotate-[-20deg]" fill="currentColor" viewBox="0 0 24 24" stroke="black" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.042 21.672 13.684 16.6m0 0-2.51 2.225.569-9.47 5.227 7.917-3.286-.672ZM12 2.25V4.5m5.834.166-1.591 1.591M20.25 10.5H18M7.757 14.743l-1.59 1.59M6 10.5H3.75m4.007-4.243-1.59-1.59" />
                 </svg>
               </div>
            )}
        </div>
      </div>
    </div>
  );
}
