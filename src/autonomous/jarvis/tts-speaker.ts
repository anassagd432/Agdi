/**
 * Jarvis TTS Speaker — text-to-speech output.
 *
 * Supports multiple backends:
 * - **system**: Native OS TTS (say on macOS, espeak/piper on Linux, PowerShell on Windows)
 * - **browser**: WebSocket broadcast to dashboard for Web Speech API TTS
 * - **off**: No TTS output
 */

import { exec } from "node:child_process";
import os from "node:os";
import { createSubsystemLogger } from "../../logging/subsystem.js";

const log = createSubsystemLogger("jarvis-tts");

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TtsEngine = "system" | "browser" | "off";

export type TtsConfig = {
  /** TTS backend. Default: "system". */
  engine: TtsEngine;
  /** Speech rate (0.5 – 2.0). Default: 1.0. */
  rate: number;
  /** Speech volume (0.0 – 1.0). Default: 0.8. */
  volume: number;
  /** Preferred voice name (system-specific). */
  voice: string;
};

export const DEFAULT_TTS_CONFIG: TtsConfig = {
  engine: "system",
  rate: 1.0,
  volume: 0.8,
  voice: "",
};

// ---------------------------------------------------------------------------
// TTS Speaker
// ---------------------------------------------------------------------------

export class TtsSpeaker {
  private config: TtsConfig;
  private broadcastFn: ((msg: Record<string, unknown>) => void) | null = null;
  private speaking = false;
  private queue: string[] = [];

  constructor(config?: Partial<TtsConfig>) {
    this.config = { ...DEFAULT_TTS_CONFIG, ...config };
  }

  /** Set the WebSocket broadcast function for browser-based TTS. */
  setBroadcast(fn: (msg: Record<string, unknown>) => void): void {
    this.broadcastFn = fn;
  }

  /** Speak text aloud. If already speaking, queues the message. */
  async speak(text: string): Promise<void> {
    if (this.config.engine === "off") return;
    if (!text.trim()) return;

    if (this.speaking) {
      this.queue.push(text);
      return;
    }

    this.speaking = true;

    try {
      switch (this.config.engine) {
        case "system":
          await this.speakSystem(text);
          break;
        case "browser":
          this.speakBrowser(text);
          break;
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      log.error(`TTS error: ${error.message}`);
    } finally {
      this.speaking = false;
      // Process queue
      const next = this.queue.shift();
      if (next) {
        void this.speak(next);
      }
    }
  }

  /** Whether TTS is currently speaking. */
  isSpeaking(): boolean {
    return this.speaking;
  }

  /** Update config. */
  setConfig(updates: Partial<TtsConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  getConfig(): TtsConfig {
    return { ...this.config };
  }

  /** Clear the speech queue. */
  clearQueue(): void {
    this.queue = [];
  }

  // -------------------------------------------------------------------------
  // System TTS
  // -------------------------------------------------------------------------

  private speakSystem(text: string): Promise<void> {
    const platform = os.platform();
    const escaped = text.replace(/"/g, '\\"').replace(/'/g, "'\\''");
    let command: string;

    switch (platform) {
      case "darwin": {
        // macOS — `say` command
        const voiceArg = this.config.voice ? `-v "${this.config.voice}"` : "";
        const rateArg = `-r ${Math.round(this.config.rate * 175)}`; // ~175 wpm default
        command = `say ${voiceArg} ${rateArg} "${escaped}"`;
        break;
      }
      case "win32": {
        // Windows — PowerShell SAPI
        const rate = Math.round((this.config.rate - 1) * 10); // -10 to +10 scale
        const vol = Math.round(this.config.volume * 100);
        command = `powershell -NoProfile -Command "` +
          `$s = New-Object -ComObject SAPI.SpVoice; ` +
          `$s.Rate = ${rate}; ` +
          `$s.Volume = ${vol}; ` +
          `$s.Speak('${escaped.replace(/'/g, "''")}');"`;
        break;
      }
      default: {
        // Linux — espeak or piper
        const speed = Math.round(this.config.rate * 175);
        const amplitude = Math.round(this.config.volume * 200);
        command = `espeak -s ${speed} -a ${amplitude} "${escaped}" 2>/dev/null || ` +
          `piper --output-raw <<< "${escaped}" | aplay -r 22050 -f S16_LE -t raw 2>/dev/null || ` +
          `echo "No TTS engine (espeak/piper) found"`;
        break;
      }
    }

    log.info(`TTS [${platform}]: "${text.slice(0, 50)}..."`);

    return new Promise<void>((resolve, reject) => {
      exec(command, { timeout: 30_000 }, (error) => {
        if (error) {
          reject(new Error(`TTS command failed: ${error.message}`));
        } else {
          resolve();
        }
      });
    });
  }

  // -------------------------------------------------------------------------
  // Browser TTS (via WebSocket)
  // -------------------------------------------------------------------------

  private speakBrowser(text: string): void {
    if (!this.broadcastFn) {
      log.warn("Browser TTS: no broadcast function set");
      return;
    }

    this.broadcastFn({
      type: "tts_speak",
      text,
      rate: this.config.rate,
      volume: this.config.volume,
      voice: this.config.voice || undefined,
    });

    log.info(`TTS [browser]: "${text.slice(0, 50)}..."`);
  }
}
