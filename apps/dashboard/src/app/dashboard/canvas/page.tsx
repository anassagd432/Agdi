"use client";

import React, { useState } from 'react';
import { Palette, Code2, Play, Eye, Maximize2, Minimize2, Download, Copy, RefreshCw, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export default function CanvasViewPage() {
  const [activeTab, setActiveTab] = useState<'code' | 'preview'>('preview');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const mockCode = `export default function AgentGeneratedComponent() {
  return (
    <div className="p-8 bg-zinc-950 rounded-xl border border-white/10 shadow-2xl">
       <div className="flex items-center justify-between mb-8">
         <h2 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
            Autonomous Form
         </h2>
         <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 text-xs font-medium rounded-full border border-emerald-500/20">
            Generated
         </span>
       </div>
       
       <div className="space-y-4">
         <div>
           <label className="text-sm font-medium text-white/70 block mb-1.5">Agent Assignment</label>
           <input type="text" className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-cyan-500/50 outline-none transition-colors" defaultValue="Analyze competitive landscape" />
         </div>
         <div>
           <label className="text-sm font-medium text-white/70 block mb-1.5">Priority Level</label>
           <select className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-cyan-500/50 outline-none transition-colors">
             <option>High (Immediate)</option>
             <option>Medium (Queued)</option>
             <option>Low (Background)</option>
           </select>
         </div>
       </div>

       <button className="mt-8 w-full bg-cyan-500 hover:bg-cyan-400 text-black font-semibold py-2.5 rounded-lg transition-colors">
         Dispatch Task
       </button>
    </div>
  );
}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(mockCode);
    toast.success("Code copied to clipboard!");
  };

  const handleRegenerate = () => {
    setIsGenerating(true);
    toast.info("Agent is regenerating the component...");
    setTimeout(() => {
      setIsGenerating(false);
      toast.success("Component regenerated successfully.");
    }, 2000);
  };

  return (
    <div className={`flex flex-col animate-in fade-in duration-500 ${isFullscreen ? 'fixed inset-4 z-50 bg-background/95 backdrop-blur-3xl rounded-2xl border border-white/10 shadow-2xl p-6' : 'h-[calc(100vh-6rem)]'}`}>
      
      {/* Header */}
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/10 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Palette className="w-6 h-6 text-purple-400" /> Visual Canvas
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Live rendering of agent-generated UI components.</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-black/40 rounded-lg border border-white/5 p-1 mr-4">
             <button 
               onClick={() => setActiveTab('preview')}
               className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${activeTab === 'preview' ? 'bg-white/10 text-white' : 'text-muted-foreground hover:text-white'}`}
             >
               <Eye className="w-4 h-4" /> Preview
             </button>
             <button 
               onClick={() => setActiveTab('code')}
               className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${activeTab === 'code' ? 'bg-white/10 text-white' : 'text-muted-foreground hover:text-white'}`}
             >
               <Code2 className="w-4 h-4" /> Code
             </button>
          </div>
          
          <button onClick={handleRegenerate} className="p-2 glass text-muted-foreground hover:text-white rounded-md transition-colors" title="Ask Agent to Regenerate">
             <RefreshCw className={`w-4 h-4 ${isGenerating ? 'animate-spin text-cyan-400' : ''}`} />
          </button>
          
          <button onClick={() => setIsFullscreen(!isFullscreen)} className="p-2 glass text-muted-foreground hover:text-white rounded-md transition-colors" title="Toggle Fullscreen">
             {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="flex-1 rounded-xl glass-panel overflow-hidden border border-white/10 flex flex-col relative shadow-inner bg-black/20">
        
        {/* Top Status Bar */}
        <div className="h-10 bg-black/60 border-b border-white/10 flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
            <span className="text-purple-400">Agent.Task.UI_Generation</span>
            <span>/</span>
            <span className="text-white">FormWidget.component.tsx</span>
          </div>

          <div className="flex items-center gap-3">
            {activeTab === 'code' && (
              <button onClick={handleCopy} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-white transition-colors">
                <Copy className="w-3 h-3" /> Copy
              </button>
            )}
            <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-white transition-colors" title="Download Component">
               <Download className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 relative overflow-hidden flex">
          
          {/* Code View */}
          {activeTab === 'code' && (
            <div className="flex-1 overflow-auto bg-[#0d1117] p-6 custom-scrollbar relative">
              <pre className="text-sm font-mono text-gray-300 leading-relaxed">
                <code>{mockCode}</code>
              </pre>
            </div>
          )}

          {/* Preview View */}
          {activeTab === 'preview' && (
            <div className="flex-1 overflow-auto bg-[url('/grid.svg')] bg-center p-8 lg:p-16 flex items-center justify-center relative">
              
              {/* Fake Generated Component Container */}
              <div className={`w-full max-w-lg transition-all duration-700 ${isGenerating ? 'scale-95 opacity-50 blur-sm' : 'scale-100 opacity-100 blur-0'}`}>
                {/* Embedded the mock code HTML structure directly here for visual representation without an actual bundler */}
                <div className="p-8 bg-black/80 backdrop-blur-xl rounded-xl border border-white/10 shadow-2xl relative overflow-hidden group">
                  
                  {/* Generation Scanline Effect */}
                  {isGenerating && (
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-500/20 to-transparent h-20 w-full animate-[scan_2s_ease-in-out_infinite]" />
                  )}

                  <div className="flex items-center justify-between mb-8 relative z-10">
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                        Autonomous Form
                    </h2>
                    <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 text-xs font-medium rounded-full border border-emerald-500/20">
                        Generated
                    </span>
                  </div>
                  
                  <div className="space-y-4 relative z-10">
                    <div>
                      <label className="text-sm font-medium text-white/70 block mb-1.5">Agent Assignment</label>
                      <input type="text" className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-cyan-500/50 outline-none transition-colors" defaultValue="Analyze competitive landscape" />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-white/70 block mb-1.5">Priority Level</label>
                      <select className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-cyan-500/50 outline-none transition-colors">
                        <option>High (Immediate)</option>
                        <option>Medium (Queued)</option>
                        <option>Low (Background)</option>
                      </select>
                    </div>
                  </div>

                  <button className="mt-8 relative z-10 w-full bg-cyan-500 hover:bg-cyan-400 text-black font-semibold py-2.5 rounded-lg transition-colors shadow-[0_0_15px_rgba(34,211,238,0.2)]">
                    Dispatch Task
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
