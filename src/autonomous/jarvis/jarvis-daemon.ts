/**
 * Jarvis Daemon — always-on voice assistant orchestrator.
 *
 * Flow:
 * 1. MicListener captures audio continuously
 * 2. On speech detection → SttProcessor transcribes audio
 * 3. Check transcript for wake word ("Agdi") via voicewake triggers
 * 4. If wake word found → strip it and route to VoiceController
 * 5. VoiceController executes via NLCommander and sends TTS response
 *
 * Integrates with the existing autonomous daemon infrastructure.
 */

import type { VoiceController } from "../voice.js";
import { loadVoiceWakeConfig } from "../../infra/voicewake.js";
import { createSubsystemLogger } from "../../logging/subsystem.js";
import {
  MicListener,
  type MicListenerConfig,
  type SpeechSegment,
  DEFAULT_MIC_CONFIG,
} from "./mic-listener.js";
import { SttProcessor, type SttConfig, DEFAULT_STT_CONFIG } from "./stt-engine.js";
import { TtsSpeaker, type TtsConfig, DEFAULT_TTS_CONFIG } from "./tts-speaker.js";

const log = createSubsystemLogger("jarvis");

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type JarvisState = "off" | "idle" | "listening" | "processing" | "speaking" | "error";

export type JarvisConfig = {
  /** Enable Jarvis mode. Default: false. */
  enabled: boolean;
  /** Mic configuration. */
  mic: Partial<MicListenerConfig>;
  /** STT configuration. */
  stt: Partial<SttConfig>;
  /** TTS configuration. */
  tts: Partial<TtsConfig>;
  /** Cooldown (ms) between commands to prevent feedback loops. Default: 2000. */
  commandCooldownMs: number;
  /** Minimum confidence for a transcript to be processed. Default: 0.3. */
  minTranscriptConfidence: number;
  /** Greeting spoken when Jarvis activates. */
  greeting: string;
};

export const DEFAULT_JARVIS_CONFIG: JarvisConfig = {
  enabled: false,
  mic: {},
  stt: {},
  tts: {},
  commandCooldownMs: 2_000,
  minTranscriptConfidence: 0.3,
  greeting: "Jarvis mode activated. Listening for your commands.",
};

export type JarvisStatus = {
  state: JarvisState;
  lastTranscript: string;
  lastCommand: string;
  commandsProcessed: number;
  upSinceMs: number | null;
  wakeTriggers: string[];
};

// ---------------------------------------------------------------------------
// Jarvis Daemon
// ---------------------------------------------------------------------------

export class JarvisDaemon {
  private config: JarvisConfig;
  private state: JarvisState = "off";

  // Subsystems
  private mic: MicListener;
  private stt: SttProcessor;
  private tts: TtsSpeaker;
  private voiceController: VoiceController | null = null;

  // State tracking
  private wakeTriggers: string[] = ["agdi"];
  private lastCommandMs = 0;
  private lastTranscript = "";
  private lastCommand = "";
  private commandsProcessed = 0;
  private startedAtMs: number | null = null;
  private processing = false;

  constructor(config?: Partial<JarvisConfig>) {
    this.config = { ...DEFAULT_JARVIS_CONFIG, ...config };
    this.mic = new MicListener({ ...DEFAULT_MIC_CONFIG, ...this.config.mic });
    this.stt = new SttProcessor({ ...DEFAULT_STT_CONFIG, ...this.config.stt });
    this.tts = new TtsSpeaker({ ...DEFAULT_TTS_CONFIG, ...this.config.tts });
  }

  /** Wire the voice controller (from AutonomousDaemon). */
  setVoiceController(vc: VoiceController): void {
    this.voiceController = vc;
  }

  /** Set the WebSocket broadcast function (for browser-based TTS). */
  setBroadcast(fn: (msg: Record<string, unknown>) => void): void {
    this.tts.setBroadcast(fn);
  }

  // -------------------------------------------------------------------------
  // Lifecycle
  // -------------------------------------------------------------------------

  /** Start Jarvis — begin always-on listening. */
  async start(): Promise<void> {
    if (this.state !== "off" && this.state !== "error") {
      log.warn(`Jarvis already in state: ${this.state}`);
      return;
    }

    log.info("🎙️ Starting Jarvis mode...");
    this.state = "idle";
    this.startedAtMs = Date.now();

    // Load wake triggers
    try {
      const wakeCfg = await loadVoiceWakeConfig();
      this.wakeTriggers = wakeCfg.triggers;
      log.info(`Wake triggers: ${this.wakeTriggers.join(", ")}`);
    } catch (err) {
      log.warn(`Failed to load wake triggers, using defaults: ${err}`);
    }

    // Set up mic event handlers
    this.mic.on("speech", (segment: SpeechSegment) => {
      void this.handleSpeech(segment);
    });

    this.mic.on("error", (err: Error) => {
      log.error(`Mic error: ${err.message}`);
      this.state = "error";
    });

    this.mic.on("listening", () => {
      this.state = "listening";
    });

    this.mic.on("silence", () => {
      if (!this.processing) {
        this.state = "listening";
      }
    });

    // Start listening
    await this.mic.start();

    // Speak greeting
    if (this.config.greeting) {
      await this.tts.speak(this.config.greeting);
    }

    log.info("🟢 Jarvis is live and listening");
  }

  /** Stop Jarvis. */
  async stop(): Promise<void> {
    if (this.state === "off") return;

    log.info("Stopping Jarvis...");
    this.mic.stop();
    this.mic.removeAllListeners();
    this.tts.clearQueue();

    this.state = "off";
    this.startedAtMs = null;
    log.info("🔴 Jarvis stopped");
  }

  /** Get current status. */
  getStatus(): JarvisStatus {
    return {
      state: this.state,
      lastTranscript: this.lastTranscript,
      lastCommand: this.lastCommand,
      commandsProcessed: this.commandsProcessed,
      upSinceMs: this.startedAtMs,
      wakeTriggers: [...this.wakeTriggers],
    };
  }

  /** Whether Jarvis is running. */
  isRunning(): boolean {
    return this.state !== "off" && this.state !== "error";
  }

  /** Get current config. */
  getConfig(): JarvisConfig {
    return { ...this.config };
  }

  /** Update config (partial). */
  setConfig(updates: Partial<JarvisConfig>): void {
    this.config = { ...this.config, ...updates };
    if (updates.mic) this.mic.setConfig(updates.mic);
    if (updates.stt) this.stt.setConfig(updates.stt);
    if (updates.tts) this.tts.setConfig(updates.tts);
  }

  // -------------------------------------------------------------------------
  // Core Processing Pipeline
  // -------------------------------------------------------------------------

  private async handleSpeech(segment: SpeechSegment): Promise<void> {
    // Cooldown check — avoid feedback from TTS being picked up by mic
    const now = Date.now();
    if (now - this.lastCommandMs < this.config.commandCooldownMs) {
      log.info("Cooldown active, skipping speech segment");
      return;
    }

    // Don't process if already processing
    if (this.processing) {
      log.info("Already processing a command, skipping");
      return;
    }

    // Don't process if TTS is speaking (would pick up its own voice)
    if (this.tts.isSpeaking()) {
      log.info("TTS is speaking, skipping to avoid feedback");
      return;
    }

    this.processing = true;
    this.state = "processing";

    try {
      // Step 1: Transcribe
      log.info(`Transcribing ${segment.durationMs}ms of speech...`);
      const result = await this.stt.transcribe(segment.audio);

      if (!result.text || result.confidence < this.config.minTranscriptConfidence) {
        log.info(`Low confidence transcript: "${result.text}" (${result.confidence})`);
        return;
      }

      this.lastTranscript = result.text;
      log.info(`Transcript: "${result.text}" (confidence: ${result.confidence})`);

      // Step 2: Check for wake word
      const command = this.extractCommand(result.text);
      if (!command) {
        log.info("No wake word detected, discarding");
        return;
      }

      log.info(`🎯 Wake word detected! Command: "${command}"`);
      this.lastCommand = command;
      this.commandsProcessed++;
      this.lastCommandMs = Date.now();

      // Step 3: Route to VoiceController
      if (this.voiceController) {
        this.state = "speaking";
        await this.voiceController.handleTranscript(command, result.confidence);
      } else {
        // No voice controller — speak the command back as confirmation
        log.warn("No VoiceController wired, using standalone TTS response");
        await this.tts.speak(`I heard: ${command}. But the command processor is not connected.`);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      log.error(`Command processing error: ${error.message}`);
      await this.tts
        .speak("Sorry, I encountered an error processing that command.")
        .catch(() => {});
    } finally {
      this.processing = false;
      if (this.mic.isListening()) {
        this.state = "listening";
      }
    }
  }

  /**
   * Extract command from transcript by checking for wake word.
   * Returns the command text (after the wake word) or null if no wake word found.
   */
  private extractCommand(transcript: string): string | null {
    const lower = transcript.toLowerCase().trim();

    for (const trigger of this.wakeTriggers) {
      const triggerLower = trigger.toLowerCase();

      // Check various patterns:
      // "agdi do something"
      // "hey agdi do something"
      // "ok agdi do something"

      const prefixes = ["", "hey ", "ok ", "okay ", "yo "];
      for (const prefix of prefixes) {
        const pattern = `${prefix}${triggerLower}`;
        if (lower.startsWith(pattern)) {
          const rest = transcript.slice(pattern.length).trim();
          // Remove common filler after wake word
          const cleaned = rest
            .replace(/^[,.\s!]+/, "")
            .replace(/^(can you|could you|please|would you)\s+/i, "")
            .trim();
          return cleaned || null;
        }
      }
    }

    return null;
  }
}
