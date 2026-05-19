import { logVerbose } from "../../globals.js";
import { getSpeechProvider, normalizeSpeechProviderId } from "../../tts/provider-registry.js";
import {
  getLastTtsAttempt,
  getTtsMaxLength,
  getTtsProvider,
  isSummarizationEnabled,
  isTtsEnabled,
  isTtsProviderConfigured,
  resolveTtsApiKey,
  resolveTtsConfig,
  resolveTtsPrefsPath,
  setLastTtsAttempt,
  setSummarizationEnabled,
  setTtsEnabled,
  setTtsMaxLength,
  setTtsProvider,
  textToSpeech,
} from "../../tts/tts.js";
import type { ReplyPayload } from "../types.js";
import type { CommandHandler } from "./commands-types.js";

type ParsedTtsCommand = {
  action: string;
  args: string;
};

function parseTtsCommand(normalized: string): ParsedTtsCommand | null {
  // Accept `/tts` and `/tts <action> [args]` as a single control surface.
  if (normalized === "/tts") {
    return { action: "status", args: "" };
  }
  if (!normalized.startsWith("/tts ")) {
    return null;
  }
  const rest = normalized.slice(5).trim();
  if (!rest) {
    return { action: "status", args: "" };
  }
  const [action, ...tail] = rest.split(/\s+/);
  return { action: action.toLowerCase(), args: tail.join(" ").trim() };
}

function ttsUsage(): ReplyPayload {
  // Keep usage in one place so help/validation stays consistent.
  return {
    text:
      `ðŸ”Š **TTS (Text-to-Speech) Help**\n\n` +
      `**Commands:**\n` +
      `â€¢ /tts on â€” Enable automatic TTS for replies\n` +
      `â€¢ /tts off â€” Disable TTS\n` +
      `â€¢ /tts status â€” Show current settings\n` +
      `â€¢ /tts provider [name] â€” View/change provider\n` +
      `â€¢ /tts limit [number] â€” View/change text limit\n` +
      `â€¢ /tts summary [on|off] â€” View/change auto-summary\n` +
      `â€¢ /tts audio <text> â€” Generate audio from text\n\n` +
      `**Providers:**\n` +
      `â€¢ microsoft â€” Microsoft Edge-backed speech (default fallback)\n` +
      `â€¢ openai â€” High quality (requires API key)\n` +
      `â€¢ elevenlabs â€” Premium voices (requires API key)\n\n` +
      `**Text Limit (default: 1500, max: 4096):**\n` +
      `When text exceeds the limit:\n` +
      `â€¢ Summary ON: AI summarizes, then generates audio\n` +
      `â€¢ Summary OFF: Truncates text, then generates audio\n\n` +
      `**Examples:**\n` +
      `/tts provider microsoft\n` +
      `/tts limit 2000\n` +
      `/tts audio Hello, this is a test!`,
  };
}

export const handleTtsCommands: CommandHandler = async (params, allowTextCommands) => {
  if (!allowTextCommands) {
    return null;
  }
  const parsed = parseTtsCommand(params.command.commandBodyNormalized);
  if (!parsed) {
    return null;
  }

  if (!params.command.isAuthorizedSender) {
    logVerbose(
      `Ignoring TTS command from unauthorized sender: ${params.command.senderId || "<unknown>"}`,
    );
    return { shouldContinue: false };
  }

  const config = resolveTtsConfig(params.cfg);
  const prefsPath = resolveTtsPrefsPath(config);
  const action = parsed.action;
  const args = parsed.args;

  if (action === "help") {
    return { shouldContinue: false, reply: ttsUsage() };
  }

  if (action === "on") {
    setTtsEnabled(prefsPath, true);
    return { shouldContinue: false, reply: { text: "ðŸ”Š TTS enabled." } };
  }

  if (action === "off") {
    setTtsEnabled(prefsPath, false);
    return { shouldContinue: false, reply: { text: "ðŸ”‡ TTS disabled." } };
  }

  if (action === "audio") {
    if (!args.trim()) {
      return {
        shouldContinue: false,
        reply: {
          text:
            `ðŸŽ¤ Generate audio from text.\n\n` +
            `Usage: /tts audio <text>\n` +
            `Example: /tts audio Hello, this is a test!`,
        },
      };
    }

    const start = Date.now();
    const result = await textToSpeech({
      text: args,
      cfg: params.cfg,
      channel: params.command.channel,
      prefsPath,
    });

    if (result.success && result.audioPath) {
      // Store last attempt for `/tts status`.
      setLastTtsAttempt({
        timestamp: Date.now(),
        success: true,
        textLength: args.length,
        summarized: false,
        provider: result.provider,
        latencyMs: result.latencyMs,
      });
      const payload: ReplyPayload = {
        mediaUrl: result.audioPath,
        audioAsVoice: result.voiceCompatible === true,
      };
      return { shouldContinue: false, reply: payload };
    }

    // Store failure details for `/tts status`.
    setLastTtsAttempt({
      timestamp: Date.now(),
      success: false,
      textLength: args.length,
      summarized: false,
      error: result.error,
      latencyMs: Date.now() - start,
    });
    return {
      shouldContinue: false,
      reply: { text: `âŒ Error generating audio: ${result.error ?? "unknown error"}` },
    };
  }

  if (action === "provider") {
    const currentProvider = getTtsProvider(config, prefsPath);
    if (!args.trim()) {
      const hasOpenAI = Boolean(resolveTtsApiKey(config, "openai"));
      const hasElevenLabs = Boolean(resolveTtsApiKey(config, "elevenlabs"));
      const hasMicrosoft = isTtsProviderConfigured(config, "microsoft", params.cfg);
      return {
        shouldContinue: false,
        reply: {
          text:
            `ðŸŽ™ï¸ TTS provider\n` +
            `Primary: ${currentProvider}\n` +
            `OpenAI key: ${hasOpenAI ? "âœ…" : "âŒ"}\n` +
            `ElevenLabs key: ${hasElevenLabs ? "âœ…" : "âŒ"}\n` +
            `Microsoft enabled: ${hasMicrosoft ? "âœ…" : "âŒ"}\n` +
            `Usage: /tts provider openai | elevenlabs | microsoft`,
        },
      };
    }

    const requested = args.trim().toLowerCase();
    if (requested !== "edge" && !getSpeechProvider(requested, params.cfg)) {
      return { shouldContinue: false, reply: ttsUsage() };
    }

    const nextProvider = normalizeSpeechProviderId(requested) ?? requested;
    setTtsProvider(prefsPath, requested);
    return {
      shouldContinue: false,
      reply: { text: `âœ… TTS provider set to ${nextProvider}.` },
    };
  }

  if (action === "limit") {
    if (!args.trim()) {
      const currentLimit = getTtsMaxLength(prefsPath);
      return {
        shouldContinue: false,
        reply: {
          text:
            `ðŸ“ TTS limit: ${currentLimit} characters.\n\n` +
            `Text longer than this triggers summary (if enabled).\n` +
            `Range: 100-4096 chars (Telegram max).\n\n` +
            `To change: /tts limit <number>\n` +
            `Example: /tts limit 2000`,
        },
      };
    }
    const next = Number.parseInt(args.trim(), 10);
    if (!Number.isFinite(next) || next < 100 || next > 4096) {
      return {
        shouldContinue: false,
        reply: { text: "âŒ Limit must be between 100 and 4096 characters." },
      };
    }
    setTtsMaxLength(prefsPath, next);
    return {
      shouldContinue: false,
      reply: { text: `âœ… TTS limit set to ${next} characters.` },
    };
  }

  if (action === "summary") {
    if (!args.trim()) {
      const enabled = isSummarizationEnabled(prefsPath);
      const maxLen = getTtsMaxLength(prefsPath);
      return {
        shouldContinue: false,
        reply: {
          text:
            `ðŸ“ TTS auto-summary: ${enabled ? "on" : "off"}.\n\n` +
            `When text exceeds ${maxLen} chars:\n` +
            `â€¢ ON: summarizes text, then generates audio\n` +
            `â€¢ OFF: truncates text, then generates audio\n\n` +
            `To change: /tts summary on | off`,
        },
      };
    }
    const requested = args.trim().toLowerCase();
    if (requested !== "on" && requested !== "off") {
      return { shouldContinue: false, reply: ttsUsage() };
    }
    setSummarizationEnabled(prefsPath, requested === "on");
    return {
      shouldContinue: false,
      reply: {
        text: requested === "on" ? "âœ… TTS auto-summary enabled." : "âŒ TTS auto-summary disabled.",
      },
    };
  }

  if (action === "status") {
    const enabled = isTtsEnabled(config, prefsPath);
    const provider = getTtsProvider(config, prefsPath);
    const hasKey = isTtsProviderConfigured(config, provider, params.cfg);
    const maxLength = getTtsMaxLength(prefsPath);
    const summarize = isSummarizationEnabled(prefsPath);
    const last = getLastTtsAttempt();
    const lines = [
      "ðŸ“Š TTS status",
      `State: ${enabled ? "âœ… enabled" : "âŒ disabled"}`,
      `Provider: ${provider} (${hasKey ? "âœ… configured" : "âŒ not configured"})`,
      `Text limit: ${maxLength} chars`,
      `Auto-summary: ${summarize ? "on" : "off"}`,
    ];
    if (last) {
      const timeAgo = Math.round((Date.now() - last.timestamp) / 1000);
      lines.push("");
      lines.push(`Last attempt (${timeAgo}s ago): ${last.success ? "âœ…" : "âŒ"}`);
      lines.push(`Text: ${last.textLength} chars${last.summarized ? " (summarized)" : ""}`);
      if (last.success) {
        lines.push(`Provider: ${last.provider ?? "unknown"}`);
        lines.push(`Latency: ${last.latencyMs ?? 0}ms`);
      } else if (last.error) {
        lines.push(`Error: ${last.error}`);
      }
    }
    return { shouldContinue: false, reply: { text: lines.join("\n") } };
  }

  return { shouldContinue: false, reply: ttsUsage() };
};
