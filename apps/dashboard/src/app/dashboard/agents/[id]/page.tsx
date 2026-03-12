"use client";

import React, { useState } from 'react';
import { Bot, User, Mic, Send, Paperclip, Terminal, Settings, ArrowLeft, MoreVertical, StopCircle } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';

// Mock chat history based on AGDI structure
const mockChat = [
  {
    id: 1,
    role: 'system',
    content: 'Agent Initialized. System prompt parsed. Ready for commands.'
  },
  {
    id: 2,
    role: 'user',
    content: 'Scan the current directory for React components that need refactoring.'
  },
  {
    id: 3,
    role: 'agent',
    content: 'I will scan `src/components` for any `.tsx` files that match the refactoring criteria. Initiating filesystem read...',
    toolCall: {
      name: 'fs_list_dir',
      args: '{ "path": "src/components" }'
    }
  },
  {
    id: 4,
    role: 'system',
    content: 'Tool fs_list_dir returned 12 files.'
  },
  {
    id: 5,
    role: 'agent',
    content: 'I found 12 components. Based on my analysis, `Header.tsx` and `Sidebar.tsx` appear to be using deprecated context patterns. Would you like me to rewrite them?'
  }
];

export default function AgentChatPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [messages, setMessages] = useState(mockChat);
  const [inputVal, setInputVal] = useState('');
  const [isRecording, setIsRecording] = useState(false);

  const handleSend = () => {
    if (!inputVal.trim()) return;
    setMessages([...messages, { id: Date.now(), role: 'user', content: inputVal }]);
    setInputVal('');
  };

  const handleVoiceToggle = () => {
    setIsRecording(!isRecording);
    if (!isRecording) {
      toast.info("Voice recording started. Speak your commands...");
    } else {
      toast.success("Voice input captured and transcribed.");
      setInputVal(prev => prev + " [Voice Input Translated]");
    }
  };

  const handleConsole = () => {
    router.push('/dashboard/console');
  };

  const handleConfig = () => {
    toast.info("Agent configuration panel is locked in active session.");
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/agents" className="p-2 glass hover:bg-white/10 rounded-md text-muted-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-500/20 text-cyan-400 rounded-lg">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-white tracking-tight">{params?.id || 'AGDI Autonomous Agent'}</h1>
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
              </div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Session Active • Core Execution Mode</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={handleConsole} className="glass-button px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-2">
            <Terminal className="w-4 h-4" /> Live Console
          </button>
          <button onClick={handleConfig} className="glass px-3 py-1.5 rounded-md text-sm font-medium hover:bg-white/10 text-muted-foreground flex items-center gap-2 transition-colors">
            <Settings className="w-4 h-4" /> Config
          </button>
        </div>
      </div>

      {/* Chat History */}
      <div className="flex-1 overflow-y-auto space-y-6 pr-4 custom-scrollbar pb-6">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            
            {msg.role !== 'user' && (
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1 ${msg.role === 'system' ? 'bg-zinc-800 text-zinc-400' : 'bg-cyan-500/20 text-cyan-400'}`}>
                {msg.role === 'system' ? <Terminal className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>
            )}

            <div className={`flex flex-col gap-2 max-w-[80%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="capitalize font-medium text-white/60">{msg.role}</span>
                <span>•</span>
                <span>Just now</span>
              </div>
              
              <div className={`px-4 py-3 rounded-xl text-sm leading-relaxed
                ${msg.role === 'user' ? 'bg-cyan-600 text-white rounded-tr-sm shadow-md' : 
                  msg.role === 'system' ? 'bg-black/40 text-muted-foreground border border-white/5 font-mono text-xs' : 
                  'bg-white/5 text-white/90 border border-white/10 rounded-tl-sm glass'}
              `}>
                <p>{msg.content}</p>

                {/* Tool Call Rendering */}
                {msg.toolCall && (
                  <div className="mt-3 bg-black/40 border border-white/5 rounded-md p-3 font-mono text-xs text-white/70">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-cyan-400 font-semibold">{msg.toolCall.name}</span>
                      <span className="text-muted-foreground animate-pulse">Executing...</span>
                    </div>
                    <code className="text-green-400 block whitespace-pre-wrap">{msg.toolCall.args}</code>
                  </div>
                )}
              </div>
            </div>

            {msg.role === 'user' && (
              <div className="w-8 h-8 rounded-full bg-slate-700 text-white flex items-center justify-center shrink-0 mt-1">
                <User className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Input Area */}
      <div className="shrink-0 mt-4">
        <div className="glass-panel p-2 flex items-end gap-2 relative bg-black/40 border-cyan-500/20 focus-within:border-cyan-500/50 focus-within:ring-1 focus-within:ring-cyan-500/20 transition-all">
          <button className="p-3 text-muted-foreground hover:text-white transition-colors shrink-0">
            <Paperclip className="w-5 h-5" />
          </button>
          
          <textarea 
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Instruct the agent or ask a question..." 
            className="flex-1 bg-transparent border-none outline-none text-white text-sm py-3 min-h-[50px] max-h-[200px] resize-none focus:ring-0 custom-scrollbar"
            rows={1}
          />

          <div className="flex items-center gap-2 p-1 self-center">
            <button 
              onClick={handleVoiceToggle}
              className={`p-2.5 rounded-lg transition-colors flex items-center justify-center ${isRecording ? 'bg-red-500/20 text-red-500 animate-pulse' : 'hover:bg-white/10 text-cyan-400'}`}
              title="Voice Prompting (STT)"
            >
              {isRecording ? <StopCircle className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>
            <button 
              onClick={handleSend}
              className={`p-2.5 rounded-lg transition-colors flex items-center justify-center ${inputVal.trim() ? 'bg-cyan-500 text-black hover:bg-cyan-400' : 'bg-white/5 text-muted-foreground cursor-not-allowed'}`}
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="flex justify-between items-center mt-2 px-2">
          <span className="text-xs text-muted-foreground">Use <kbd className="font-sans px-1 bg-white/10 rounded">Shift</kbd> + <kbd className="font-sans px-1 bg-white/10 rounded">Enter</kbd> for a new line</span>
          <span className="text-xs text-cyan-500/50">Agent Context Protocol</span>
        </div>
      </div>

    </div>
  );
}
