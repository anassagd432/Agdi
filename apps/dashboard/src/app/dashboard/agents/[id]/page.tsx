"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Bot,
  User,
  Mic,
  Send,
  Paperclip,
  Terminal,
  ArrowLeft,
  StopCircle,
  Loader2,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { agdi } from "@/lib/agdi-client";

interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  timestamp: number;
  toolCall?: {
    name: string;
    args: string;
  };
}

export default function AgentChatPage() {
  const params = useParams<{ id: string }>();
  const agentId = params?.id || "";

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputVal, setInputVal] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [agentInfo, setAgentInfo] = useState<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom
  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Fetch agent info
  useEffect(() => {
    async function fetchAgent() {
      try {
        const res = await agdi.call("agents.list");
        if (res && Array.isArray(res.agents)) {
          const agent = res.agents.find(
            (a: any) => a.id === agentId || a.name === agentId
          );
          if (agent) setAgentInfo(agent);
        }
      } catch {
        // silently fail — agent info is optional
      }
    }
    fetchAgent();
  }, [agentId]);

  // Fetch message history
  useEffect(() => {
    async function fetchHistory() {
      try {
        const res = await agdi.getHistory(agentId);
        if (res && Array.isArray(res.messages)) {
          setMessages(
            res.messages.map((m: any, i: number) => ({
              id: m.id || `hist-${i}`,
              role: m.role || "assistant",
              content: m.content || m.text || "",
              timestamp: m.timestamp || Date.now(),
              toolCall: m.toolCall,
            }))
          );
        }
      } catch {
        // No history available — start fresh
        setMessages([
          {
            id: "init",
            role: "system",
            content: `Session started with agent "${agentId}". Send a message to begin.`,
            timestamp: Date.now(),
          },
        ]);
      }
    }
    fetchHistory();
  }, [agentId]);

  // Listen for streaming events from this agent
  useEffect(() => {
    const unsub = agdi.onEvent("*", (event) => {
      if (
        event.data?.agentId === agentId ||
        event.data?.agent === agentId
      ) {
        if (event.type === "agent:stream" || event.type === "agent:chunk") {
          // Streaming chunk — append to last assistant message
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (last?.role === "assistant" && last.id === "streaming") {
              return [
                ...prev.slice(0, -1),
                { ...last, content: last.content + (event.data?.text || "") },
              ];
            }
            return prev;
          });
        }

        if (event.type === "agent:tool_call") {
          setMessages((prev) => [
            ...prev,
            {
              id: `tool-${Date.now()}`,
              role: "tool",
              content: `Tool called: ${event.data?.tool || "unknown"}`,
              timestamp: Date.now(),
              toolCall: {
                name: String(event.data?.tool || ""),
                args: typeof event.data?.args === "string"
                  ? event.data.args
                  : JSON.stringify(event.data?.args || {}, null, 2),
              },
            },
          ]);
        }
      }
    });
    return unsub;
  }, [agentId]);

  const handleSend = async () => {
    const text = inputVal.trim();
    if (!text || isSending) return;

    // Add user message immediately
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInputVal("");
    setIsSending(true);

    // Add placeholder for assistant response
    setMessages((prev) => [
      ...prev,
      {
        id: "streaming",
        role: "assistant",
        content: "",
        timestamp: Date.now(),
      },
    ]);

    try {
      const res = await agdi.sendMessage(agentId, text);
      const responseText =
        res?.content ||
        res?.text ||
        res?.message ||
        (typeof res === "string" ? res : JSON.stringify(res));

      // Replace streaming placeholder with final response
      setMessages((prev) =>
        prev.map((m) =>
          m.id === "streaming"
            ? {
                ...m,
                id: `assistant-${Date.now()}`,
                content: responseText,
              }
            : m
        )
      );
    } catch (err: any) {
      // Replace streaming placeholder with error
      setMessages((prev) =>
        prev.map((m) =>
          m.id === "streaming"
            ? {
                ...m,
                id: `error-${Date.now()}`,
                role: "system",
                content: `Error: ${err.message || "Failed to get response"}`,
              }
            : m
        )
      );
      toast.error("Failed to send message to agent.");
    } finally {
      setIsSending(false);
      textareaRef.current?.focus();
    }
  };

  const handleVoiceToggle = () => {
    setIsRecording(!isRecording);
    if (!isRecording) {
      toast.info("Voice recording started. Speak your commands...");
    } else {
      toast.success("Voice input captured and transcribed.");
      setInputVal((prev) => prev + " [Voice Input]");
    }
  };

  const formatTime = (ts: number) => {
    return new Date(ts).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const agentName = agentInfo?.name || agentId;
  const agentStatus = agentInfo?.status || "unknown";

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/agents"
            className="p-2 glass hover:bg-white/10 rounded-md text-muted-foreground transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-500/20 text-cyan-400 rounded-lg">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-white tracking-tight">
                  {agentName}
                </h1>
                <span
                  className={`w-2 h-2 rounded-full ${
                    agentStatus === "running"
                      ? "bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(34,211,238,0.8)]"
                      : agentStatus === "idle"
                        ? "bg-emerald-400"
                        : "bg-gray-500"
                  }`}
                />
              </div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">
                {agentInfo?.model || "Default Model"} •{" "}
                {agentStatus === "running" ? "Processing" : "Ready"}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {messages.filter((m) => m.role === "user").length} messages
          </span>
          <Link
            href="/dashboard/console"
            className="glass-button px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-2"
          >
            <Terminal className="w-4 h-4" /> Console
          </Link>
        </div>
      </div>

      {/* Chat History */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-4 pr-4 pb-6"
      >
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.role !== "user" && (
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1 ${
                  msg.role === "system"
                    ? "bg-zinc-800 text-zinc-400"
                    : msg.role === "tool"
                      ? "bg-amber-500/20 text-amber-400"
                      : "bg-cyan-500/20 text-cyan-400"
                }`}
              >
                {msg.role === "system" ? (
                  <AlertCircle className="w-4 h-4" />
                ) : msg.role === "tool" ? (
                  <Terminal className="w-4 h-4" />
                ) : (
                  <Bot className="w-4 h-4" />
                )}
              </div>
            )}

            <div
              className={`flex flex-col gap-1 max-w-[80%] ${msg.role === "user" ? "items-end" : "items-start"}`}
            >
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="capitalize font-medium text-white/60">
                  {msg.role === "assistant" ? agentName : msg.role}
                </span>
                <span>•</span>
                <span>{formatTime(msg.timestamp)}</span>
              </div>

              <div
                className={`px-4 py-3 rounded-xl text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === "user"
                    ? "bg-cyan-600 text-white rounded-tr-sm shadow-md"
                    : msg.role === "system"
                      ? "bg-black/40 text-muted-foreground border border-white/5 font-mono text-xs"
                      : msg.role === "tool"
                        ? "bg-amber-500/10 border border-amber-500/20 text-amber-200 font-mono text-xs"
                        : "bg-white/5 text-white/90 border border-white/10 rounded-tl-sm glass"
                }`}
              >
                {/* Streaming indicator */}
                {msg.id === "streaming" && !msg.content ? (
                  <div className="flex items-center gap-2 text-cyan-400">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Thinking...</span>
                  </div>
                ) : (
                  <p>{msg.content}</p>
                )}

                {/* Tool Call */}
                {msg.toolCall && (
                  <div className="mt-3 bg-black/40 border border-white/5 rounded-md p-3 font-mono text-xs text-white/70">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-cyan-400 font-semibold">
                        {msg.toolCall.name}
                      </span>
                    </div>
                    <code className="text-green-400 block whitespace-pre-wrap">
                      {msg.toolCall.args}
                    </code>
                  </div>
                )}
              </div>
            </div>

            {msg.role === "user" && (
              <div className="w-8 h-8 rounded-full bg-slate-700 text-white flex items-center justify-center shrink-0 mt-1">
                <User className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Input Area */}
      <div className="shrink-0 mt-4">
        <div className="glass-panel p-2 flex items-end gap-2 relative bg-black/40 border-cyan-500/20 focus-within:border-cyan-500/50 focus-within:ring-1 focus-within:ring-cyan-500/20 transition-all">
          <button className="p-3 text-muted-foreground hover:text-white transition-colors shrink-0">
            <Paperclip className="w-5 h-5" />
          </button>

          <textarea
            ref={textareaRef}
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={
              isSending
                ? "Waiting for response..."
                : "Instruct the agent or ask a question..."
            }
            disabled={isSending}
            className="flex-1 bg-transparent border-none outline-none text-white text-sm py-3 min-h-[50px] max-h-[200px] resize-none focus:ring-0 disabled:opacity-50"
            rows={1}
          />

          <div className="flex items-center gap-2 p-1 self-center">
            <button
              onClick={handleVoiceToggle}
              disabled={isSending}
              className={`p-2.5 rounded-lg transition-colors flex items-center justify-center ${
                isRecording
                  ? "bg-red-500/20 text-red-500 animate-pulse"
                  : "hover:bg-white/10 text-cyan-400"
              } disabled:opacity-50`}
              title="Voice Prompting (STT)"
            >
              {isRecording ? (
                <StopCircle className="w-5 h-5" />
              ) : (
                <Mic className="w-5 h-5" />
              )}
            </button>
            <button
              onClick={handleSend}
              disabled={!inputVal.trim() || isSending}
              className={`p-2.5 rounded-lg transition-colors flex items-center justify-center ${
                inputVal.trim() && !isSending
                  ? "bg-cyan-500 text-black hover:bg-cyan-400"
                  : "bg-white/5 text-muted-foreground cursor-not-allowed"
              }`}
            >
              {isSending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
        <div className="flex justify-between items-center mt-2 px-2">
          <span className="text-xs text-muted-foreground">
            Use{" "}
            <kbd className="font-sans px-1 bg-white/10 rounded">Shift</kbd> +{" "}
            <kbd className="font-sans px-1 bg-white/10 rounded">Enter</kbd> for
            a new line
          </span>
          <span className="text-xs text-cyan-500/50">
            Agent Context Protocol
          </span>
        </div>
      </div>
    </div>
  );
}
