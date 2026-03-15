"use client";
import { Brain, Sparkles } from "lucide-react";

const skills = [
  { name: "Code Generation", desc: "Generate code in any language from natural language", level: "Advanced", color: "text-cyan-400", bg: "bg-cyan-500/10" },
  { name: "Web Research", desc: "Search, read, and synthesize web content", level: "Expert", color: "text-green-400", bg: "bg-green-500/10" },
  { name: "Data Analysis", desc: "Analyze datasets and generate insights", level: "Advanced", color: "text-purple-400", bg: "bg-purple-500/10" },
  { name: "Document Writing", desc: "Write reports, docs, and articles", level: "Expert", color: "text-amber-400", bg: "bg-amber-500/10" },
  { name: "API Integration", desc: "Connect and orchestrate third-party APIs", level: "Intermediate", color: "text-blue-400", bg: "bg-blue-500/10" },
  { name: "Image Analysis", desc: "Understand and describe visual content", level: "Advanced", color: "text-pink-400", bg: "bg-pink-500/10" },
];

export default function SkillsPage() {
  return (
    <div className="flex flex-col h-full animate-in fade-in duration-500 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2">
          <Brain className="w-7 h-7 sm:w-8 sm:h-8 text-cyan-400" /> Skills
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">{skills.length} skills configured</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {skills.map((skill) => (
          <div key={skill.name} className="glass-panel p-5 border border-white/5 rounded-xl hover:border-white/10 transition-all space-y-3 group">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${skill.bg} group-hover:scale-110 transition-transform`}><Sparkles className={`w-5 h-5 ${skill.color}`} /></div>
                <h3 className="font-semibold text-white text-sm">{skill.name}</h3>
              </div>
              <span className={`text-[10px] font-bold uppercase tracking-wider ${skill.color}`}>{skill.level}</span>
            </div>
            <p className="text-xs text-gray-400">{skill.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
