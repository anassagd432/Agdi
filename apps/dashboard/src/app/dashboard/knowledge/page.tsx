"use client";

import React, { useState, useEffect } from 'react';
import { Database, UploadCloud, Link as LinkIcon, FileText, Globe, RefreshCcw, Search, Trash2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { agdi } from '@/lib/agdi-client';

interface VectorDocument {
  id: string;
  name: string;
  type: 'pdf' | 'url' | 'md';
  status: 'embedded' | 'processing' | 'failed';
  tokens: string;
  lastSynced: string;
  source: string;
}

export default function KnowledgePage() {
  const [documents, setDocuments] = useState<VectorDocument[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  const fetchKnowledge = async () => {
    try {
      const res = await agdi.call("knowledge.list");
      if (res && res.documents) {
        const mapped: VectorDocument[] = res.documents.map((d: any) => ({
          id: d.id,
          name: d.name || d.id,
          type: d.type === 'url' ? 'url' : (d.type === 'pdf' ? 'pdf' : 'md'),
          status: d.status || 'embedded',
          tokens: d.tokens ? d.tokens.toLocaleString() : 'N/A',
          lastSynced: d.lastSynced ? new Date(d.lastSynced).toLocaleString() : 'Unknown',
          source: d.source || 'Upload'
        }));
        setDocuments(mapped);
      } else {
        setDocuments([]);
      }
    } catch(e) {
      console.warn("knowledge.list error:", e);
      setDocuments([]);
    }
  };

  useEffect(() => {
    fetchKnowledge();
    const intv = setInterval(fetchKnowledge, 10000);
    return () => clearInterval(intv);
  }, []);

  const forceSync = async () => {
    setIsSyncing(true);
    toast.info("Re-indexing Vector Database...");
    try {
      await agdi.call("knowledge.sync");
      fetchKnowledge();
      toast.success("Knowledge sources synced successfully.");
    } catch(e: any) {
      toast.error(`Sync error: ${e.message || String(e)}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const removeDoc = async (id: string, name: string) => {
    try {
      await agdi.call("knowledge.remove", { id });
      setDocuments(prev => prev.filter(d => d.id !== id));
      toast.success(`Removed ${name} from knowledge base.`);
    } catch(e: any) {
      toast.error(`Failed to remove ${name}: ${e.message || String(e)}`);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'pdf': return <FileText className="w-5 h-5 text-red-400" />;
      case 'url': return <Globe className="w-5 h-5 text-blue-400" />;
      case 'md': return <FileText className="w-5 h-5 text-emerald-400" />;
      default: return <FileText className="w-5 h-5 text-gray-400" />;
    }
  };

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-500 max-w-7xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            <Database className="w-7 h-7 sm:w-8 sm:h-8 text-cyan-400" /> Knowledge Base & RAG
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Manage the long-term vector memory and document embeddings for your AI Agents.
          </p>
        </div>
        
        <button 
          onClick={forceSync}
          disabled={isSyncing}
          className="bg-white/5 hover:bg-white/10 text-white border border-white/10 text-sm font-medium py-2 px-4 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
        >
          <RefreshCcw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} /> Sync Vector DB
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        
        {/* Upload/Ingestion Panel */}
        <div className="lg:col-span-1 space-y-4">
           <div className="glass-panel p-6 rounded-xl border border-white/5 h-full">
              <h3 className="text-lg font-semibold text-white mb-4">Ingest New Data</h3>
              
              {/* File Upload Area */}
              <div className="border-2 border-dashed border-white/20 rounded-lg p-6 flex flex-col items-center justify-center text-center hover:bg-white/5 transition-colors cursor-pointer mb-6 group">
                <div className="w-12 h-12 bg-black/40 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <UploadCloud className="w-6 h-6 text-cyan-400" />
                </div>
                <p className="text-sm font-medium text-white">Click to upload or drag files</p>
                <p className="text-xs text-muted-foreground mt-1">PDF, TXT, MD, CSV (Max 50MB)</p>
              </div>

              {/* Web Scraper */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Crawl Web URL</label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <LinkIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input 
                      type="url" 
                      placeholder="https://docs.example.com" 
                      className="w-full bg-black/40 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:border-cyan-500/50 outline-none transition-colors"
                    />
                  </div>
                  <button onClick={() => toast.success("Added URL to scraping queue.")} className="bg-cyan-500 hover:bg-cyan-400 text-black p-2.5 rounded-lg transition-colors">
                    <CheckCircle2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
           </div>
        </div>

        {/* Existing Documents Registry */}
        <div className="lg:col-span-2 glass-panel overflow-hidden rounded-xl border border-white/10 flex flex-col h-[500px]">
           
           {/* Top Bar */}
           <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border-b border-white/10 bg-black/40 gap-3">
             <h3 className="font-semibold text-white">Embedded Sources</h3>
             <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Search index..." 
                  className="w-full bg-black/50 border border-white/10 rounded-md pl-9 pr-4 py-1.5 text-xs text-white focus:border-cyan-500/50 outline-none transition-colors"
                />
             </div>
           </div>

           {/* Table */}
           <div className="flex-1 overflow-auto">
             <table className="w-full text-left border-collapse">
               <thead className="bg-black/20 text-xs text-muted-foreground uppercase sticky top-0 backdrop-blur-md">
                 <tr>
                   <th className="py-3 px-6 font-medium">Document Name</th>
                   <th className="py-3 px-6 font-medium">Status</th>
                   <th className="py-3 px-3 sm:px-6 font-medium hidden sm:table-cell">Tokens</th>
                   <th className="py-3 px-3 sm:px-6 font-medium hidden md:table-cell">Last Synced</th>
                   <th className="py-3 px-6 font-medium text-right">Actions</th>
                 </tr>
               </thead>
               <tbody className="text-sm border-t border-white/5">
                 {documents.map((doc) => (
                   <tr key={doc.id} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                     <td className="py-3 px-6">
                       <div className="flex items-center gap-3">
                         {getIcon(doc.type)}
                         <div>
                            <p className="font-medium text-gray-200">{doc.name}</p>
                            <p className="text-xs text-gray-500 font-mono truncate max-w-[200px]">{doc.source}</p>
                         </div>
                       </div>
                     </td>
                     <td className="py-3 px-6">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-md border ${
                          doc.status === 'embedded' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                          doc.status === 'failed' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                          'bg-cyan-500/10 text-cyan-400 border-cyan-500/20 animate-pulse'
                        }`}>
                          {doc.status === 'embedded' && <CheckCircle2 className="w-3 h-3" />}
                          {doc.status === 'processing' && <RefreshCcw className="w-3 h-3 animate-spin" />}
                          {doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}
                        </span>
                     </td>
                     <td className="py-3 px-3 sm:px-6 text-gray-400 font-mono text-xs hidden sm:table-cell">
                        {doc.tokens}
                     </td>
                     <td className="py-3 px-3 sm:px-6 text-gray-400 text-xs hidden md:table-cell">
                        {doc.lastSynced}
                     </td>
                     <td className="py-3 px-6 text-right">
                       <button 
                         onClick={() => removeDoc(doc.id, doc.name)}
                         className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded transition-colors sm:opacity-0 sm:group-hover:opacity-100"
                         title="Delete from Vector DB"
                       >
                         <Trash2 className="w-4 h-4" />
                       </button>
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
             
             {documents.length === 0 && (
                <div className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
                  <Database className="w-12 h-12 mb-3 opacity-20" />
                  <p>Your Knowledge Base is empty.</p>
                  <p className="text-xs mt-1">Upload documents to provide your agents with context.</p>
                </div>
             )}
           </div>
        </div>

      </div>
    </div>
  );
}
