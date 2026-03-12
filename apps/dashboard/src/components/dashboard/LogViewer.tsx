"use client";

import { useEffect, useState, useRef } from "react";
import { agdi, LogEntry } from "@/lib/agdi-client";
import { Terminal, ShieldAlert, Cpu, Activity, PlaySquare, Trash2, Download, Filter } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

export default function LogViewer() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleClear = () => {
    setLogs([]);
    toast.info("Console logs cleared.");
  };
  const handleExport = () => {
    const logText = logs.map(l => `[${l.timestamp}] [${l.level.toUpperCase()}] ${l.message}`).join('\n');
    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `agdi_logs_${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Logs exported successfully.");
  };

  useEffect(() => {
    // Subscribe to AGDI agent stream
    const unsubscribe = agdi.subscribe((log) => {
      setLogs((prev) => [...prev.slice(-49), log]); // Keep last 50 logs
    });

    // Initial connection log
    setLogs([{
      id: "init",
      timestamp: new Date().toLocaleTimeString(),
      level: "info",
      message: "Connected to AGDI Daemon on port 18789."
    }]);

    return () => { unsubscribe(); };
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const getLevelColor = (level: LogEntry["level"]) => {
    switch (level) {
      case "info": return "text-blue-400";
      case "warn": return "text-yellow-400";
      case "error": return "text-red-400";
      case "thought": return "text-purple-400 font-italic";
      case "action": return "text-cyan-400 font-semibold";
      default: return "text-gray-400";
    }
  };

  const getLevelIcon = (level: LogEntry["level"]) => {
    switch (level) {
      case "info": return <Activity className="w-3 h-3" />;
      case "warn": return <ShieldAlert className="w-3 h-3" />;
      case "error": return <ShieldAlert className="w-3 h-3 text-red-500" />;
      case "thought": return <Cpu className="w-3 h-3" />;
      case "action": return <PlaySquare className="w-3 h-3" />;
      default: return <Terminal className="w-3 h-3" />;
    }
  };

  return (
    <div className="flex flex-col h-full bg-black/40 rounded-lg border border-white/5 overflow-hidden font-mono text-sm shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-black/60">
        <div className="flex items-center gap-3">
          <Terminal className="w-4 h-4 text-cyan-400" />
          <span className="text-muted-foreground font-semibold">agdi.daemon.live</span>
          
          <div className="h-4 w-px bg-white/20 mx-2" />
          
          <button onClick={handleClear} className="text-xs text-muted-foreground hover:text-white flex items-center gap-1.5 transition-colors" title="Clear Logs">
            <Trash2 className="w-3.5 h-3.5" /> Clear
          </button>
          <button onClick={handleExport} className="text-xs text-muted-foreground hover:text-white flex items-center gap-1.5 transition-colors" title="Export Logs">
            <Download className="w-3.5 h-3.5" /> Export
          </button>
          
          <div className="relative flex items-center gap-1.5 ml-2">
             <Filter className="w-3.5 h-3.5 text-muted-foreground" />
             <select 
               value={filter} 
               onChange={(e) => setFilter(e.target.value)}
               className="bg-transparent text-xs text-muted-foreground outline-none cursor-pointer hover:text-white"
             >
               <option value="all" className="bg-zinc-900">All Levels</option>
               <option value="error" className="bg-zinc-900">Errors</option>
               <option value="warn" className="bg-zinc-900">Warnings</option>
               <option value="action" className="bg-zinc-900">Actions</option>
             </select>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
          <span className="text-xs text-cyan-400 tracking-wider uppercase">Streaming</span>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 p-4 overflow-y-auto space-y-2 scroll-smooth">
        <AnimatePresence initial={false}>
          {logs.filter(l => filter === 'all' || l.level === filter).map((log) => (
            <motion.div
              key={log.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex gap-3 hover:bg-white/5 px-2 py-1.5 rounded transition-colors"
            >
              <span className="text-gray-500 shrink-0 select-none">[{log.timestamp}]</span>
              <span className={`flex items-center gap-1.5 shrink-0 ${getLevelColor(log.level)}`}>
                {getLevelIcon(log.level)}
              </span>
              <span className="text-gray-300 break-words">{log.message}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
