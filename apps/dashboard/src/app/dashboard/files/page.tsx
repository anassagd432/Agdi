"use client";

import React, { useState } from "react";
import {
  FolderOpen, File, FileText, FileCode, FileImage, FileCog,
  ChevronRight, ChevronDown, Upload, Download, Trash2,
  Search, HardDrive, FolderPlus,
} from "lucide-react";
import { toast } from "sonner";

/* ── Types ────────────────────────────────────────────────────────── */

interface FileNode {
  name: string; type: "file" | "folder"; size?: string;
  modified?: string; children?: FileNode[];
  ext?: string;
}

const fileTree: FileNode[] = [
  { name: ".agdi", type: "folder", children: [
    { name: "config.json", type: "file", ext: "json", size: "2.1 KB", modified: "Today 10:32" },
    { name: "credentials", type: "folder", children: [
      { name: "web-provider.json", type: "file", ext: "json", size: "456 B", modified: "Mar 12" },
    ]},
    { name: "sessions", type: "folder", children: [
      { name: "agent-coder.jsonl", type: "file", ext: "jsonl", size: "48 KB", modified: "Today 10:15" },
      { name: "agent-researcher.jsonl", type: "file", ext: "jsonl", size: "23 KB", modified: "Yesterday" },
    ]},
    { name: "dashboard", type: "folder", children: [
      { name: "devices.json", type: "file", ext: "json", size: "3.4 KB", modified: "Today 09:45" },
      { name: "device-commands.jsonl", type: "file", ext: "jsonl", size: "1.2 KB", modified: "Today 09:50" },
    ]},
    { name: "knowledge", type: "folder", children: [
      { name: "project-docs.md", type: "file", ext: "md", size: "15 KB", modified: "Mar 10" },
      { name: "api-reference.md", type: "file", ext: "md", size: "28 KB", modified: "Mar 8" },
      { name: "architecture.pdf", type: "file", ext: "pdf", size: "2.3 MB", modified: "Mar 5" },
    ]},
  ]},
  { name: "agents", type: "folder", children: [
    { name: "coder", type: "folder", children: [
      { name: "config.yaml", type: "file", ext: "yaml", size: "890 B", modified: "Mar 11" },
      { name: "tools.json", type: "file", ext: "json", size: "1.5 KB", modified: "Mar 11" },
    ]},
    { name: "researcher", type: "folder", children: [
      { name: "config.yaml", type: "file", ext: "yaml", size: "720 B", modified: "Mar 9" },
    ]},
  ]},
  { name: "logs", type: "folder", children: [
    { name: "gateway.log", type: "file", ext: "log", size: "4.8 MB", modified: "Today 10:33" },
    { name: "agents.log", type: "file", ext: "log", size: "1.2 MB", modified: "Today 10:30" },
    { name: "errors.log", type: "file", ext: "log", size: "156 KB", modified: "Today 09:12" },
  ]},
];

/* ── File icon helper ─────────────────────────────────────────────── */

function fileIcon(ext?: string) {
  switch (ext) {
    case "json": case "jsonl": case "yaml": return <FileCog className="w-4 h-4 text-amber-400" />;
    case "md": case "txt": return <FileText className="w-4 h-4 text-blue-400" />;
    case "ts": case "tsx": case "js": return <FileCode className="w-4 h-4 text-cyan-400" />;
    case "png": case "jpg": case "svg": case "pdf": return <FileImage className="w-4 h-4 text-pink-400" />;
    case "log": return <FileText className="w-4 h-4 text-gray-400" />;
    default: return <File className="w-4 h-4 text-gray-400" />;
  }
}

/* ── Tree Node ────────────────────────────────────────────────────── */

function TreeNode({ node, depth = 0 }: { node: FileNode; depth?: number }) {
  const [open, setOpen] = useState(depth < 1);

  if (node.type === "folder") {
    return (
      <div>
        <button onClick={() => setOpen(!open)}
          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-white/[0.03] text-sm text-gray-300 hover:text-white transition-colors"
          style={{ paddingLeft: `${depth * 16 + 8}px` }}>
          {open ? <ChevronDown className="w-3 h-3 text-gray-500" /> : <ChevronRight className="w-3 h-3 text-gray-500" />}
          <FolderOpen className={`w-4 h-4 ${open ? "text-cyan-400" : "text-gray-500"}`} />
          <span className="font-medium">{node.name}</span>
          {node.children && <span className="text-[10px] text-gray-600 ml-auto">{node.children.length}</span>}
        </button>
        {open && node.children?.map((child) => (
          <TreeNode key={child.name} node={child} depth={depth + 1} />
        ))}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-white/[0.03] text-sm text-gray-400 hover:text-white cursor-pointer group transition-colors"
      style={{ paddingLeft: `${depth * 16 + 28}px` }}>
      {fileIcon(node.ext)}
      <span className="flex-1 truncate">{node.name}</span>
      <span className="text-[10px] text-gray-600 mr-2">{node.size}</span>
      <span className="text-[10px] text-gray-600 hidden group-hover:inline">{node.modified}</span>
    </div>
  );
}

/* ── Page ─────────────────────────────────────────────────────────── */

export default function FilesPage() {
  const [search, setSearch] = useState("");

  function countFiles(nodes: FileNode[]): number {
    return nodes.reduce((sum, n) => sum + (n.type === "file" ? 1 : countFiles(n.children || [])), 0);
  }

  function totalSize(nodes: FileNode[]): string {
    let bytes = 0;
    const walk = (ns: FileNode[]) => ns.forEach((n) => {
      if (n.size) {
        const m = n.size.match(/([\d.]+)\s*(B|KB|MB|GB)/);
        if (m) { const v = parseFloat(m[1]); const u = m[2]; bytes += u === "GB" ? v*1e9 : u === "MB" ? v*1e6 : u === "KB" ? v*1e3 : v; }
      }
      if (n.children) walk(n.children);
    });
    walk(nodes);
    if (bytes > 1e6) return `${(bytes / 1e6).toFixed(1)} MB`;
    if (bytes > 1e3) return `${(bytes / 1e3).toFixed(1)} KB`;
    return `${bytes} B`;
  }

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-300">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            <HardDrive className="w-7 h-7 sm:w-8 sm:h-8 text-cyan-400" /> File Manager
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {countFiles(fileTree)} files · {totalSize(fileTree)} total
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => toast.info("Create folder flow coming soon")}
            className="p-2 rounded-lg border border-white/10 text-gray-400 hover:text-white" title="New folder">
            <FolderPlus className="w-4 h-4" />
          </button>
          <button onClick={() => toast.info("Upload flow coming soon")}
            className="px-3 py-2 bg-cyan-500 text-black rounded-lg text-sm font-semibold flex items-center gap-2 hover:bg-cyan-400">
            <Upload className="w-4 h-4" /> Upload
          </button>
        </div>
      </div>

      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input type="text" placeholder="Search files..." value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-black/20 border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white focus:border-cyan-500/50 focus:outline-none" />
      </div>

      <div className="flex-1 glass-panel rounded-xl border border-white/5 overflow-y-auto p-2">
        {fileTree.map((node) => <TreeNode key={node.name} node={node} />)}
      </div>
    </div>
  );
}
