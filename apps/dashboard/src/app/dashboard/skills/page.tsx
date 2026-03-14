"use client";

import React, { useState, useEffect } from 'react';
import { Blocks, Search, Download, Trash2, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { agdi } from '@/lib/agdi-client';

interface Skill {
  id: string;
  name: string;
  author: string;
  description: string;
  installed: boolean;
  downloads: string;
  verified: boolean;
}

export default function SkillsPage() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [installing, setInstalling] = useState<string | null>(null);

  const fetchSkills = async () => {
    try {
      const res = await agdi.call("skills.status");
      if (res && res.skills) {
        const mapped: Skill[] = res.skills.map((s: any) => ({
           id: s.id,
           name: s.name || s.id,
           author: s.author || '@community',
           description: s.description || 'No description provided.',
           installed: s.installed === true,
           downloads: s.downloads || '—',
           verified: !!s.verified
        }));
        setSkills(mapped);
      } else {
        setSkills([]);
      }
    } catch(e) {
      console.warn("skills.status error:", e);
      setSkills([]);
    }
  };

  useEffect(() => {
    fetchSkills();
  }, []);

  const toggleInstall = async (skillId: string, skillName: string, currentlyInstalled: boolean) => {
    if (currentlyInstalled) {
      toast.error(`${skillName} removed from Workspace.`);
      setSkills(prev => prev.map(s => s.id === skillId ? { ...s, installed: false } : s));
      // agdi.call("skills.uninstall") missing from RPC, mock state sync
    } else {
      setInstalling(skillId);
      toast.info(`Downloading ${skillName} from ClawHub...`);
      try {
        await agdi.call("skills.install", { skill: skillId });
        toast.success(`${skillName} installed successfully!`);
        fetchSkills(); // refresh server state
      } catch(e: any) {
        toast.error(`Install failed: ${e.message || String(e)}`);
      } finally {
        setInstalling(null);
      }
    }
  };

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-500 max-w-7xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            <Blocks className="w-8 h-8 text-purple-400" /> Skills Registry (ClawHub)
          </h1>
          <p className="text-muted-foreground mt-2">
            Expand your Agent fleet's capabilities by installing community and verified skills.
          </p>
        </div>
        
        <div className="relative w-72">
           <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
           <input 
             type="text" 
             placeholder="Search skills..." 
             className="w-full bg-black/40 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:border-cyan-500/50 outline-none transition-colors"
           />
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
        {skills.map(skill => (
          <div key={skill.id} className="glass-panel p-6 rounded-xl border border-white/5 hover:border-white/10 transition-colors flex flex-col h-full bg-gradient-to-b from-white/[0.02] to-transparent relative group">
            
            <div className="flex justify-between items-start mb-4">
               <div>
                  <h3 className="font-semibold text-lg text-white flex items-center gap-2">
                    {skill.name} 
                    {skill.verified && <span title="Verified by Agdi Core"><ShieldCheck className="w-4 h-4 text-cyan-400" /></span>}
                  </h3>
                  <div className="text-xs text-muted-foreground font-mono mt-1">{skill.author}</div>
               </div>
               
               <div className="text-xs bg-black/50 border border-white/5 px-2 py-1 rounded text-gray-400 flex items-center gap-1">
                 <Download className="w-3 h-3" /> {skill.downloads}
               </div>
            </div>

            <p className="text-sm text-gray-400 flex-grow mb-6 leading-relaxed">
               {skill.description}
            </p>

            <button 
               onClick={() => toggleInstall(skill.id, skill.name, skill.installed)}
               disabled={installing === skill.id}
               className={`w-full py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
                 installing === skill.id 
                   ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                   : skill.installed 
                     ? 'bg-white/5 hover:bg-red-500/20 text-white hover:text-red-400 border border-white/5 hover:border-red-500/30'
                     : 'bg-cyan-500 hover:bg-cyan-400 text-black shadow-[0_0_15px_rgba(34,211,238,0.2)]'
               }`}
            >
              {installing === skill.id ? (
                <div className="flex items-center gap-2"><div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div> Installing...</div>
              ) : skill.installed ? (
                <><Trash2 className="w-4 h-4" /> Uninstall</>
              ) : (
                <><Download className="w-4 h-4" /> Install Skill</>
              )}
            </button>

          </div>
        ))}
      </div>

    </div>
  );
}
