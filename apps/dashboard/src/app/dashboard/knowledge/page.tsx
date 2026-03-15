"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  BookOpen, Upload, Trash2, File, FileText, FileImage, FileCode,
  RefreshCw, Loader2, HardDrive,
} from "lucide-react";
import { toast } from "sonner";

interface KnowledgeFile {
  name: string;
  size: number;
  uploadedAt: number;
}

function fileIcon(name: string) {
  if (/\.(png|jpg|jpeg|gif|svg|webp)$/i.test(name)) return <FileImage className="w-5 h-5 text-purple-400" />;
  if (/\.(ts|tsx|js|jsx|py|go|rs|c|cpp|java)$/i.test(name)) return <FileCode className="w-5 h-5 text-cyan-400" />;
  if (/\.(md|txt|csv|json|yaml|yml|xml)$/i.test(name)) return <FileText className="w-5 h-5 text-green-400" />;
  return <File className="w-5 h-5 text-gray-400" />;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function KnowledgePage() {
  const [files, setFiles] = useState<KnowledgeFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const fetchFiles = useCallback(async () => {
    try {
      const res = await fetch("/api/knowledge/upload");
      if (res.ok) {
        const data = await res.json();
        setFiles(data.files || []);
      }
    } catch { toast.error("Failed to fetch files."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchFiles(); }, [fetchFiles]);

  const uploadFile = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/knowledge/upload", { method: "POST", body: formData });
      if (res.ok) {
        toast.success(`Uploaded "${file.name}"`);
        fetchFiles();
      } else {
        const d = await res.json();
        toast.error(d.error || "Upload failed");
      }
    } catch { toast.error("Upload failed"); }
    finally { setUploading(false); }
  };

  const deleteFile = async (name: string) => {
    if (!confirm(`Delete "${name}"?`)) return;
    try {
      const res = await fetch(`/api/knowledge/upload?name=${encodeURIComponent(name)}`, { method: "DELETE" });
      if (res.ok) { toast.success("File deleted."); fetchFiles(); }
      else { toast.error("Failed to delete."); }
    } catch { toast.error("Failed to delete."); }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 0) uploadFile(droppedFiles[0]);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) uploadFile(selected);
    e.target.value = "";
  };

  const totalSize = files.reduce((sum, f) => sum + f.size, 0);

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-500 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            <BookOpen className="w-7 h-7 sm:w-8 sm:h-8 text-cyan-400" /> Knowledge Base
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Upload files to provide context for your agents.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500 flex items-center gap-1">
            <HardDrive className="w-3 h-3" /> {files.length} files · {formatSize(totalSize)}
          </span>
          <button onClick={() => { setLoading(true); fetchFiles(); }}
            className="p-2 rounded-lg border border-white/10 text-gray-400 hover:text-white transition-colors">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Dropzone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-xl p-10 text-center transition-all cursor-pointer ${
          dragOver
            ? "border-cyan-400 bg-cyan-500/10"
            : "border-white/10 bg-white/[0.02] hover:border-white/20"
        }`}
        onClick={() => document.getElementById("knowledge-file-input")?.click()}
      >
        <input id="knowledge-file-input" type="file" className="hidden" onChange={handleFileInput} />
        <div className="flex flex-col items-center gap-3">
          {uploading ? (
            <Loader2 className="w-10 h-10 text-cyan-400 animate-spin" />
          ) : (
            <Upload className={`w-10 h-10 ${dragOver ? "text-cyan-400" : "text-gray-500"}`} />
          )}
          <div>
            <p className="text-sm font-medium text-white">
              {uploading ? "Uploading..." : "Drag & drop files here"}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              or click to browse · Supports any file type
            </p>
          </div>
        </div>
      </div>

      {/* File List */}
      <div className="glass-panel rounded-xl border border-white/5 overflow-hidden">
        <div className="grid grid-cols-[1fr_100px_140px_50px] gap-4 px-6 py-3 border-b border-white/10 bg-black/40 text-xs font-semibold text-gray-400 uppercase tracking-widest">
          <div>File</div>
          <div>Size</div>
          <div>Uploaded</div>
          <div></div>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
          </div>
        )}

        {!loading && files.length === 0 && (
          <div className="text-center py-12 text-muted-foreground text-sm">
            No files uploaded yet. Drag &amp; drop to get started.
          </div>
        )}

        {!loading &&
          files.map((file) => (
            <div key={file.name}
              className="grid grid-cols-[1fr_100px_140px_50px] gap-4 px-6 py-3 border-b border-white/5 hover:bg-white/[0.02] transition-colors items-center">
              <div className="flex items-center gap-3 min-w-0">
                {fileIcon(file.name)}
                <span className="text-sm text-white truncate">{file.name}</span>
              </div>
              <div className="text-xs text-gray-400">{formatSize(file.size)}</div>
              <div className="text-xs text-gray-400">
                {new Date(file.uploadedAt).toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
              </div>
              <div>
                <button onClick={() => deleteFile(file.name)}
                  className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
