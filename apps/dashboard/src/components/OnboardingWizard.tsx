"use client";

import React, { useState, useEffect } from "react";
import {
  Zap,
  Shield,
  Bot,
  MessageSquare,
  CheckCircle2,
  ArrowRight,
  Sparkles,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  content: React.ReactNode;
}

const ONBOARDING_KEY = "agdi-onboarding-complete";

// ── Hook ──────────────────────────────────────────────────────────────────

export function useOnboarding() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Only show if not previously completed
    const done = localStorage.getItem(ONBOARDING_KEY);
    if (!done) {
      setShow(true);
    }
  }, []);

  const complete = () => {
    localStorage.setItem(ONBOARDING_KEY, "true");
    setShow(false);
  };

  const reset = () => {
    localStorage.removeItem(ONBOARDING_KEY);
    setShow(true);
  };

  return { show, complete, reset };
}

// ── Component ─────────────────────────────────────────────────────────────

interface OnboardingWizardProps {
  onComplete: () => void;
}

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const steps: OnboardingStep[] = [
    {
      id: "welcome",
      title: "Welcome to Agdi",
      description: "Your AI-powered command center for autonomous agents.",
      icon: <Zap className="w-8 h-8" />,
      content: (
        <div className="space-y-4 text-sm text-gray-300">
          <p>
            Agdi Command gives you full visibility and control over your
            autonomous AI agents, messaging channels, and automation workflows.
          </p>
          <div className="grid grid-cols-2 gap-3 mt-6">
            {[
              { label: "Agent Fleet", desc: "Spawn & manage AI agents" },
              { label: "Live Console", desc: "Real-time log streaming" },
              { label: "Channels", desc: "WhatsApp, Discord, Telegram" },
              { label: "Analytics", desc: "Token usage & cost tracking" },
            ].map((f) => (
              <div
                key={f.label}
                className="bg-white/5 border border-white/10 rounded-lg p-3"
              >
                <div className="font-semibold text-white text-xs">
                  {f.label}
                </div>
                <div className="text-xs text-gray-500 mt-0.5">{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      id: "gateway",
      title: "Connect Your Gateway",
      description: "The gateway bridges your agents to the dashboard.",
      icon: <Shield className="w-8 h-8" />,
      content: (
        <div className="space-y-4 text-sm text-gray-300">
          <p>
            Make sure your Agdi gateway is running locally or on a remote server.
            The dashboard connects via WebSocket.
          </p>
          <div className="bg-black/40 border border-white/10 rounded-lg p-4 font-mono text-xs text-cyan-400">
            <div className="text-gray-500 mb-1"># Start your gateway</div>
            <div>agdi gateway run --port 18789</div>
          </div>
          <p className="text-xs text-gray-500">
            The connection status is shown in the top banner. A green dot means
            you&apos;re connected.
          </p>
        </div>
      ),
    },
    {
      id: "agents",
      title: "Spawn Your First Agent",
      description: "Create an AI agent to handle tasks autonomously.",
      icon: <Bot className="w-8 h-8" />,
      content: (
        <div className="space-y-4 text-sm text-gray-300">
          <p>
            Navigate to the <strong className="text-white">Agents</strong> page
            and click{" "}
            <strong className="text-cyan-400">Spawn New Agent</strong>.
          </p>
          <ol className="list-decimal list-inside space-y-2 text-gray-400">
            <li>Give your agent a name and system prompt</li>
            <li>Select an LLM model (GPT-4o, Claude, Gemini, etc.)</li>
            <li>Click Create to boot it up</li>
            <li>Open the agent&apos;s chat to interact in real-time</li>
          </ol>
          <p className="text-xs text-gray-500">
            Each agent runs autonomously and can use tools, browse the web, and
            execute code.
          </p>
        </div>
      ),
    },
    {
      id: "channels",
      title: "Connect Messaging Channels",
      description: "Route your agents to WhatsApp, Discord, Telegram, and more.",
      icon: <MessageSquare className="w-8 h-8" />,
      content: (
        <div className="space-y-4 text-sm text-gray-300">
          <p>
            On the <strong className="text-white">Channels</strong> page, you
            can view and manage all connected messaging platforms.
          </p>
          <div className="flex flex-wrap gap-2 mt-2">
            {["WhatsApp", "Discord", "Telegram", "Slack", "Signal", "iMessage"].map(
              (ch) => (
                <span
                  key={ch}
                  className="bg-white/5 border border-white/10 rounded-full px-3 py-1 text-xs text-gray-300"
                >
                  {ch}
                </span>
              ),
            )}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Configure channels via{" "}
            <code className="text-gray-400">agdi config</code> or the Settings
            page.
          </p>
        </div>
      ),
    },
    {
      id: "done",
      title: "You're All Set!",
      description: "Start commanding your AI agents.",
      icon: <Sparkles className="w-8 h-8" />,
      content: (
        <div className="space-y-4 text-sm text-gray-300">
          <p>
            You&apos;re ready to use Agdi Command. Here are some quick tips:
          </p>
          <ul className="space-y-2 text-gray-400">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-cyan-400 mt-0.5 shrink-0" />
              <span>
                Press{" "}
                <kbd className="bg-white/10 px-1.5 py-0.5 rounded text-xs font-mono">
                  ⌘K
                </kbd>{" "}
                to open the Command Palette for quick navigation
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-cyan-400 mt-0.5 shrink-0" />
              <span>
                Check <strong className="text-white">Analytics</strong> for token
                usage and API costs
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-cyan-400 mt-0.5 shrink-0" />
              <span>
                Use <strong className="text-white">Traces</strong> to debug agent
                execution and latency
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-cyan-400 mt-0.5 shrink-0" />
              <span>
                Toggle themes with the sidebar theme switcher
              </span>
            </li>
          </ul>
        </div>
      ),
    },
  ];

  const step = steps[currentStep];
  const isLast = currentStep === steps.length - 1;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />

      {/* Card */}
      <div className="relative w-full max-w-lg mx-4 bg-[#0a1628] border border-white/10 rounded-2xl shadow-[0_0_80px_rgba(0,0,0,0.9)] overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        {/* Progress bar */}
        <div className="h-1 bg-white/5">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500"
            style={{
              width: `${((currentStep + 1) / steps.length) * 100}%`,
            }}
          />
        </div>

        {/* Header */}
        <div className="pt-8 pb-4 px-8 flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-400/20 to-blue-500/20 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-4">
            {step.icon}
          </div>
          <h2 className="text-xl font-bold text-white">{step.title}</h2>
          <p className="text-sm text-gray-400 mt-1">{step.description}</p>
        </div>

        {/* Content */}
        <div className="px-8 pb-6">{step.content}</div>

        {/* Footer */}
        <div className="px-8 pb-8 flex items-center justify-between">
          {/* Step indicators */}
          <div className="flex items-center gap-1.5">
            {steps.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentStep(i)}
                className={`w-2 h-2 rounded-full transition-all ${
                  i === currentStep
                    ? "bg-cyan-400 w-6"
                    : i < currentStep
                      ? "bg-cyan-400/40"
                      : "bg-white/10"
                }`}
              />
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            {!isLast && (
              <button
                onClick={onComplete}
                className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
              >
                Skip
              </button>
            )}
            <button
              onClick={() => {
                if (isLast) {
                  onComplete();
                } else {
                  setCurrentStep((s) => s + 1);
                }
              }}
              className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold px-5 py-2 rounded-lg text-sm flex items-center gap-2 transition-all shadow-[0_0_20px_rgba(34,211,238,0.2)]"
            >
              {isLast ? (
                <>
                  Get Started <Sparkles className="w-4 h-4" />
                </>
              ) : (
                <>
                  Next <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
