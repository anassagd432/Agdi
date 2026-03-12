"use client";

import React, { useState } from 'react';
import { Activity, Clock, Database, ChevronRight, ChevronDown, CheckCircle2, XCircle, AlertCircle, Terminal, Command } from 'lucide-react';

interface TraceLog {
  id: string;
  type: 'agent' | 'llm' | 'tool';
  name: string;
  latencyMs: number;
  tokens?: { prompt: number; completion: number };
  status: 'success' | 'error' | 'pending';
  timestamp: string;
  input: string;
  output?: string;
  children?: TraceLog[];
}

export default function TracesPage() {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['run-1']));

  const toggleNode = (id: string) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  const sampleTraces: TraceLog[] = [
    {
      id: 'run-1',
      type: 'agent',
      name: 'GitHub PR Review Agent',
      latencyMs: 4250,
      status: 'success',
      timestamp: '14:23:01.220',
      input: 'Review PR #412 on repo agdi/core',
      children: [
        {
          id: 'tool-1',
          type: 'tool',
          name: 'github_fetch_pr',
          latencyMs: 850,
          status: 'success',
          timestamp: '14:23:01.300',
          input: '{"repo": "agdi/core", "pr_number": 412}',
          output: '{"title": "Fix memory leak in gateway", "files_changed": 3, "diff": "..."}'
        },
        {
          id: 'llm-1',
          type: 'llm',
          name: 'claude-3-5-sonnet-20241022',
          latencyMs: 2100,
          tokens: { prompt: 1450, completion: 420 },
          status: 'success',
          timestamp: '14:23:02.150',
          input: 'Analyze the following PR diff for memory leaks...',
          output: 'The diff resolves the leak by properly closing the WebSocket connection...'
        },
        {
          id: 'tool-2',
          type: 'tool',
          name: 'github_post_comment',
          latencyMs: 1200,
          status: 'success',
          timestamp: '14:23:04.250',
          input: '{"comment": "Looks good. The WS cleanup is handled correctly."}',
          output: '{"status": "posted", "url": "https://github.com/..."}'
        }
      ]
    },
    {
      id: 'run-2',
      type: 'agent',
      name: 'Database Migration Assistant',
      latencyMs: 840,
      status: 'error',
      timestamp: '14:20:11.000',
      input: 'Run schema updates for the user table',
      children: [
        {
          id: 'tool-3',
          type: 'tool',
          name: 'execute_sql',
          latencyMs: 800,
          status: 'error',
          timestamp: '14:20:11.040',
          input: 'ALTER TABLE users ADD COLUMN stripe_id VARCHAR(255);',
          output: 'Error: Cannot alter table "users" because it is locked by another process.'
        }
      ]
    }
  ];

  const getIcon = (type: string, status: string) => {
    if (status === 'error') return <XCircle className="w-4 h-4 text-red-500" />;
    switch (type) {
      case 'agent': return <Activity className="w-4 h-4 text-purple-400" />;
      case 'llm': return <Database className="w-4 h-4 text-blue-400" />;
      case 'tool': return <Command className="w-4 h-4 text-emerald-400" />;
      default: return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
    }
  };

  const renderTraceNode = (node: TraceLog, depth: number = 0) => {
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.children && node.children.length > 0;

    return (
      <div key={node.id} className="font-mono text-sm">
        <div 
          className={`flex items-center gap-3 py-2 px-4 hover:bg-white/5 cursor-pointer border-b border-white/5 transition-colors ${depth === 0 ? 'bg-black/20' : ''}`}
          style={{ paddingLeft: `${(depth * 24) + 16}px` }}
          onClick={() => hasChildren && toggleNode(node.id)}
        >
          {hasChildren ? (
            isExpanded ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />
          ) : (
            <div className="w-4" /> // spacer
          )}
          
          {getIcon(node.type, node.status)}
          
          <span className={`font-semibold ${node.status === 'error' ? 'text-red-400' : 'text-gray-200'}`}>
            {node.name}
          </span>
          
          <span className="text-xs text-gray-500 uppercase tracking-widest bg-white/5 px-2 py-0.5 rounded ml-2">
            {node.type}
          </span>

          <div className="ml-auto flex items-center gap-6 text-xs text-gray-400">
            {node.tokens && (
              <span className="flex items-center gap-1" title="Tokens (Prompt / Completion)">
                <Terminal className="w-3.5 h-3.5" />
                {node.tokens.prompt} / {node.tokens.completion}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {(node.latencyMs / 1000).toFixed(2)}s
            </span>
            <span className="text-gray-600">{node.timestamp}</span>
          </div>
        </div>

        {isExpanded && node.children && (
          <div className="border-l border-white/10 ml-[22px]">
            {node.children.map(child => renderTraceNode(child, depth + 1))}
          </div>
        )}
        
        {isExpanded && !hasChildren && (
          <div 
            className="p-4 bg-black/40 border-b border-white/5 text-xs text-gray-300 grid grid-cols-2 gap-4"
            style={{ paddingLeft: `${(depth * 24) + 48}px` }}
          >
            <div>
              <div className="text-gray-500 mb-1 uppercase tracking-wider font-semibold">Input</div>
              <div className="whitespace-pre-wrap break-all bg-black/50 p-2 rounded border border-white/5 font-mono">{node.input}</div>
            </div>
            {node.output && (
              <div>
                <div className="text-gray-500 mb-1 uppercase tracking-wider font-semibold">Output</div>
                <div className={`whitespace-pre-wrap break-all bg-black/50 p-2 rounded border border-white/5 font-mono ${node.status === 'error' ? 'text-red-300 border-red-500/30' : ''}`}>
                  {node.output}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] animate-in fade-in duration-500 max-w-7xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            <Activity className="w-8 h-8 text-cyan-400" /> Execution Traces
          </h1>
          <p className="text-muted-foreground mt-2">
            Observe multi-agent workflows, LLM prompts, tool invocations, and latencies in real-time.
          </p>
        </div>
        
        <div className="flex space-x-2">
          <button className="bg-white/5 hover:bg-white/10 text-white border border-white/10 text-sm font-medium py-2 px-4 rounded-lg flex items-center gap-2 transition-colors">
            <Clock className="w-4 h-4" /> Filtering: Last 24h
          </button>
        </div>
      </div>

      {/* Waterfall Trace View */}
      <div className="glass-panel rounded-xl border border-white/10 flex-1 overflow-hidden flex flex-col">
        {/* Table Header */}
        <div className="flex items-center gap-3 py-3 px-4 border-b border-white/10 bg-black/60 text-xs font-semibold text-gray-400 uppercase tracking-widest pl-10">
           <div className="flex-1">Trace Step</div>
           <div className="w-24 text-right">Tokens</div>
           <div className="w-24 text-right">Latency</div>
           <div className="w-24 text-right">Time</div>
        </div>

        {/* Tree Content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden pb-4">
          {sampleTraces.map(trace => renderTraceNode(trace, 0))}
        </div>
      </div>
      
    </div>
  );
}
