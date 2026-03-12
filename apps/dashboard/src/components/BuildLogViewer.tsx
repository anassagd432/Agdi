'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle, Terminal, XCircle, RefreshCw, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils'; // Assuming standard Shadcn utility path

interface LogEntry {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  timestamp: string;
}

const mockLogs: LogEntry[] = [
  { id: '1', type: 'info', message: 'Initializing build environment...', timestamp: '10:00:01' },
  { id: '2', type: 'info', message: 'Loading configuration...', timestamp: '10:00:02' },
  { id: '3', type: 'warning', message: 'Deprecation warning: "allow-build-scripts" config ignored', timestamp: '10:00:03' },
  { id: '4', type: 'error', message: 'JSONParseError: Unexpected token "/" in package.json', timestamp: '10:00:04' },
  { id: '5', type: 'success', message: 'Configuration fixed automatically', timestamp: '10:00:05' },
];

export default function BuildLogViewer() {
  const [logs, setLogs] = useState<LogEntry[]>(mockLogs);
  const [isExpanded, setIsExpanded] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Simulate refreshing logs
  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setLogs((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          type: 'success',
          message: 'System verify complete.',
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
      setIsRefreshing(false);
    }, 1200);
  };

  const getIcon = (type: LogEntry['type']) => {
    switch (type) {
      case 'success': return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case 'error': return <XCircle className="w-4 h-4 text-rose-500" />;
      case 'warning': return <AlertCircle className="w-4 h-4 text-amber-500" />;
      default: return <Terminal className="w-4 h-4 text-blue-500" />;
    }
  };

  const getBorderColor = (type: LogEntry['type']) => {
    switch (type) {
      case 'success': return 'border-l-emerald-500';
      case 'error': return 'border-l-rose-500';
      case 'warning': return 'border-l-amber-500';
      default: return 'border-l-blue-500';
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-4">
      <motion.div
        layout
        className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-zinc-900/50 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-rose-500/20 border border-rose-500/50" />
              <div className="w-3 h-3 rounded-full bg-amber-500/20 border border-amber-500/50" />
              <div className="w-3 h-3 rounded-full bg-emerald-500/20 border border-emerald-500/50" />
            </div>
            <span className="ml-3 text-sm font-mono text-zinc-400 font-medium">Build Status</span>
          </div>
          
          <div className="flex items-center gap-2">
             <button
              onClick={handleRefresh}
              className={cn(
                "p-1.5 rounded-md hover:bg-zinc-800 text-zinc-400 transition-colors",
                isRefreshing && "animate-spin text-indigo-400"
              )}
              aria-label="Refresh logs"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1.5 rounded-md hover:bg-zinc-800 text-zinc-400 transition-colors"
              aria-label={isExpanded ? "Collapse" : "Expand"}
            >
              <motion.div
                animate={{ rotate: isExpanded ? 90 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronRight className="w-4 h-4" />
              </motion.div>
            </button>
          </div>
        </div>

        {/* Content */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className="p-4 space-y-2 bg-zinc-950 max-h-[400px] overflow-y-auto font-mono text-sm scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
                {logs.map((log, index) => (
                  <motion.div
                    key={log.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={cn(
                      "group flex items-start gap-3 p-3 rounded-lg border border-transparent bg-zinc-900/30 hover:bg-zinc-900/60 transition-all border-l-2",
                      getBorderColor(log.type)
                    )}
                  >
                    <div className="mt-0.5 opacity-70 group-hover:opacity-100 transition-opacity">
                      {getIcon(log.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline gap-4">
                        <span className={cn(
                          "truncate font-medium",
                          log.type === 'error' ? "text-rose-400" : "text-zinc-300"
                        )}>
                          {log.message}
                        </span>
                        <span className="text-xs text-zinc-600 whitespace-nowrap group-hover:text-zinc-500 transition-colors">
                          {log.timestamp}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))}
                
                {logs.length === 0 && (
                  <div className="text-center py-8 text-zinc-600">
                    No logs available
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Footer Status Bar */}
        <div className="px-4 py-2 bg-zinc-900 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-500 font-mono">
           <div className="flex items-center gap-2">
             <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
             <span>System Online</span>
           </div>
           <span>v2.4.0</span>
        </div>
      </motion.div>
    </div>
  );
}