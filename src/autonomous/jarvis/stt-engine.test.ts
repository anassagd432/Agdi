import { describe, it, expect } from "vitest";
import type { SttConfig } from "./stt-engine.js";
import { SttProcessor, DEFAULT_STT_CONFIG } from "./stt-engine.js";

describe("SttProcessor", () => {
  describe("constructor", () => {
    it("uses default config when no overrides provided", () => {
      const stt = new SttProcessor();
      const cfg = stt.getConfig();
      expect(cfg.engine).toBe("whisper-api");
      expect(cfg.whisperModel).toBe("base");
      expect(cfg.language).toBe("en");
      expect(cfg.sampleRate).toBe(16_000);
    });

    it("merges partial config with defaults", () => {
      const stt = new SttProcessor({ engine: "mock", language: "fr" });
      const cfg = stt.getConfig();
      expect(cfg.engine).toBe("mock");
      expect(cfg.language).toBe("fr");
      expect(cfg.whisperModel).toBe("base"); // unchanged default
    });
  });

  describe("setConfig", () => {
    it("updates config partially", () => {
      const stt = new SttProcessor();
      stt.setConfig({ engine: "mock" });
      expect(stt.getConfig().engine).toBe("mock");
      expect(stt.getConfig().language).toBe("en"); // unchanged
    });
  });

  describe("transcribe (mock engine)", () => {
    it("returns empty transcript with mock engine", async () => {
      const stt = new SttProcessor({ engine: "mock" });
      const result = await stt.transcribe(Buffer.alloc(1600));
      expect(result.text).toBe("");
      expect(result.confidence).toBe(0);
      expect(result.engine).toBe("mock");
      expect(result.processingMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe("transcribe (unknown engine)", () => {
    it("throws for unknown engine", async () => {
      const stt = new SttProcessor({ engine: "nonexistent" as SttConfig["engine"] });
      await expect(stt.transcribe(Buffer.alloc(100))).rejects.toThrow("Unknown STT engine");
    });
  });

  describe("DEFAULT_STT_CONFIG", () => {
    it("has expected shape", () => {
      expect(DEFAULT_STT_CONFIG).toEqual({
        engine: "whisper-api",
        whisperModel: "base",
        apiKey: "",
        language: "en",
        sampleRate: 16_000,
      });
    });
  });
});
