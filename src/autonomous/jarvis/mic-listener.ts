/**
 * Jarvis Mic Listener — persistent system microphone capture with VAD.
 *
 * Captures audio from the system microphone using `node-record-lpcm16`
 * (cross-platform via SoX/arecord/ffmpeg). Runs voice activity detection
 * (energy-based) to emit speech segments for downstream STT processing.
 *
 * Falls back gracefully when recording binaries are unavailable.
 */

import { EventEmitter } from "node:events";
import { createSubsystemLogger } from "../../logging/subsystem.js";

const log = createSubsystemLogger("jarvis-mic");

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type MicListenerConfig = {
  /** Audio sample rate in Hz. Default 16000 (optimal for Whisper). */
  sampleRate: number;
  /** Number of audio channels. Default 1 (mono). */
  channels: number;
  /** Bits per sample. Default 16. */
  bitsPerSample: number;
  /** RMS energy threshold for voice activity detection (0.0–1.0). Default 0.02. */
  vadThreshold: number;
  /** Silence duration (ms) before a speech segment ends. Default 1500. */
  silenceTimeoutMs: number;
  /** Minimum speech duration (ms) to emit a segment. Default 300. */
  minSpeechMs: number;
  /** Maximum speech segment duration (ms). Default 30000. */
  maxSpeechMs: number;
  /** Mic device name (empty = system default). */
  device: string;
};

export const DEFAULT_MIC_CONFIG: MicListenerConfig = {
  sampleRate: 16_000,
  channels: 1,
  bitsPerSample: 16,
  vadThreshold: 0.02,
  silenceTimeoutMs: 1_500,
  minSpeechMs: 300,
  maxSpeechMs: 30_000,
  device: "",
};

export type SpeechSegment = {
  /** PCM audio data (16-bit signed LE, mono, 16kHz). */
  audio: Buffer;
  /** Duration of the segment in milliseconds. */
  durationMs: number;
  /** Timestamp when speech started. */
  startedAt: number;
  /** Peak RMS energy observed. */
  peakEnergy: number;
};

// ---------------------------------------------------------------------------
// Energy-based VAD
// ---------------------------------------------------------------------------

/** Calculate RMS energy of a 16-bit PCM buffer, normalized to 0.0–1.0. */
export function calculateRmsEnergy(pcm: Buffer): number {
  const samples = pcm.length / 2; // 16-bit = 2 bytes per sample
  if (samples === 0) return 0;

  let sumSquares = 0;
  for (let i = 0; i < pcm.length - 1; i += 2) {
    const sample = pcm.readInt16LE(i);
    sumSquares += sample * sample;
  }
  const rms = Math.sqrt(sumSquares / samples);
  return rms / 32768; // Normalize to 0.0 - 1.0
}

// ---------------------------------------------------------------------------
// Mic Listener
// ---------------------------------------------------------------------------

export interface MicListenerEvents {
  speech: [SpeechSegment];
  listening: [];
  silence: [];
  error: [Error];
  stopped: [];
}

export class MicListener extends EventEmitter {
  private config: MicListenerConfig;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private recording: any = null;
  private running = false;

  // VAD state
  private speechActive = false;
  private speechBuffer: Buffer[] = [];
  private speechStartMs = 0;
  private lastVoiceMs = 0;
  private peakEnergy = 0;
  private silenceTimer: NodeJS.Timeout | null = null;

  constructor(config?: Partial<MicListenerConfig>) {
    super();
    this.config = { ...DEFAULT_MIC_CONFIG, ...config };
  }

  /** Start listening on the system microphone. */
  async start(): Promise<void> {
    if (this.running) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let record: (opts: Record<string, unknown>) => any;
    try {
      // @ts-expect-error — node-record-lpcm16 is an optional peer dependency
      const mod = await import("node-record-lpcm16");
      record = mod.record ?? mod.default?.record;
    } catch {
      const msg =
        'Jarvis mic requires "node-record-lpcm16". Install SoX (sox.sourceforge.net) ' +
        "and run: pnpm add node-record-lpcm16";
      log.error(msg);
      this.emit("error", new Error(msg));
      return;
    }

    this.running = true;
    log.info("Starting mic listener...");

    const recOpts: Record<string, unknown> = {
      sampleRate: this.config.sampleRate,
      channels: this.config.channels,
      audioType: "raw",
      encoding: "signed-integer",
    };
    if (this.config.device) {
      recOpts.device = this.config.device;
    }

    try {
      this.recording = record(recOpts);
      const stream = this.recording.stream();

      stream.on("data", (chunk: Buffer) => {
        this.processChunk(chunk);
      });

      stream.on("error", (err: Error) => {
        log.error(`Mic stream error: ${err.message}`);
        this.emit("error", err);
      });

      stream.on("end", () => {
        if (this.running) {
          log.info("Mic stream ended unexpectedly");
          this.stop();
        }
      });

      this.emit("listening");
      log.info(`Mic listener active (rate=${this.config.sampleRate}, vad=${this.config.vadThreshold})`);
    } catch (err) {
      this.running = false;
      const error = err instanceof Error ? err : new Error(String(err));
      log.error(`Failed to start mic: ${error.message}`);
      this.emit("error", error);
    }
  }

  /** Stop listening. */
  stop(): void {
    if (!this.running) return;
    this.running = false;

    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }

    if (this.recording) {
      try {
        this.recording.stop();
      } catch {
        // Ignore stop errors
      }
      this.recording = null;
    }

    // Flush any in-progress speech
    if (this.speechActive && this.speechBuffer.length > 0) {
      this.emitSpeechSegment();
    }

    this.resetVadState();
    this.emit("stopped");
    log.info("Mic listener stopped");
  }

  /** Whether the listener is currently active. */
  isListening(): boolean {
    return this.running;
  }

  /** Whether speech is currently being detected. */
  isSpeechActive(): boolean {
    return this.speechActive;
  }

  /** Update configuration. Requires restart to take effect on mic params. */
  setConfig(updates: Partial<MicListenerConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  // -------------------------------------------------------------------------
  // Private
  // -------------------------------------------------------------------------

  private processChunk(chunk: Buffer): void {
    const energy = calculateRmsEnergy(chunk);
    const now = Date.now();

    if (energy >= this.config.vadThreshold) {
      // Voice detected
      if (!this.speechActive) {
        this.speechActive = true;
        this.speechStartMs = now;
        this.peakEnergy = 0;
        this.speechBuffer = [];
        log.info(`Speech started (energy=${energy.toFixed(4)})`);
      }

      this.lastVoiceMs = now;
      this.peakEnergy = Math.max(this.peakEnergy, energy);

      // Clear any pending silence timeout
      if (this.silenceTimer) {
        clearTimeout(this.silenceTimer);
        this.silenceTimer = null;
      }
    }

    if (this.speechActive) {
      this.speechBuffer.push(Buffer.from(chunk));

      // Check max duration
      const elapsed = now - this.speechStartMs;
      if (elapsed >= this.config.maxSpeechMs) {
        log.info(`Max speech duration reached (${elapsed}ms)`);
        this.emitSpeechSegment();
        return;
      }

      // Set silence timeout if voice went quiet
      if (energy < this.config.vadThreshold && !this.silenceTimer) {
        this.silenceTimer = setTimeout(() => {
          this.silenceTimer = null;
          if (this.speechActive) {
            this.emitSpeechSegment();
          }
        }, this.config.silenceTimeoutMs);
      }
    }
  }

  private emitSpeechSegment(): void {
    const audio = Buffer.concat(this.speechBuffer);
    const durationMs = Date.now() - this.speechStartMs;

    this.resetVadState();

    if (durationMs < this.config.minSpeechMs) {
      log.info(`Speech too short (${durationMs}ms), discarding`);
      this.emit("silence");
      return;
    }

    const segment: SpeechSegment = {
      audio,
      durationMs,
      startedAt: this.speechStartMs,
      peakEnergy: this.peakEnergy,
    };

    log.info(`Speech segment: ${durationMs}ms, ${audio.length} bytes, peak=${this.peakEnergy.toFixed(4)}`);
    this.emit("speech", segment);
    this.emit("silence");
  }

  private resetVadState(): void {
    this.speechActive = false;
    this.speechBuffer = [];
    this.speechStartMs = 0;
    this.lastVoiceMs = 0;
    this.peakEnergy = 0;
  }
}
