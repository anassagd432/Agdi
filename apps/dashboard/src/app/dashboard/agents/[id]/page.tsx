"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Bot, Send, ArrowLeft, Loader2, Trash2, Copy, RotateCcw,
  Cpu, Clock, Sparkles, Wrench, Code, Globe,
} from "lucide-react";
import { toast } from "sonner";
import { agdi } from "@/lib/agdi-client";
import { appendChatMessage, loadChatHistory, clearChatHistory, type ChatMessage } from "@/lib/chat-history";

/* ── Markdown-lite renderer ───────────────────────────────────────── */

function renderContent(text: string) {
  // Code blocks
  const parts = text.split(/(```[\s\S]*?```)/g);
  return parts.map((part, i) => {
    if (part.startsWith("```")) {
      const lines = part.slice(3, -3).split("\n");
      const lang = lines[0]?.trim() || "";
      const code = lang ? lines.slice(1).join("\n") : lines.join("\n");
      return (
        <div key={i} className="my-2 rounded-lg overflow-hidden">
          {lang && <div className="bg-white/5 px-3 py-1 text-[10px] text-gray-500 font-mono uppercase">{lang}</div>}
          <pre className="bg-black/40 p-3 overflow-x-auto text-xs"><code>{code}</code></pre>
        </div>
      );
    }
    // Inline code
    return (
      <span key={i}>
        {part.split(/(`[^`]+`)/g).map((seg, j) =>
          seg.startsWith("`") && seg.endsWith("`")
            ? <code key={j} className="bg-white/10 px-1.5 py-0.5 rounded text-xs font-mono text-cyan-300">{seg.slice(1, -1)}</code>
            : <span key={j}>{seg}</span>
        )}
      </span>
    );
  });
}

/* ── Role config ──────────────────────────────────────────────────── */

const roleConfig: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  user:      { label: "You", color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20", icon: <Sparkles className="w-4 h-4" /> },
  assistant: { label: "Agent", color: "text-cyan-400", bg: "bg-cyan-500/10 border-cyan-500/20", icon: <Bot className="w-4 h-4" /> },
  system:    { label: "System", color: "text-gray-400", bg: "bg-gray-500/10 border-gray-500/20", icon: <Cpu className="w-4 h-4" /> },
  tool:      { label: "Tool", color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20", icon: <Wrench className="w-4 h-4" /> },
};

/* ── Page ─────────────────────────────────────────────────────────── */

export default function AgentChatPage() {
  const params = useParams();
  const router = useRouter();
  const agentId = params.id as string;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [agentName, setAgentName] = useState("Agent");
  const [agentModel, setAgentModel] = useState("claude-opus-4.6");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Load history + agent info
  useEffect(() => {
    const init = async () => {
      const history = await loadChatHistory(agentId).catch(() => []);
      setMessages(history);
      setLoading(false);
      // Try get agent info from gateway
      const agents = (await agdi.getAgents()) as Record<string, unknown>[];
      const agent = agents.find((a) => String(a.id) === agentId);
      if (agent) {
        setAgentName(String(agent.name || `Agent ${agentId.slice(0, 6)}`));
        setAgentModel(String(agent.model || "claude-opus-4.6"));
      } else {
        setAgentName(`Agent ${agentId.slice(0, 6)}`);
      }
    };
    init();
  }, [agentId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    setSending(true);

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(), role: "user",
      content: text, timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);
    appendChatMessage(agentId, userMsg).catch(() => {});

    try {
      const res = await agdi.sendMessage(agentId, text);
      const reply = (res as Record<string, unknown>).message || (res as Record<string, unknown>).content || JSON.stringify(res);
      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(), role: "assistant",
        content: String(reply), timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
      appendChatMessage(agentId, assistantMsg).catch(() => {});
    } catch {
      // Fallback response for demo mode
      const fallback: ChatMessage = {
        id: crypto.randomUUID(), role: "assistant",
        content: "I received your message. The gateway connection is currently simulated — connect your Agdi gateway to get real AI responses.",
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, fallback]);
      appendChatMessage(agentId, fallback).catch(() => {});
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }, [input, sending, agentId]);

  const handleClear = async () => {
    if (!confirm("Clear all chat history for this agent?")) return;
    await clearChatHistory(agentId).catch(() => {});
    setMessages([]);
    toast.success("Chat history cleared.");
  };

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
    toast.success("Copied to clipboard!");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/dashboard/agents")}
            className="p-2 rounded-lg border border-white/10 text-gray-400 hover:text-white">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400/20 to-blue-600/20 flex items-center justify-center">
            <Bot className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h1 className="font-semibold text-white">{agentName}</h1>
            <p className="text-xs text-gray-500">{agentModel} · {messages.length} messages</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleClear} className="p-2 rounded-lg border border-white/10 text-gray-400 hover:text-red-400" title="Clear history">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-4 space-y-4">
        {loading && (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
          </div>
        )}

        {!loading && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-400/10 to-blue-600/10 border border-cyan-500/20 flex items-center justify-center">
              <Bot className="w-10 h-10 text-cyan-400/50" />
            </div>
            <h2 className="text-lg font-semibold text-white">Start a conversation</h2>
            <p className="text-sm text-gray-500 text-center max-w-sm">
              Send a message to {agentName} to begin. Messages are persisted locally.
            </p>
            <div className="flex gap-2 flex-wrap justify-center mt-2">
              {["What can you do?", "Help me with code", "Analyze this data"].map((suggestion) => (
                <button key={suggestion} onClick={() => { setInput(suggestion); inputRef.current?.focus(); }}
                  className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-gray-400 hover:text-white hover:bg-white/10 transition-colors">
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => {
          const rc = roleConfig[msg.role] || roleConfig.system;
          const isUser = msg.role === "user";
          return (
            <div key={msg.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] ${isUser ? "order-2" : ""}`}>
                <div className="flex items-center gap-2 mb-1">
                  {!isUser && <span className={rc.color}>{rc.icon}</span>}
                  <span className={`text-[10px] font-semibold uppercase tracking-wider ${rc.color}`}>{rc.label}</span>
                  <span className="text-[10px] text-gray-600">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  {msg.toolName && <span className="text-[10px] text-amber-400 font-mono">({msg.toolName})</span>}
                </div>
                <div className={`p-3.5 rounded-xl border text-sm leading-relaxed whitespace-pre-wrap ${
                  isUser
                    ? "bg-gradient-to-r from-cyan-500/10 to-blue-600/10 border-cyan-500/20 text-white"
                    : `${rc.bg} text-gray-200`
                }`}>
                  {renderContent(msg.content)}
                </div>
                {!isUser && (
                  <div className="flex items-center gap-1 mt-1">
                    <button onClick={() => handleCopy(msg.content)}
                      className="p-1 rounded text-gray-600 hover:text-gray-300" title="Copy">
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {sending && (
          <div className="flex items-center gap-2 text-gray-500 text-sm">
            <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
            <span>{agentName} is thinking...</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="pt-3 border-t border-white/5">
        <div className="flex items-end gap-2">
          <textarea ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown} rows={1} placeholder={`Message ${agentName}...`}
            className="flex-1 bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white text-sm
                       focus:border-cyan-500/50 focus:outline-none resize-none min-h-[44px] max-h-[160px]
                       placeholder:text-gray-500"
            style={{ height: "auto", overflow: "hidden" }}
            onInput={(e) => { const t = e.currentTarget; t.style.height = "auto"; t.style.height = t.scrollHeight + "px"; }} />
          <button onClick={handleSend} disabled={!input.trim() || sending}
            className="p-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white disabled:opacity-30
                       hover:from-cyan-400 hover:to-blue-500 transition-all shrink-0">
            {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </button>
        </div>
        <p className="text-[10px] text-gray-600 text-center mt-2">
          Press Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
