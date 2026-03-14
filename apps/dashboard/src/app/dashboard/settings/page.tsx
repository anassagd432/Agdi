"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Settings2,
  Key,
  MessageSquare,
  Shield,
  Webhook,
  Save,
  Mic,
  Wrench,
  Loader2,
  CheckCircle2,
  Circle,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { agdi } from "@/lib/agdi-client";

type Tab = "system" | "models" | "voice" | "mcp" | "channels" | "advanced";

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "system", label: "System", icon: <Settings2 className="w-4 h-4" /> },
  { id: "models", label: "Language Models", icon: <Key className="w-4 h-4" /> },
  { id: "voice", label: "Voice Integration", icon: <Mic className="w-4 h-4" /> },
  { id: "mcp", label: "MCP Tools", icon: <Wrench className="w-4 h-4" /> },
  { id: "channels", label: "Channels", icon: <MessageSquare className="w-4 h-4" /> },
  { id: "advanced", label: "Advanced", icon: <Shield className="w-4 h-4" /> },
];

interface ConfigSnapshot {
  config: Record<string, unknown>;
  baseHash?: string;
  exists?: boolean;
}

function isConfigured(val: unknown): boolean {
  return typeof val === "string" && val.trim().length > 0;
}

function StatusBadge({ configured }: { configured: boolean }) {
  return configured ? (
    <span className="text-xs text-emerald-400 flex items-center gap-1">
      <CheckCircle2 className="w-3 h-3" /> Configured
    </span>
  ) : (
    <span className="text-xs text-muted-foreground flex items-center gap-1">
      <Circle className="w-3 h-3" /> Not Configured
    </span>
  );
}

function Toggle({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`w-10 h-5 rounded-full relative transition-colors ${value ? "bg-cyan-500" : "bg-gray-600"}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${value ? "translate-x-5" : "translate-x-0"}`}
      />
    </button>
  );
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("system");
  const [snapshot, setSnapshot] = useState<ConfigSnapshot | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Editable fields
  const [gatewayUrl, setGatewayUrl] = useState("http://localhost:18789");
  const [openaiKey, setOpenaiKey] = useState("");
  const [anthropicKey, setAnthropicKey] = useState("");
  const [geminiKey, setGeminiKey] = useState("");
  const [groqKey, setGroqKey] = useState("");
  const [ollamaUrl, setOllamaUrl] = useState("http://localhost:11434");
  const [elevenlabsKey, setElevenlabsKey] = useState("");
  const [voiceId, setVoiceId] = useState("");
  const [mcpFilesystem, setMcpFilesystem] = useState(true);
  const [mcpTerminal, setMcpTerminal] = useState(true);
  const [mcpDocker, setMcpDocker] = useState(false);

  const loadConfig = useCallback(async () => {
    setIsLoading(true);
    try {
      const snap = await agdi.call("config.get");
      if (snap) {
        setSnapshot(snap);
        const cfg = snap.config ?? {};
        // Populate fields from real config — keys match the Agdi config shape
        setOpenaiKey((cfg.openai as { apiKey?: string })?.apiKey ?? "");
        setAnthropicKey((cfg.anthropic as { apiKey?: string })?.apiKey ?? "");
        setGeminiKey((cfg.google as { apiKey?: string })?.apiKey ?? (cfg.gemini as { apiKey?: string })?.apiKey ?? "");
        setGroqKey((cfg.groq as { apiKey?: string })?.apiKey ?? "");
        setOllamaUrl((cfg.ollama as { baseUrl?: string })?.baseUrl ?? "http://localhost:11434");
        setElevenlabsKey((cfg.elevenlabs as { apiKey?: string })?.apiKey ?? "");
        setVoiceId((cfg.elevenlabs as { voiceId?: string })?.voiceId ?? "");
        // MCP tools state from config if available
        const tools = cfg.tools as Record<string, boolean> | undefined;
        if (tools) {
          setMcpFilesystem(tools.filesystem !== false);
          setMcpTerminal(tools.terminal !== false);
          setMcpDocker(tools.docker === true);
        }
      }
    } catch (e) {
      console.warn("config.get failed:", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      // Build a JSON merge-patch with only changed/relevant fields
      const patch: Record<string, unknown> = {
        openai: { apiKey: openaiKey || undefined },
        anthropic: { apiKey: anthropicKey || undefined },
        google: { apiKey: geminiKey || undefined },
        groq: { apiKey: groqKey || undefined },
        ollama: { baseUrl: ollamaUrl || undefined },
        elevenlabs: {
          apiKey: elevenlabsKey || undefined,
          voiceId: voiceId || undefined,
        },
        tools: {
          filesystem: mcpFilesystem,
          terminal: mcpTerminal,
          docker: mcpDocker,
        },
      };
      const baseHash = snapshot?.baseHash ?? (snapshot?.config as Record<string, unknown> | undefined)?.hash as string | undefined;
      await agdi.call("config.patch", {
        raw: JSON.stringify(patch),
        ...(baseHash ? { baseHash } : {}),
      });
      toast.success("Configuration saved to daemon.");
      // Reload to get fresh hash
      await loadConfig();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(`Save failed: ${msg}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading configuration…
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-8 pb-12 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-white mb-1">Configuration</h1>
        <p className="text-muted-foreground">
          Manage your Agdi daemon connections, LLM providers, and external channels.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mt-8">
        {/* Tab Sidebar */}
        <div className="md:col-span-1 space-y-1 flex flex-col">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "bg-cyan-500/10 text-cyan-400"
                  : "hover:bg-white/5 text-muted-foreground"
              }`}
            >
              {tab.icon} {tab.label}
              {activeTab === tab.id && <ChevronRight className="w-3 h-3 ml-auto" />}
            </button>
          ))}
        </div>

        {/* Settings Content */}
        <div className="md:col-span-3 space-y-6 glass-panel p-6">
          {/* ── System Tab ── */}
          {activeTab === "system" && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-white flex items-center gap-2">
                <Settings2 className="w-5 h-5 text-cyan-400" /> Local Daemon Connection
              </h3>
              <p className="text-sm text-muted-foreground">
                Configure how the dashboard connects to your local Agdi daemon.
              </p>
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <label className="text-sm font-medium text-white/80">Gateway URL</label>
                  <input
                    type="text"
                    value={gatewayUrl}
                    onChange={(e) => setGatewayUrl(e.target.value)}
                    className="glass bg-black/20 border-white/10 px-3 py-2 rounded-md outline-none text-white focus:border-cyan-500/50 transition-colors"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
                  <span className="text-sm text-cyan-400">
                    Connected · {snapshot?.exists ? "Config loaded" : "Default config"}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ── Models Tab ── */}
          {activeTab === "models" && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-white flex items-center gap-2">
                <Key className="w-5 h-5 text-cyan-400" /> Language Models
              </h3>
              <p className="text-sm text-muted-foreground">
                API keys are stored securely on your local Agdi daemon.
              </p>
              <div className="grid gap-6">
                {[
                  { label: "OpenAI API Key", value: openaiKey, set: setOpenaiKey, placeholder: "sk-..." },
                  { label: "Anthropic API Key", value: anthropicKey, set: setAnthropicKey, placeholder: "sk-ant-..." },
                  { label: "Google Gemini API Key", value: geminiKey, set: setGeminiKey, placeholder: "AIzaSy..." },
                  { label: "Groq API Key", value: groqKey, set: setGroqKey, placeholder: "gsk_..." },
                ].map(({ label, value, set, placeholder }) => (
                  <div key={label} className="grid gap-2">
                    <label className="text-sm font-medium text-white/80 flex justify-between">
                      <span>{label}</span>
                      <StatusBadge configured={isConfigured(value)} />
                    </label>
                    <input
                      type="password"
                      value={value}
                      onChange={(e) => set(e.target.value)}
                      placeholder={placeholder}
                      className="glass bg-white/5 border-white/10 px-3 py-2 rounded-md outline-none focus:border-cyan-500/50 text-white font-mono"
                    />
                  </div>
                ))}
                <div className="grid gap-2">
                  <label className="text-sm font-medium text-white/80 flex justify-between">
                    <span>Local Ollama Endpoint</span>
                    <StatusBadge configured={isConfigured(ollamaUrl)} />
                  </label>
                  <input
                    type="text"
                    value={ollamaUrl}
                    onChange={(e) => setOllamaUrl(e.target.value)}
                    className="glass bg-white/5 border-white/10 px-3 py-2 rounded-md outline-none focus:border-cyan-500/50 text-white font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ── Voice Tab ── */}
          {activeTab === "voice" && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-white flex items-center gap-2">
                <Mic className="w-5 h-5 text-cyan-400" /> Voice & Audio Settings
              </h3>
              <div className="grid gap-6">
                <div className="grid gap-2">
                  <label className="text-sm font-medium text-white/80 flex justify-between">
                    <span>ElevenLabs API Key (TTS)</span>
                    <StatusBadge configured={isConfigured(elevenlabsKey)} />
                  </label>
                  <input
                    type="password"
                    value={elevenlabsKey}
                    onChange={(e) => setElevenlabsKey(e.target.value)}
                    placeholder="elevenlabs api key"
                    className="glass bg-white/5 border-white/10 px-3 py-2 rounded-md outline-none focus:border-cyan-500/50 text-white font-mono"
                  />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium text-white/80">Default Voice ID</label>
                  <input
                    type="text"
                    value={voiceId}
                    onChange={(e) => setVoiceId(e.target.value)}
                    placeholder="pNInz6obbf5AWBMy"
                    className="glass bg-white/5 border-white/10 px-3 py-2 rounded-md outline-none focus:border-cyan-500/50 text-white font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ── MCP Tools Tab ── */}
          {activeTab === "mcp" && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-white flex items-center gap-2">
                <Wrench className="w-5 h-5 text-cyan-400" /> Model Context Protocol (MCP) Tools
              </h3>
              <p className="text-sm text-muted-foreground">
                Manage tool sets available to autonomous agents.
              </p>
              <div className="grid gap-4">
                {[
                  {
                    label: "Local File System Access",
                    desc: "Allows agents to read/write workspace files",
                    value: mcpFilesystem,
                    set: setMcpFilesystem,
                  },
                  {
                    label: "Terminal / Command Execution",
                    desc: "High risk: allows agent to run bash/PowerShell",
                    value: mcpTerminal,
                    set: setMcpTerminal,
                  },
                  {
                    label: "Docker Integration",
                    desc: "Allows execution of code in isolated sandboxes",
                    value: mcpDocker,
                    set: setMcpDocker,
                  },
                ].map(({ label, desc, value, set }) => (
                  <div
                    key={label}
                    className={`flex items-center justify-between p-4 rounded-lg bg-black/20 border border-white/5 ${!value ? "opacity-70" : ""}`}
                  >
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-white flex items-center gap-2">
                        {value && <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />}
                        {label}
                      </span>
                      <span className="text-xs text-muted-foreground">{desc}</span>
                    </div>
                    <Toggle value={value} onChange={set} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Channels Tab ── */}
          {activeTab === "channels" && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-white flex items-center gap-2">
                <Webhook className="w-5 h-5 text-cyan-400" /> Messaging Channels
              </h3>
              <p className="text-sm text-muted-foreground">
                Configure webhooks and bot tokens for messaging platforms.
              </p>
              <div className="grid gap-4">
                {[
                  {
                    label: "Discord Bot",
                    desc: "Forward Agdi alerts to Discord channels",
                    href: "https://docs.agdi.ai/channels/discord",
                  },
                  {
                    label: "Slack App",
                    desc: "Receive context-aware pings on Slack",
                    href: "https://docs.agdi.ai/channels/slack",
                  },
                  {
                    label: "Telegram Bot",
                    desc: "Chat with agents via Telegram",
                    href: "https://docs.agdi.ai/channels/telegram",
                  },
                  {
                    label: "WhatsApp",
                    desc: "Use agents through WhatsApp Web",
                    href: "https://docs.agdi.ai/channels/whatsapp",
                  },
                ].map(({ label, desc, href }) => (
                  <div
                    key={label}
                    className="flex items-center justify-between p-4 rounded-lg bg-black/20 border border-white/5"
                  >
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-white">{label}</span>
                      <span className="text-xs text-muted-foreground">{desc}</span>
                    </div>
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs bg-cyan-500/20 text-cyan-400 px-3 py-1.5 rounded-md hover:bg-cyan-500/30 transition-colors"
                    >
                      Configure →
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Advanced Tab ── */}
          {activeTab === "advanced" && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-white flex items-center gap-2">
                <Shield className="w-5 h-5 text-cyan-400" /> Advanced
              </h3>
              <p className="text-sm text-muted-foreground">
                Low-level daemon configuration. Changes here require a gateway restart.
              </p>
              <div className="p-4 rounded-lg bg-amber-500/5 border border-amber-500/20">
                <p className="text-xs text-amber-400">
                  Advanced config changes are applied via JSON patch and may require the gateway to restart. 
                  Edit <code className="font-mono">~/.agdi/config.json</code> directly for complex changes.
                </p>
              </div>
            </div>
          )}

          {/* Save Button */}
          {activeTab !== "channels" && activeTab !== "advanced" && (
            <div className="pt-6 flex justify-end border-t border-white/10">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className={`glass-button px-6 py-2.5 rounded-md text-sm font-medium flex items-center gap-2 ${isSaving ? "opacity-70 cursor-not-allowed" : ""}`}
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {isSaving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
