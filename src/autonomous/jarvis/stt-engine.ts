/**
 * Jarvis STT Engine — speech-to-text abstraction.
 *
 * Supports multiple backends:
 * - **whisper-local**: Local Whisper.cpp inference via whisper-node (offline)
 * - **whisper-api**: OpenAI Whisper API (online, higher accuracy)
 * - **mock**: Returns empty transcript (for testing)
 *
 * Accepts raw PCM audio and returns a transcript with confidence score.
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createSubsystemLogger } from "../../logging/subsystem.js";

const log = createSubsystemLogger("jarvis-stt");

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SttEngine = "whisper-local" | "whisper-api" | "mock";
export type WhisperModelSize = "tiny" | "base" | "small" | "medium";

export type SttConfig = {
  /** STT backend to use. Default: "whisper-api". */
  engine: SttEngine;
  /** Whisper model size for local mode. Default: "base". */
  whisperModel: WhisperModelSize;
  /** OpenAI API key for whisper-api mode. Read from OPENAI_API_KEY if empty. */
  apiKey: string;
  /** Language hint for transcription (BCP-47). Default: "en". */
  language: string;
  /** Sample rate of input audio (Hz). Default: 16000. */
  sampleRate: number;
};

export const DEFAULT_STT_CONFIG: SttConfig = {
  engine: "whisper-api",
  whisperModel: "base",
  apiKey: "",
  language: "en",
  sampleRate: 16_000,
};

export type TranscriptResult = {
  /** Transcribed text. */
  text: string;
  /** Confidence score (0.0 – 1.0). */
  confidence: number;
  /** Engine that produced the result. */
  engine: SttEngine;
  /** Processing time in milliseconds. */
  processingMs: number;
};

// ---------------------------------------------------------------------------
// STT Engine
// ---------------------------------------------------------------------------

export class SttProcessor {
  private config: SttConfig;

  constructor(config?: Partial<SttConfig>) {
    this.config = { ...DEFAULT_STT_CONFIG, ...config };
  }

  /**
   * Transcribe raw PCM audio (16-bit signed LE, mono, 16kHz).
   *
   * @param pcmAudio - Raw PCM buffer
   * @returns Transcript result
   */
  async transcribe(pcmAudio: Buffer): Promise<TranscriptResult> {
    const startMs = Date.now();

    switch (this.config.engine) {
      case "whisper-local":
        return this.transcribeLocal(pcmAudio, startMs);
      case "whisper-api":
        return this.transcribeApi(pcmAudio, startMs);
      case "mock":
        return {
          text: "",
          confidence: 0,
          engine: "mock",
          processingMs: Date.now() - startMs,
        };
      default:
        throw new Error(`Unknown STT engine: ${this.config.engine}`);
    }
  }

  /** Update configuration. */
  setConfig(updates: Partial<SttConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  getConfig(): SttConfig {
    return { ...this.config };
  }

  // -------------------------------------------------------------------------
  // Whisper Local (via whisper-node)
  // -------------------------------------------------------------------------

  private async transcribeLocal(pcmAudio: Buffer, startMs: number): Promise<TranscriptResult> {
    let whisper: (
      filePath: string,
      opts?: Record<string, unknown>,
    ) => Promise<Array<{ speech: string }>>;
    try {
      // @ts-expect-error — whisper-node is an optional peer dependency
      const mod = await import("whisper-node");
      whisper = mod.default ?? mod.whisper;
    } catch {
      throw new Error(
        "whisper-node not installed. Run: pnpm add whisper-node " +
          "and download a model: npx whisper-node download base",
      );
    }

    // whisper-node requires a WAV file — write PCM to temp WAV
    const wavPath = path.join(os.tmpdir(), `jarvis-${Date.now()}.wav`);
    try {
      const wavBuffer = pcmToWav(pcmAudio, this.config.sampleRate);
      fs.writeFileSync(wavPath, wavBuffer);

      const result = await whisper(wavPath, {
        modelName: this.config.whisperModel,
        language: this.config.language,
      });

      const text = (result ?? [])
        .map((r) => r.speech?.trim())
        .filter(Boolean)
        .join(" ");

      return {
        text,
        confidence: text.length > 0 ? 0.85 : 0,
        engine: "whisper-local",
        processingMs: Date.now() - startMs,
      };
    } finally {
      try {
        fs.unlinkSync(wavPath);
      } catch {
        // Ignore cleanup errors
      }
    }
  }

  // -------------------------------------------------------------------------
  // Whisper API (OpenAI)
  // -------------------------------------------------------------------------

  private async transcribeApi(pcmAudio: Buffer, startMs: number): Promise<TranscriptResult> {
    const apiKey = this.config.apiKey || process.env.OPENAI_API_KEY || "";
    if (!apiKey) {
      throw new Error(
        "OpenAI API key required for whisper-api. Set OPENAI_API_KEY or configure jarvis.stt.apiKey",
      );
    }

    // Convert PCM to WAV for the API
    const wavBuffer = pcmToWav(pcmAudio, this.config.sampleRate);

    // Use FormData with the WAV as a file
    const boundary = `----JarvisBoundary${Date.now()}`;
    const fileName = "speech.wav";

    const preamble = [
      `--${boundary}`,
      `Content-Disposition: form-data; name="file"; filename="${fileName}"`,
      "Content-Type: audio/wav",
      "",
      "",
    ].join("\r\n");

    const modelField = [
      "",
      `--${boundary}`,
      'Content-Disposition: form-data; name="model"',
      "",
      "whisper-1",
    ].join("\r\n");

    const langField = [
      "",
      `--${boundary}`,
      'Content-Disposition: form-data; name="language"',
      "",
      this.config.language,
    ].join("\r\n");

    const epilogue = `\r\n--${boundary}--\r\n`;

    const body = Buffer.concat([
      Buffer.from(preamble),
      wavBuffer,
      Buffer.from(modelField),
      Buffer.from(langField),
      Buffer.from(epilogue),
    ]);

    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": `multipart/form-data; boundary=${boundary}`,
      },
      body,
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Whisper API error (${response.status}): ${errText}`);
    }

    const data = (await response.json()) as { text?: string };
    const text = (data.text ?? "").trim();

    log.info(`Whisper API: "${text}" (${Date.now() - startMs}ms)`);

    return {
      text,
      confidence: text.length > 0 ? 0.92 : 0,
      engine: "whisper-api",
      processingMs: Date.now() - startMs,
    };
  }
}

// ---------------------------------------------------------------------------
// PCM → WAV conversion
// ---------------------------------------------------------------------------

/** Wrap raw PCM (16-bit signed LE, mono) into a WAV container. */
function pcmToWav(pcm: Buffer, sampleRate: number): Buffer {
  const channels = 1;
  const bitsPerSample = 16;
  const byteRate = sampleRate * channels * (bitsPerSample / 8);
  const blockAlign = channels * (bitsPerSample / 8);
  const dataSize = pcm.length;
  const headerSize = 44;

  const wav = Buffer.alloc(headerSize + dataSize);

  // RIFF header
  wav.write("RIFF", 0);
  wav.writeUInt32LE(36 + dataSize, 4);
  wav.write("WAVE", 8);

  // fmt subchunk
  wav.write("fmt ", 12);
  wav.writeUInt32LE(16, 16); // Subchunk1Size (PCM)
  wav.writeUInt16LE(1, 20); // AudioFormat (PCM)
  wav.writeUInt16LE(channels, 22);
  wav.writeUInt32LE(sampleRate, 24);
  wav.writeUInt32LE(byteRate, 28);
  wav.writeUInt16LE(blockAlign, 32);
  wav.writeUInt16LE(bitsPerSample, 34);

  // data subchunk
  wav.write("data", 36);
  wav.writeUInt32LE(dataSize, 40);
  pcm.copy(wav, 44);

  return wav;
}
