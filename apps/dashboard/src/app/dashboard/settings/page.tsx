"use client";

import React, { useState } from 'react';
import { Settings2, Key, MessageSquare, Shield, Webhook, Save, Mic, Wrench, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function SettingsPage() {
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      toast.success("Configuration securely saved to local daemon.");
    }, 1200);
  };

  const handleToggle = (setting: string) => {
    toast.success(`${setting} preference updated.`);
  };

  return (
    <div className="max-w-4xl space-y-8 pb-12 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-white mb-1">Configuration</h1>
        <p className="text-muted-foreground">Manage your AGDI daemon connections, LLM providers, and external channels.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mt-8">
        
        {/* Nav / Tabs Sidebar */}
        <div className="md:col-span-1 space-y-2 flex flex-col">
           <button className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium bg-cyan-500/10 text-cyan-400">
             <Settings2 className="w-4 h-4" /> System
           </button>
           <button className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium hover:bg-white/5 text-muted-foreground transition-colors">
             <Key className="w-4 h-4" /> Language Models
           </button>
           <button className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium hover:bg-white/5 text-muted-foreground transition-colors">
             <Mic className="w-4 h-4" /> Voice Integration
           </button>
           <button className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium hover:bg-white/5 text-muted-foreground transition-colors">
             <Wrench className="w-4 h-4" /> MCP Tools
           </button>
           <button className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium hover:bg-white/5 text-muted-foreground transition-colors">
             <MessageSquare className="w-4 h-4" /> Channels
           </button>
           <button className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium hover:bg-white/5 text-muted-foreground transition-colors">
             <Shield className="w-4 h-4" /> Advanced
           </button>
        </div>

        {/* Settings Content Area */}
        <div className="md:col-span-3 space-y-6 glass-panel p-6">
           {/* Section: AGDI Daemon */}
           <div className="space-y-4">
             <h3 className="text-lg font-medium text-white flex items-center gap-2">
               <Settings2 className="w-5 h-5 text-cyan-400" />
               Local Daemon Connection
             </h3>
             <p className="text-sm text-muted-foreground mb-4">
               Configure how the dashboard connects to your local AGDI daemon environment.
             </p>
             <div className="grid gap-4">
               <div className="grid gap-2">
                 <label className="text-sm font-medium text-white/80">Gateway URL</label>
                 <input type="text" defaultValue="http://localhost:18789" className="glass bg-black/20 border-white/10 px-3 py-2 rounded-md outline-none text-white focus:border-cyan-500/50 transition-colors" />
               </div>
               <div className="flex items-center gap-3">
                 <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
                 <span className="text-sm text-cyan-400">Connected to 18789</span>
               </div>
             </div>
           </div>

           <div className="h-px bg-white/10 w-full my-8" />

           {/* Section: Language Models */}
           <div className="space-y-4">
             <h3 className="text-lg font-medium text-white flex items-center gap-2">
               <Key className="w-5 h-5 text-cyan-400" />
               Language Models
             </h3>
             <p className="text-sm text-muted-foreground mb-4">
               API keys are stored securely on your local AGDI daemon and are never sent to external servers.
             </p>
             <div className="grid gap-6">
               <div className="grid gap-2">
                 <label className="text-sm font-medium text-white/80 flex justify-between">
                    <span>OpenAI API Key</span>
                    <span className="text-xs text-green-400">Configured</span>
                 </label>
                 <input type="password" defaultValue="sk-***********************************" className="glass bg-white/5 border-white/10 px-3 py-2 rounded-md outline-none focus:border-cyan-500/50 text-white font-mono" />
               </div>
               
               <div className="grid gap-2">
                 <label className="text-sm font-medium text-white/80 flex justify-between">
                    <span>Anthropic API Key</span>
                    <span className="text-xs text-muted-foreground">Not Configured</span>
                 </label>
                 <input type="password" placeholder="sk-ant-..." className="glass bg-white/5 border-white/10 px-3 py-2 rounded-md outline-none focus:border-cyan-500/50 text-white font-mono" />
               </div>

               <div className="grid gap-2">
                 <label className="text-sm font-medium text-white/80 flex justify-between">
                    <span>Google Gemini API Key</span>
                    <span className="text-xs text-muted-foreground">Not Configured</span>
                 </label>
                 <input type="password" placeholder="AIzaSy..." className="glass bg-white/5 border-white/10 px-3 py-2 rounded-md outline-none focus:border-cyan-500/50 text-white font-mono" />
               </div>

               <div className="grid gap-2">
                 <label className="text-sm font-medium text-white/80 flex justify-between">
                    <span>Groq API Key (Ultra-fast inference)</span>
                    <span className="text-xs text-muted-foreground">Not Configured</span>
                 </label>
                 <input type="password" placeholder="gsk_..." className="glass bg-white/5 border-white/10 px-3 py-2 rounded-md outline-none focus:border-cyan-500/50 text-white font-mono" />
               </div>

               <div className="grid gap-2">
                 <label className="text-sm font-medium text-white/80 flex justify-between">
                    <span>Local Ollama Endpoint URL</span>
                    <span className="text-xs text-green-400">Configured</span>
                 </label>
                 <input type="text" defaultValue="http://localhost:11434" className="glass bg-white/5 border-white/10 px-3 py-2 rounded-md outline-none focus:border-cyan-500/50 text-white font-mono" />
               </div>
             </div>
           </div>

           <div className="h-px bg-white/10 w-full my-8" />

           {/* Section: Voice Integration */}
           <div className="space-y-4">
             <h3 className="text-lg font-medium text-white flex items-center gap-2">
               <Mic className="w-5 h-5 text-cyan-400" />
               Voice & Audio Settings
             </h3>
             <p className="text-sm text-muted-foreground mb-4">
               Configure Text-to-Speech (TTS) and Speech-to-Text (STT) capabilities for voice-enabled agents.
             </p>
             <div className="grid gap-6">
               <div className="grid gap-2">
                 <label className="text-sm font-medium text-white/80 flex justify-between">
                    <span>ElevenLabs API Key (TTS)</span>
                    <span className="text-xs text-green-400">Configured</span>
                 </label>
                 <input type="password" defaultValue="**********************" className="glass bg-white/5 border-white/10 px-3 py-2 rounded-md outline-none focus:border-cyan-500/50 text-white font-mono" />
                 <div className="flex gap-4 mt-2">
                   <div className="flex-1 grid gap-2">
                     <label className="text-xs text-muted-foreground">Default Voice ID</label>
                     <input type="text" defaultValue="pNInz6obbf5AWBMy" className="glass bg-white/5 border-white/10 px-3 py-2 rounded-md outline-none focus:border-cyan-500/50 text-sm text-white font-mono" />
                   </div>
                 </div>
               </div>
               
               <div className="grid gap-2">
                 <label className="text-sm font-medium text-white/80 flex justify-between">
                    <span>OpenAI Whisper Endpoint (STT)</span>
                    <span className="text-xs text-muted-foreground">Not Configured</span>
                 </label>
                 <input type="text" placeholder="https://api.openai.com/v1/audio/transcriptions" className="glass bg-white/5 border-white/10 px-3 py-2 rounded-md outline-none focus:border-cyan-500/50 text-sm text-white font-mono" />
               </div>
             </div>
           </div>

           <div className="h-px bg-white/10 w-full my-8" />

           {/* Section: MCP Tools */}
           <div className="space-y-4">
             <h3 className="text-lg font-medium text-white flex items-center gap-2">
               <Wrench className="w-5 h-5 text-cyan-400" />
               Model Context Protocol (MCP) Tools
             </h3>
             <p className="text-sm text-muted-foreground mb-4">
               Manage the tool sets available to autonomous agents running on this system.
             </p>
             <div className="grid gap-4">
               <div className="flex items-center justify-between p-4 rounded-lg bg-black/20 border border-white/5">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-white flex items-center gap-2 cursor-default">
                      <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
                      Local File System Access
                    </span>
                    <span className="text-xs text-muted-foreground">Allows agents to read/write workspace files</span>
                  </div>
                  <div className="flex items-center">
                    <div onClick={() => handleToggle("Local File System")} className="w-10 h-5 bg-cyan-500 rounded-full relative cursor-pointer shadow-[0_0_10px_rgba(34,211,238,0.2)]">
                      <div className="w-4 h-4 bg-white rounded-full absolute right-0.5 top-0.5"></div>
                    </div>
                  </div>
               </div>
               
               <div className="flex items-center justify-between p-4 rounded-lg bg-black/20 border border-white/5">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-white flex items-center gap-2 cursor-default">
                      <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
                      Terminal / Command Execution
                    </span>
                    <span className="text-xs text-muted-foreground">High risk. Allows agent to execute bash/PowerShell</span>
                  </div>
                  <div className="flex items-center">
                    <div onClick={() => handleToggle("Terminal Execution")} className="w-10 h-5 bg-cyan-500 rounded-full relative cursor-pointer shadow-[0_0_10px_rgba(34,211,238,0.2)]">
                      <div className="w-4 h-4 bg-white rounded-full absolute right-0.5 top-0.5"></div>
                    </div>
                  </div>
               </div>

               <div className="flex items-center justify-between p-4 rounded-lg bg-black/20 border border-white/5 opacity-60">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-white">Docker Integration</span>
                    <span className="text-xs text-muted-foreground">Allows execution of code in isolated sandboxes</span>
                  </div>
                  <div className="flex items-center">
                    <div onClick={() => handleToggle("Docker Integration")} className="w-10 h-5 bg-white/10 rounded-full relative cursor-pointer">
                      <div className="w-4 h-4 bg-white/50 rounded-full absolute left-0.5 top-0.5"></div>
                    </div>
                  </div>
               </div>
             </div>
           </div>

           <div className="h-px bg-white/10 w-full my-8" />

           {/* Section: Channels */}
           <div className="space-y-4">
             <h3 className="text-lg font-medium text-white flex items-center gap-2">
               <Webhook className="w-5 h-5 text-cyan-400" />
               Messaging Channels
             </h3>
             <p className="text-sm text-muted-foreground mb-4">
               Configure webhooks and bot tokens for messaging platforms.
             </p>
             <div className="grid gap-4">
               <div className="flex items-center justify-between p-4 rounded-lg bg-black/20 border border-white/5">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-white">Discord Bot Integration</span>
                    <span className="text-xs text-muted-foreground">Forward AGDI alerts to Discord channels</span>
                  </div>
                  <button className="text-xs bg-cyan-500/20 text-cyan-400 px-3 py-1.5 rounded-md hover:bg-cyan-500/30 transition-colors">
                    Configure
                  </button>
               </div>
               <div className="flex items-center justify-between p-4 rounded-lg bg-black/20 border border-white/5">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-white">Slack App</span>
                    <span className="text-xs text-muted-foreground">Receive context-aware pings on Slack</span>
                  </div>
                  <button className="text-xs bg-white/10 text-white px-3 py-1.5 rounded-md hover:bg-white/20 transition-colors">
                    Add
                  </button>
               </div>
             </div>
           </div>

           {/* Submit */}
           <div className="pt-6 flex justify-end">
             <button 
               onClick={handleSave}
               disabled={isSaving}
               className={`glass-button px-6 py-2.5 rounded-md text-sm font-medium flex items-center gap-2 ${isSaving ? 'opacity-70 cursor-not-allowed' : ''}`}
             >
               {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
               {isSaving ? 'Saving...' : 'Save Changes'}
             </button>
           </div>
        </div>
      </div>
    </div>
  );
}
