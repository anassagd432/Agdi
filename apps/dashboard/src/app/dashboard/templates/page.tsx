"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Bot, Code, Globe, FileText, MessageSquare, Database,
  Sparkles, Zap, Brain, Shield, Search, Star, Copy, Plus,
} from "lucide-react";
import { toast } from "sonner";

interface Template {
  id: string; name: string; description: string;
  model: string; systemPrompt: string;
  icon: React.ReactNode; color: string; bg: string;
  category: string; stars: number; tags: string[];
}

const templates: Template[] = [
  {
    id: "coder", name: "Code Assistant", description: "Expert programmer in any language. Writes, reviews, and debugs code with best practices.",
    model: "claude-4-opus", systemPrompt: "You are an expert software engineer. Write clean, well-documented, production-quality code.",
    icon: <Code className="w-6 h-6" />, color: "text-cyan-400", bg: "bg-cyan-500/10 border-cyan-500/20",
    category: "Development", stars: 245, tags: ["coding", "debugging", "review"],
  },
  {
    id: "researcher", name: "Web Researcher", description: "Deep web research with source synthesis, fact-checking, and structured reports.",
    model: "gpt-5", systemPrompt: "You are a thorough researcher. Search the web, verify facts, cite sources, and synthesize findings.",
    icon: <Globe className="w-6 h-6" />, color: "text-green-400", bg: "bg-green-500/10 border-green-500/20",
    category: "Research", stars: 189, tags: ["research", "analysis", "synthesis"],
  },
  {
    id: "writer", name: "Content Writer", description: "Creates blog posts, documentation, marketing copy, and creative writing.",
    model: "claude-3.7-sonnet", systemPrompt: "You are a skilled writer. Create engaging, clear, and well-structured content.",
    icon: <FileText className="w-6 h-6" />, color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/20",
    category: "Content", stars: 167, tags: ["writing", "blog", "docs"],
  },
  {
    id: "analyst", name: "Data Analyst", description: "Analyzes datasets, generates insights, creates charts, and writes reports.",
    model: "gpt-4.1", systemPrompt: "You are a data analyst. Analyze data, identify patterns, and present insights clearly.",
    icon: <Database className="w-6 h-6" />, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20",
    category: "Analytics", stars: 134, tags: ["data", "analytics", "charts"],
  },
  {
    id: "chatbot", name: "Customer Support", description: "Friendly support agent that handles inquiries, FAQs, and troubleshooting.",
    model: "gemini-2.5-pro", systemPrompt: "You are a friendly customer support agent. Help users with their questions professionally.",
    icon: <MessageSquare className="w-6 h-6" />, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20",
    category: "Support", stars: 211, tags: ["support", "FAQ", "chat"],
  },
  {
    id: "security", name: "Security Auditor", description: "Reviews code for vulnerabilities, audits configurations, and recommends hardening.",
    model: "claude-4-opus", systemPrompt: "You are a cybersecurity expert. Audit code and configurations for security vulnerabilities.",
    icon: <Shield className="w-6 h-6" />, color: "text-red-400", bg: "bg-red-500/10 border-red-500/20",
    category: "Security", stars: 98, tags: ["security", "audit", "pentest"],
  },
  {
    id: "creative", name: "Creative AI", description: "Brainstorms ideas, generates creative concepts, and explores novel approaches.",
    model: "grok-3", systemPrompt: "You are a highly creative thinker. Generate novel ideas, alternatives, and creative solutions.",
    icon: <Sparkles className="w-6 h-6" />, color: "text-pink-400", bg: "bg-pink-500/10 border-pink-500/20",
    category: "Creative", stars: 156, tags: ["creative", "brainstorm", "ideas"],
  },
  {
    id: "tutor", name: "AI Tutor", description: "Teaches concepts with patience, adjusts to learning level, uses examples.",
    model: "deepseek-r1", systemPrompt: "You are a patient tutor. Explain concepts clearly, use examples, and adapt to the student's level.",
    icon: <Brain className="w-6 h-6" />, color: "text-indigo-400", bg: "bg-indigo-500/10 border-indigo-500/20",
    category: "Education", stars: 178, tags: ["teaching", "learning", "education"],
  },
];

export default function TemplatesPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");

  const categories = ["all", ...new Set(templates.map((t) => t.category))];

  const filtered = templates.filter((t) => {
    if (category !== "all" && t.category !== category) return false;
    if (search) {
      const q = search.toLowerCase();
      return t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q) ||
             t.tags.some((tag) => tag.includes(q));
    }
    return true;
  });

  const copyPrompt = (prompt: string) => {
    navigator.clipboard.writeText(prompt);
    toast.success("System prompt copied!");
  };

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-500 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2">
          <Zap className="w-7 h-7 sm:w-8 sm:h-8 text-cyan-400" /> Agent Templates
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">{templates.length} pre-configured agent templates</p>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input type="text" placeholder="Search templates..." value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-black/20 border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white focus:border-cyan-500/50 focus:outline-none" />
        </div>
        <div className="flex rounded-lg border border-white/10 overflow-hidden">
          {categories.map((c) => (
            <button key={c} onClick={() => setCategory(c)}
              className={`px-3 py-2 text-xs font-semibold capitalize ${category === c ? "bg-cyan-500/10 text-cyan-400" : "text-gray-500 hover:text-white"}`}>
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 stagger-in">
        {filtered.map((t) => (
          <div key={t.id} className={`glass-panel p-5 border rounded-xl space-y-3 hover:shadow-[0_0_30px_rgba(6,182,212,0.05)] transition-all group ${t.bg.split(" ")[1] || "border-white/5"}`}>
            <div className="flex items-center justify-between">
              <div className={`p-2.5 rounded-xl ${t.bg.split(" ")[0]} group-hover:scale-110 transition-transform`}>
                <span className={t.color}>{t.icon}</span>
              </div>
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Star className="w-3 h-3 text-amber-400 fill-amber-400" /> {t.stars}
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-white text-sm">{t.name}</h3>
              <p className="text-xs text-gray-500 mt-1 line-clamp-2">{t.description}</p>
            </div>
            <div className="flex flex-wrap gap-1">
              {t.tags.map((tag) => (
                <span key={tag} className="px-1.5 py-0.5 bg-white/5 rounded text-[10px] text-gray-500">{tag}</span>
              ))}
            </div>
            <div className="text-[10px] text-gray-600 font-mono">{t.model}</div>
            <div className="flex gap-2">
              <Link href="/dashboard/agents"
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold hover:bg-cyan-500/20">
                <Plus className="w-3.5 h-3.5" /> Use
              </Link>
              <button onClick={() => copyPrompt(t.systemPrompt)}
                className="p-2 rounded-lg border border-white/10 text-gray-400 hover:text-white">
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
