/**
 * /jarvis command handler — activate/deactivate Jarvis from any channel.
 *
 * Commands:
 *   /jarvis           → Show status
 *   /jarvis start     → Activate Jarvis
 *   /jarvis stop      → Deactivate Jarvis
 *   /jarvis status    → Show detailed status
 *   /jarvis help      → Show usage guide
 *
 * Works from WhatsApp, Telegram, Discord, web chat, TUI — any channel.
 */

import type { ReplyPayload } from "../types.js";
import type { CommandHandler } from "./commands-types.js";
import { getDaemon } from "../../autonomous/daemon.js";
import { logVerbose } from "../../globals.js";

type ParsedJarvisCommand = {
  action: string;
  args: string;
};

function parseJarvisCommand(normalized: string): ParsedJarvisCommand | null {
  if (normalized === "/jarvis") {
    return { action: "status", args: "" };
  }
  if (!normalized.startsWith("/jarvis ")) {
    return null;
  }
  const rest = normalized.slice(8).trim();
  if (!rest) {
    return { action: "status", args: "" };
  }
  const [action, ...tail] = rest.split(/\s+/);
  return { action: action.toLowerCase(), args: tail.join(" ").trim() };
}

function jarvisUsage(): ReplyPayload {
  return {
    text:
      `🎙️ **Jarvis Voice Assistant**\n\n` +
      `**Commands:**\n` +
      `• /jarvis start — Activate always-on listening\n` +
      `• /jarvis stop — Deactivate Jarvis\n` +
      `• /jarvis status — Show current status\n` +
      `• /jarvis help — Show this guide\n\n` +
      `**How it works:**\n` +
      `Jarvis listens on the system mic, detects the wake word "Agdi",\n` +
      `transcribes your speech, and executes commands automatically.\n\n` +
      `**Prerequisites:**\n` +
      `• SoX installed (for mic recording)\n` +
      `• OpenAI API key set (for Whisper STT)\n\n` +
      `**Example:** Say "Agdi, turn on the lights" and Jarvis will process it.`,
  };
}

function formatUptime(startMs: number | null): string {
  if (!startMs) return "—";
  const elapsed = Date.now() - startMs;
  const seconds = Math.floor(elapsed / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

export const handleJarvisCommands: CommandHandler = async (params, allowTextCommands) => {
  if (!allowTextCommands) {
    return null;
  }

  const parsed = parseJarvisCommand(params.command.commandBodyNormalized);
  if (!parsed) {
    return null;
  }

  if (!params.command.isAuthorizedSender) {
    logVerbose(
      `Ignoring Jarvis command from unauthorized sender: ${params.command.senderId || "<unknown>"}`,
    );
    return { shouldContinue: false };
  }

  const { action } = parsed;
  const daemon = getDaemon();

  if (action === "help") {
    return { shouldContinue: false, reply: jarvisUsage() };
  }

  if (action === "start") {
    if (!daemon) {
      return {
        shouldContinue: false,
        reply: {
          text: "❌ Autonomous daemon is not running. Start it first, then try `/jarvis start`.",
        },
      };
    }
    const jarvis = daemon.getJarvis();
    if (!jarvis) {
      return {
        shouldContinue: false,
        reply: { text: "❌ Jarvis module not initialized in the daemon." },
      };
    }
    if (jarvis.isRunning()) {
      const status = jarvis.getStatus();
      return {
        shouldContinue: false,
        reply: {
          text:
            `🎙️ Jarvis is already running!\n` +
            `State: ${status.state}\n` +
            `Uptime: ${formatUptime(status.upSinceMs)}\n` +
            `Commands processed: ${status.commandsProcessed}`,
        },
      };
    }
    try {
      await jarvis.start();
      return {
        shouldContinue: false,
        reply: { text: '🟢 Jarvis activated! Listening for wake word "Agdi"...' },
      };
    } catch (err) {
      return {
        shouldContinue: false,
        reply: {
          text: `❌ Failed to start Jarvis: ${err instanceof Error ? err.message : String(err)}`,
        },
      };
    }
  }

  if (action === "stop") {
    if (!daemon) {
      return {
        shouldContinue: false,
        reply: { text: "🔴 Jarvis is not running (daemon not active)." },
      };
    }
    const jarvis = daemon.getJarvis();
    if (!jarvis || !jarvis.isRunning()) {
      return {
        shouldContinue: false,
        reply: { text: "🔴 Jarvis is already stopped." },
      };
    }
    await jarvis.stop();
    return {
      shouldContinue: false,
      reply: { text: "🔴 Jarvis deactivated. Mic released." },
    };
  }

  if (action === "status") {
    if (!daemon) {
      return {
        shouldContinue: false,
        reply: {
          text:
            `📊 **Jarvis Status**\n` +
            `State: 🔴 OFF (daemon not running)\n` +
            `Use \`/jarvis start\` to activate.`,
        },
      };
    }
    const jarvis = daemon.getJarvis();
    if (!jarvis) {
      return {
        shouldContinue: false,
        reply: { text: "📊 Jarvis module not initialized." },
      };
    }
    const s = jarvis.getStatus();
    const stateEmoji =
      s.state === "off"
        ? "🔴"
        : s.state === "listening"
          ? "🟢"
          : s.state === "processing"
            ? "🟡"
            : s.state === "speaking"
              ? "🔵"
              : s.state === "error"
                ? "❌"
                : "⚪";

    const lines = [
      `📊 **Jarvis Status**`,
      `State: ${stateEmoji} ${s.state.toUpperCase()}`,
      `Uptime: ${formatUptime(s.upSinceMs)}`,
      `Commands processed: ${s.commandsProcessed}`,
      `Wake triggers: ${s.wakeTriggers.join(", ")}`,
    ];
    if (s.lastCommand) {
      lines.push(`Last command: "${s.lastCommand}"`);
    }
    if (s.lastTranscript) {
      lines.push(`Last transcript: "${s.lastTranscript}"`);
    }
    return { shouldContinue: false, reply: { text: lines.join("\n") } };
  }

  return { shouldContinue: false, reply: jarvisUsage() };
};
