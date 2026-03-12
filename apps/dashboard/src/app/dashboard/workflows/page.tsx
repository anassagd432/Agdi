"use client";

import React from 'react';
import { GitMerge, Plus, Play, MoreHorizontal, Settings, FileBox, Database, Globe, PenTool } from 'lucide-react';

export default function WorkflowsPage() {
  
  // Simulated UI representing a node-based workflow
  // For a real app, you would use ReactFlow for this. We will simulate a visual pipeline.

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] animate-in fade-in duration-500 max-w-7xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            <GitMerge className="w-8 h-8 text-cyan-400" /> Multi-Agent Workflows
          </h1>
          <p className="text-muted-foreground mt-2">
            Design and monitor complex pipelines where agents pass context and data between each other.
          </p>
        </div>
        
        <div className="flex space-x-3">
          <button className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-sm font-medium py-2 px-4 rounded-lg flex items-center gap-2 transition-colors">
            <Play className="w-4 h-4 fill-current" /> Execute Pipeline
          </button>
          <button className="bg-cyan-500 hover:bg-cyan-400 text-black text-sm font-semibold py-2 px-4 rounded-lg flex items-center gap-2 transition-colors">
            <Plus className="w-4 h-4" /> New Workflow
          </button>
        </div>
      </div>

      <div className="flex gap-6 h-full mt-6">
        
        {/* Sidebar Sidebar : List of Pipelines */}
        <div className="w-64 flex-shrink-0 flex flex-col gap-2">
           <div className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-2 mb-2">My Pipelines</div>
           
           <div className="glass-panel p-3 rounded-lg border border-cyan-500/30 bg-cyan-500/5 cursor-pointer">
              <div className="font-semibold text-white text-sm">Content Research & Draft</div>
              <div className="text-xs text-gray-400 mt-1 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> Active (3 agents)</div>
           </div>

           <div className="p-3 rounded-lg border border-transparent hover:border-white/5 hover:bg-white/5 cursor-pointer transition-colors">
              <div className="font-medium text-gray-300 text-sm">Automated Code Review</div>
              <div className="text-xs text-gray-500 mt-1 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-600"></span> Draft (2 agents)</div>
           </div>

           <div className="p-3 rounded-lg border border-transparent hover:border-white/5 hover:bg-white/5 cursor-pointer transition-colors">
              <div className="font-medium text-gray-300 text-sm">Support Ticket Triaging</div>
              <div className="text-xs text-gray-500 mt-1 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400"></span> Paused (4 agents)</div>
           </div>
        </div>

        {/* Visual Pipeline Editor Container */}
        <div className="flex-1 glass-panel rounded-xl border border-white/5 relative bg-[url('https://transparenttextures.com/patterns/cubes.png')] bg-repeat relative overflow-hidden">
           {/* Grid Background Mock */}
           <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>
           
           {/* Editor Toolbar */}
           <div className="absolute top-4 right-4 flex bg-black/50 backdrop-blur-md border border-white/10 rounded-lg p-1 z-10">
              <button className="p-2 text-gray-400 hover:text-white transition-colors" title="Settings"><Settings className="w-4 h-4" /></button>
              <button className="p-2 text-gray-400 hover:text-white transition-colors" title="Export as JSON"><FileBox className="w-4 h-4" /></button>
           </div>

           {/* Workflow Nodes (Simulated ReactFlow) */}
           <div className="absolute inset-0 flex items-center justify-center p-12">
              <div className="relative w-full max-w-4xl h-full flex items-center gap-12 ml-16">
                 
                 {/* Node 1 */}
                 <div className="glass-panel p-4 rounded-xl border border-purple-500/30 w-64 shadow-[0_0_20px_rgba(168,85,247,0.1)] relative z-10 bg-black/60">
                    <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-blue-500 shadow-[0_0_10px_#3b82f6]"></div> {/* Input Port */}
                    <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-cyan-500 shadow-[0_0_10px_#22d3ee]"></div> {/* Output Port */}
                    
                    <div className="flex items-center gap-3 mb-3 border-b border-white/10 pb-3">
                       <div className="p-2 bg-purple-500/20 rounded-lg"><Globe className="w-5 h-5 text-purple-400" /></div>
                       <div>
                          <div className="font-bold text-white text-sm">Researcher Agent</div>
                          <div className="text-xs text-gray-400">GPT-4o</div>
                       </div>
                    </div>
                    <div className="text-xs text-gray-300">
                      Gathers context from Arxiv and internal docs based on initial prompt.
                    </div>
                 </div>

                 {/* Connection Line */}
                 <div className="flex-1 h-[2px] bg-gradient-to-r from-cyan-500/50 to-orange-500/50 relative">
                    {/* Animated Data Particle */}
                    <div className="absolute top-1/2 left-0 w-2 h-2 rounded-full bg-white shadow-[0_0_8px_#fff] -translate-y-1/2 animate-[ping_2s_infinite]"></div>
                    <div className="absolute top-1/2 left-0 w-2 h-2 rounded-full bg-white shadow-[0_0_8px_#fff] -translate-y-1/2 animate-[pulse_2s_infinite]" style={{ animationDuration: '2s', left: '50%' }}></div>
                 </div>

                 {/* Node 2 */}
                 <div className="glass-panel p-4 rounded-xl border border-orange-500/30 w-64 shadow-[0_0_20px_rgba(249,115,22,0.1)] relative z-10 bg-black/60 translate-y-20">
                    <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-cyan-500 shadow-[0_0_10px_#22d3ee]"></div> {/* Input Port */}
                    <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_10px_#10b981]"></div> {/* Output Port */}
                    
                    <div className="flex items-center gap-3 mb-3 border-b border-white/10 pb-3">
                       <div className="p-2 bg-orange-500/20 rounded-lg"><PenTool className="w-5 h-5 text-orange-400" /></div>
                       <div>
                          <div className="font-bold text-white text-sm">Writer Agent</div>
                          <div className="text-xs text-gray-400">Claude 3.5 Sonnet</div>
                       </div>
                    </div>
                    <div className="text-xs text-gray-300">
                      Compiles research payload into a formatted technical draft.
                    </div>
                 </div>

                 {/* Connection Line */}
                 <div className="flex-1 h-[2px] bg-gradient-to-r from-emerald-500/50 to-blue-500/50 relative translate-y-10 -rotate-12">
                 </div>

                 {/* Node 3 */}
                 <div className="glass-panel p-4 rounded-xl border border-blue-500/30 w-64 shadow-[0_0_20px_rgba(59,130,246,0.1)] relative z-10 bg-black/60">
                    <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_10px_#10b981]"></div> {/* Input Port */}
                    <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-gray-500"></div> {/* Output Port */}
                    
                    <div className="flex items-center gap-3 mb-3 border-b border-white/10 pb-3">
                       <div className="p-2 bg-blue-500/20 rounded-lg"><Database className="w-5 h-5 text-blue-400" /></div>
                       <div>
                          <div className="font-bold text-white text-sm">Storage Tool</div>
                          <div className="text-xs text-gray-400">Integration API</div>
                       </div>
                    </div>
                    <div className="text-xs text-gray-300">
                      Saves the final draft to Notion Workspace / Docs.
                    </div>
                 </div>

              </div>
           </div>

           {/* Zoom Controls Overlay */}
           <div className="absolute bottom-4 left-4 flex bg-black/50 backdrop-blur-md border border-white/10 rounded-lg p-1 z-10 shadow-lg text-sm text-gray-400">
              <button className="px-3 py-1 hover:text-white transition-colors border-r border-white/10">-</button>
              <div className="px-3 py-1 font-mono text-xs flex items-center">100%</div>
              <button className="px-3 py-1 hover:text-white transition-colors border-l border-white/10">+</button>
           </div>
        </div>

      </div>

    </div>
  );
}
