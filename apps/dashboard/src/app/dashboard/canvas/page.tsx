"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  Brush, Plus, Move, Type, Square, Circle, ArrowRight,
  Trash2, ZoomIn, ZoomOut, Grid3X3, Download, MousePointer,
  Palette, Bot
} from "lucide-react";
import { toast } from "sonner";
import { useAgdi } from "@/components/AgdiProvider";

interface CanvasNode {
  id: string; type: "agent" | "tool" | "data" | "output" | "text" | "gateway";
  x: number; y: number; w: number; h: number;
  label: string; color: string; connected?: string[];
}

const typeIcons: Record<string, string> = {
  agent: "🤖", tool: "🔧", data: "📊", output: "📄", text: "📝", gateway: "🌐"
};

const tools = [
  { id: "select", icon: <MousePointer className="w-4 h-4" />, label: "Select" },
  { id: "move", icon: <Move className="w-4 h-4" />, label: "Pan" },
  { id: "agent", icon: <Circle className="w-4 h-4" />, label: "Add Agent" },
  { id: "tool", icon: <Square className="w-4 h-4" />, label: "Add Tool" },
  { id: "text", icon: <Type className="w-4 h-4" />, label: "Text" },
];

export default function CanvasPage() {
  const { request, isConnected } = useAgdi();
  const [nodes, setNodes] = useState<CanvasNode[]>([]);
  const [selectedTool, setSelectedTool] = useState("select");
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [dragging, setDragging] = useState<{ nodeId: string; startX: number; startY: number; nodeX: number; nodeY: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const canvasRef = useRef<HTMLDivElement>(null);

  // Load live map data from gateway
  useEffect(() => {
    let mounted = true;
    const loadTopology = async () => {
      if (!isConnected) return;
      
      try {
        const agRes = await request<any>("sessions.list", { limit: 100 });
        if (!mounted) return;
        const chRes = await request<any>("channels.status", {});
        if (!mounted) return;

        const newNodes: CanvasNode[] = [];
        
        // Central Gateway Node
        const gwNode: CanvasNode = {
          id: "gw-core", type: "gateway",
          x: 400, y: 300, w: 160, h: 70, label: "Agdi Gateway", color: "#3b82f6", connected: []
        };
        
        // Map agents (left side)
        const sessions = agRes.sessions || [];
        sessions.forEach((s: any, i: number) => {
          const id = `agent-${s.key || i}`;
          gwNode.connected!.push(id); // Connect gateway to agent
          newNodes.push({
            id, type: "agent",
            x: 100, y: 100 + (i * 100), w: 160, h: 60,
            label: s.displayName || s.derivedTitle || s.key || "Agent",
            color: "#06b6d4"
          });
        });
        
        // Map channels (right side)
        const channels = Object.keys(chRes.channels || {});
        channels.forEach((name: string, i: number) => {
          const id = `channel-${name}`;
          const cData = chRes.channels[name];
          const isActive = cData.status === "connected" || cData.status === "listening" || cData.status === "webhook-active";
          if (isActive) {
             gwNode.connected!.push(id); // Connect gateway to channel
          }
          newNodes.push({
            id, type: "tool",
            x: 700, y: 100 + (i * 90), w: 140, h: 60,
            label: name.charAt(0).toUpperCase() + name.slice(1),
            color: isActive ? "#22c55e" : "#6b7280"
          });
        });

        setNodes([gwNode, ...newNodes]);

      } catch (err) {
        console.error("Failed to fetch topology:", err);
      }
    };
    loadTopology();
    return () => { mounted = false; };
  }, [isConnected, request]);

  const zoomIn = () => setZoom((z) => Math.min(z + 0.1, 2));
  const zoomOut = () => setZoom((z) => Math.max(z - 0.1, 0.5));

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (selectedTool === "select") {
      setSelectedNode(null);
      return;
    }
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;

    if (selectedTool === "agent" || selectedTool === "tool" || selectedTool === "text") {
      const node: CanvasNode = {
        id: `n${Date.now()}`, type: selectedTool as CanvasNode["type"],
        x, y, w: selectedTool === "text" ? 120 : 150, h: selectedTool === "text" ? 40 : 60,
        label: selectedTool === "agent" ? "New Agent" : selectedTool === "tool" ? "New Tool" : "Note",
        color: selectedTool === "agent" ? "#06b6d4" : selectedTool === "tool" ? "#a855f7" : "#6b7280",
      };
      setNodes((prev) => [...prev, node]);
      setSelectedTool("select");
      toast.success(`${selectedTool} node added.`);
    }
  };

  const handleNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    if (selectedTool === "select") {
      setSelectedNode(nodeId);
      const node = nodes.find((n) => n.id === nodeId);
      if (node) {
        setDragging({ nodeId, startX: e.clientX, startY: e.clientY, nodeX: node.x, nodeY: node.y });
      }
    }
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragging) return;
    const dx = (e.clientX - dragging.startX) / zoom;
    const dy = (e.clientY - dragging.startY) / zoom;
    setNodes((prev) => prev.map((n) =>
      n.id === dragging.nodeId ? { ...n, x: dragging.nodeX + dx, y: dragging.nodeY + dy } : n
    ));
  }, [dragging, zoom]);

  const handleMouseUp = useCallback(() => {
    setDragging(null);
  }, []);

  useEffect(() => {
    if (dragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return () => { window.removeEventListener("mousemove", handleMouseMove); window.removeEventListener("mouseup", handleMouseUp); };
    }
  }, [dragging, handleMouseMove, handleMouseUp]);

  const deleteNode = () => {
    if (!selectedNode) return;
    setNodes((prev) => prev.filter((n) => n.id !== selectedNode).map((n) => ({
      ...n, connected: n.connected?.filter((c) => c !== selectedNode),
    })));
    setSelectedNode(null);
    toast.success("Node deleted.");
  };

  // Build connection lines
  const connections: { x1: number; y1: number; x2: number; y2: number; color: string }[] = [];
  nodes.forEach((n) => {
    if (n.connected) {
      n.connected.forEach((targetId) => {
        const target = nodes.find((t) => t.id === targetId);
        if (target) {
          connections.push({
            x1: n.x + n.w / 2, y1: n.y + n.h / 2,
            x2: target.x + target.w / 2, y2: target.y + target.h / 2,
            color: n.color,
          });
        }
      });
    }
  });

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            <Brush className="w-7 h-7 sm:w-8 sm:h-8 text-cyan-400" /> Live Node Map
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">{nodes.length} nodes · Active Gateway Topology</p>
        </div>
        <div className="flex items-center gap-2">
          {!isConnected && <span className="text-xs text-amber-500 mr-2">Offline - No live data</span>}
          <button onClick={zoomOut} className="p-2 rounded-lg border border-white/10 text-gray-400 hover:text-white">
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs text-gray-500 w-12 text-center">{Math.round(zoom * 100)}%</span>
          <button onClick={zoomIn} className="p-2 rounded-lg border border-white/10 text-gray-400 hover:text-white">
            <ZoomIn className="w-4 h-4" />
          </button>
          {selectedNode && (
            <button onClick={deleteNode} className="p-2 rounded-lg border border-red-500/20 text-red-400 hover:bg-red-500/10">
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-1 mb-3 bg-black/20 rounded-lg p-1 w-fit border border-white/5">
        {tools.map((t) => (
          <button key={t.id} onClick={() => setSelectedTool(t.id)} title={t.label}
            className={`p-2 rounded-lg text-xs ${selectedTool === t.id ? "bg-cyan-500/10 text-cyan-400" : "text-gray-500 hover:text-white"}`}>
            {t.icon}
          </button>
        ))}
      </div>

      {/* Canvas area */}
      <div ref={canvasRef} onClick={handleCanvasClick}
        className="flex-1 glass-panel border border-white/5 rounded-xl relative overflow-hidden cursor-crosshair"
        style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px)", backgroundSize: `${20 * zoom}px ${20 * zoom}px` }}>

        {/* SVG connections */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ transform: `scale(${zoom})`, transformOrigin: "0 0" }}>
          <defs>
            <marker id="arrow" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
              <path d="M0,0 L8,3 L0,6" fill="rgba(255,255,255,0.3)" />
            </marker>
          </defs>
          {connections.map((c, i) => {
            const dx = c.x2 - c.x1;
            const dy = c.y2 - c.y1;
            const dist = Math.sqrt(dx*dx + dy*dy);
            const rOffset = 60; // Offset from center to edge of target node roughly
            const x2 = c.x2 - (dx / dist) * rOffset;
            const y2 = c.y2 - (dy / dist) * rOffset;
            return (
               <path key={i}
                d={`M${c.x1},${c.y1} L${x2},${y2}`}
                stroke={c.color} strokeWidth="2" fill="none" strokeOpacity="0.4"
                markerEnd="url(#arrow)" />
            );
          })}
        </svg>

        {/* Nodes */}
        <div style={{ transform: `scale(${zoom})`, transformOrigin: "0 0" }}>
          {nodes.map((n) => (
            <div key={n.id}
              onMouseDown={(e) => handleNodeMouseDown(e, n.id)}
              className={`absolute flex items-center gap-2 px-3 rounded-xl border cursor-move select-none transition-shadow ${
                selectedNode === n.id
                  ? "shadow-[0_0_20px_rgba(6,182,212,0.3)] border-cyan-400/50"
                  : "border-white/10 hover:border-white/20"
              }`}
              style={{
                left: n.x, top: n.y, width: n.w, height: n.h,
                background: `${n.color}15`,
                borderColor: selectedNode === n.id ? undefined : `${n.color}30`,
              }}>
              <span className="text-xl shrink-0">{typeIcons[n.type]}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-white truncate">{n.label}</p>
                <p className="text-[9px] uppercase tracking-wider" style={{ color: n.color }}>{n.type}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
