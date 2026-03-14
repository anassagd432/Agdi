"use client";
import React, { useState, useEffect } from "react";
import { Zap, Shield, Bot, MessageSquare, CheckCircle2, ArrowRight, Sparkles } from "lucide-react";

const ONBOARDING_KEY = "agdi-onboarding-complete";

export function useOnboarding() {
  const [show, setShow] = useState(false);
  useEffect(() => { if (!localStorage.getItem(ONBOARDING_KEY)) setShow(true); }, []);
  const complete = () => { localStorage.setItem(ONBOARDING_KEY, "true"); setShow(false); };
  const reset = () => { localStorage.removeItem(ONBOARDING_KEY); setShow(true); };
  return { show, complete, reset };
}

export function OnboardingWizard({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const steps = [
    { title: "Welcome to Agdi", desc: "Your AI-powered command center.", icon: <Zap className="w-8 h-8" />,
      content: <p className="text-sm text-gray-300">Agdi Command gives you full visibility and control over your autonomous AI agents, messaging channels, and automation workflows.</p> },
    { title: "Connect Your Gateway", desc: "Bridge your agents to the dashboard.", icon: <Shield className="w-8 h-8" />,
      content: <div className="space-y-3"><p className="text-sm text-gray-300">Make sure your Agdi gateway is running.</p><div className="bg-black/40 border border-white/10 rounded-lg p-4 font-mono text-xs text-cyan-400">agdi gateway run --port 18789</div></div> },
    { title: "Spawn Your First Agent", desc: "Create an AI agent.", icon: <Bot className="w-8 h-8" />,
      content: <ol className="list-decimal list-inside space-y-2 text-sm text-gray-400"><li>Name your agent and set a system prompt</li><li>Select an LLM model</li><li>Click Create</li><li>Open the chat to interact</li></ol> },
    { title: "Connect Channels", desc: "Route agents to messaging platforms.", icon: <MessageSquare className="w-8 h-8" />,
      content: <div className="flex flex-wrap gap-2 mt-2">{["WhatsApp","Discord","Telegram","Slack","Signal"].map(c=><span key={c} className="bg-white/5 border border-white/10 rounded-full px-3 py-1 text-xs text-gray-300">{c}</span>)}</div> },
    { title: "You're All Set!", desc: "Start commanding your AI agents.", icon: <Sparkles className="w-8 h-8" />,
      content: <ul className="space-y-2 text-sm text-gray-400">{["Press ⌘K for Command Palette","Check Analytics for costs","Use Traces to debug"].map(t=><li key={t} className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-cyan-400 mt-0.5 shrink-0"/><span>{t}</span></li>)}</ul> },
  ];
  const s = steps[step]; const isLast = step === steps.length - 1;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />
      <div className="relative w-full max-w-lg mx-4 bg-[#0a1628] border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        <div className="h-1 bg-white/5"><div className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500" style={{ width: `${((step+1)/steps.length)*100}%` }}/></div>
        <div className="pt-8 pb-4 px-8 flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-400/20 to-blue-500/20 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-4">{s.icon}</div>
          <h2 className="text-xl font-bold text-white">{s.title}</h2>
          <p className="text-sm text-gray-400 mt-1">{s.desc}</p>
        </div>
        <div className="px-8 pb-6">{s.content}</div>
        <div className="px-8 pb-8 flex items-center justify-between">
          <div className="flex items-center gap-1.5">{steps.map((_,i)=><button key={i} onClick={()=>setStep(i)} className={`w-2 h-2 rounded-full transition-all ${i===step?"bg-cyan-400 w-6":i<step?"bg-cyan-400/40":"bg-white/10"}`}/>)}</div>
          <div className="flex items-center gap-3">
            {!isLast && <button onClick={onComplete} className="text-sm text-gray-500 hover:text-gray-300">Skip</button>}
            <button onClick={()=>isLast?onComplete():setStep(s=>s+1)} className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold px-5 py-2 rounded-lg text-sm flex items-center gap-2">
              {isLast?<>Get Started <Sparkles className="w-4 h-4"/></>:<>Next <ArrowRight className="w-4 h-4"/></>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
