"use client";
import { Blocks } from "lucide-react";

const nodeTypes = [
  { name: "LLM Call", desc: "Call any language model", count: 12, color: "text-cyan-400", bg: "bg-cyan-500/10" },
  { name: "Web Search", desc: "Search the web and extract results", count: 5, color: "text-green-400", bg: "bg-green-500/10" },
  { name: "Code Exec", desc: "Execute code in a sandbox", count: 8, color: "text-amber-400", bg: "bg-amber-500/10" },
  { name: "File I/O", desc: "Read and write files", count: 15, color: "text-purple-400", bg: "bg-purple-500/10" },
  { name: "HTTP Request", desc: "Make HTTP API calls", count: 10, color: "text-blue-400", bg: "bg-blue-500/10" },
  { name: "Memory Store", desc: "Persistent key-value storage", count: 3, color: "text-pink-400", bg: "bg-pink-500/10" },
];

export default function NodesPage() {
  return (
    <div className="flex flex-col h-full animate-in fade-in duration-500 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2">
          <Blocks className="w-7 h-7 sm:w-8 sm:h-8 text-cyan-400" /> Nodes
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">{nodeTypes.reduce((s, n) => s + n.count, 0)} tools available</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {nodeTypes.map((node) => (
          <div key={node.name} className="glass-panel p-5 border border-white/5 rounded-xl hover:border-white/10 transition-all space-y-2">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${node.bg}`}><Blocks className={`w-5 h-5 ${node.color}`} /></div>
              <div><h3 className="font-semibold text-white text-sm">{node.name}</h3><p className="text-xs text-gray-500">{node.count} instances</p></div>
            </div>
            <p className="text-xs text-gray-400">{node.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
