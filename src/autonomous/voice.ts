/**
 * Voice Mode — speak to control the agent.
 *
 * Architecture:
 * - Dashboard: Web Speech API for microphone → streams audio to server
 * - Server: Receives transcript → routes to NL Commander
 * - TTS: Generates voice response via Web Speech API (client-side)
 *
 * This module handles the server-side coordination.
 * The client-side (mic + speaker) lives in the dashboard HTML.
 */

import type { DesktopLiveStream } from "./live-stream.js";
import type { NLCommander } from "./nl-commander.js";
import { createSubsystemLogger } from "../logging/subsystem.js";

const log = createSubsystemLogger("voice");

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type VoiceCommand = {
  id: string;
  transcript: string;
  confidence: number;
  timestamp: number;
  processed: boolean;
  result?: string;
};

export type VoiceConfig = {
  enabled: boolean;
  language: string; // BCP-47 language tag (e.g. "en-US")
  activationWord?: string; // Wake word (e.g. "hey agent")
  autoListen: boolean; // Keep listening after command
  ttsEnabled: boolean; // Speak responses back
  ttsVoice?: string; // Preferred TTS voice name
  ttsRate: number; // Speech rate (0.5 - 2.0)
};

const DEFAULT_CONFIG: VoiceConfig = {
  enabled: true,
  language: "en-US",
  activationWord: undefined,
  autoListen: true,
  ttsEnabled: true,
  ttsRate: 1.0,
};

// ---------------------------------------------------------------------------
// Voice Controller
// ---------------------------------------------------------------------------

export class VoiceController {
  private config: VoiceConfig;
  private commander: NLCommander | null = null;
  private stream: DesktopLiveStream | null = null;
  private history: VoiceCommand[] = [];
  private broadcasting: ((msg: Record<string, unknown>) => void) | null = null;

  constructor(config?: Partial<VoiceConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /** Wire up dependencies. */
  init(commander: NLCommander, stream?: DesktopLiveStream): void {
    this.commander = commander;
    this.stream = stream ?? null;
  }

  /** Set the WebSocket broadcast function for sending TTS messages. */
  setBroadcast(fn: (msg: Record<string, unknown>) => void): void {
    this.broadcasting = fn;
  }

  /**
   * Handle a voice transcript from the client.
   * Called when the dashboard sends a speech recognition result.
   */
  async handleTranscript(transcript: string, confidence: number = 1.0): Promise<VoiceCommand> {
    const id = `voice-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const cmd: VoiceCommand = {
      id,
      transcript,
      confidence,
      timestamp: Date.now(),
      processed: false,
    };

    log.info(`voice: "${transcript}" (confidence: ${(confidence * 100).toFixed(0)}%)`);

    // Check for wake word if configured
    if (this.config.activationWord) {
      const lower = transcript.toLowerCase();
      if (!lower.startsWith(this.config.activationWord.toLowerCase())) {
        log.info("ignoring — no wake word");
        cmd.result = "Waiting for wake word";
        cmd.processed = true;
        this.history.push(cmd);
        return cmd;
      }
      // Strip wake word from command
      transcript = transcript.slice(this.config.activationWord.length).trim();
    }

    // Execute via NL Commander
    if (this.commander) {
      this.stream?.sendOverlay({
        thinking: `Heard: "${transcript}"`,
        action: "Processing voice command...",
        confidence,
        state: "planning",
      });

      const result = await this.commander.execute(transcript);
      cmd.processed = true;
      cmd.result = result.success
        ? `Done: ${result.actions.length} actions completed in ${result.durationMs}ms`
        : `Failed: ${result.error}`;

      // Send TTS response to client
      if (this.config.ttsEnabled && this.broadcasting) {
        const reply = result.success
          ? this.generateSuccessReply(transcript, result.actions.length)
          : `Sorry, I couldn't do that. ${result.error}`;

        this.broadcasting({
          type: "tts_speak",
          text: reply,
          rate: this.config.ttsRate,
        });
      }
    } else {
      cmd.processed = true;
      cmd.result = "Commander not initialized";
    }

    this.history.push(cmd);
    return cmd;
  }

  /** Get voice command history. */
  getHistory(): VoiceCommand[] {
    return this.history;
  }

  /** Get current config (for dashboard display). */
  getConfig(): VoiceConfig {
    return { ...this.config };
  }

  /** Update config. */
  setConfig(updates: Partial<VoiceConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  // -------------------------------------------------------------------------
  // Private
  // -------------------------------------------------------------------------

  private generateSuccessReply(command: string, actionCount: number): string {
    const replies = [
      `Done! I completed ${actionCount} action${actionCount === 1 ? "" : "s"}.`,
      `All done. "${command}" has been executed.`,
      `Got it — ${actionCount} step${actionCount === 1 ? "" : "s"} completed.`,
      `Finished! That took ${actionCount} action${actionCount === 1 ? "" : "s"}.`,
    ];
    return replies[Math.floor(Math.random() * replies.length)]!;
  }
}
