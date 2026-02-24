import { describe, it, expect, beforeEach } from "vitest";
import {
  JarvisDaemon,
  DEFAULT_JARVIS_CONFIG,
  type JarvisConfig,
} from "./jarvis-daemon.js";

// We test the public API + the extractCommand logic via status inspection.
// MicListener/SttProcessor/TtsSpeaker are mocked at construction level via default configs.

describe("JarvisDaemon", () => {
  describe("constructor", () => {
    it("creates with default config", () => {
      const daemon = new JarvisDaemon();
      const status = daemon.getStatus();
      expect(status.state).toBe("off");
      expect(status.commandsProcessed).toBe(0);
      expect(status.upSinceMs).toBeNull();
      expect(status.wakeTriggers).toEqual(["agdi"]);
    });

    it("merges partial config", () => {
      const daemon = new JarvisDaemon({ commandCooldownMs: 5000 });
      const cfg = daemon.getConfig();
      expect(cfg.commandCooldownMs).toBe(5000);
      expect(cfg.enabled).toBe(false); // default preserved
    });
  });

  describe("getStatus", () => {
    it("returns a status snapshot", () => {
      const daemon = new JarvisDaemon();
      const status = daemon.getStatus();
      expect(status).toEqual({
        state: "off",
        lastTranscript: "",
        lastCommand: "",
        commandsProcessed: 0,
        upSinceMs: null,
        wakeTriggers: ["agdi"],
      });
    });

    it("status is a copy (not reference)", () => {
      const daemon = new JarvisDaemon();
      const s1 = daemon.getStatus();
      const s2 = daemon.getStatus();
      expect(s1).toEqual(s2);
      expect(s1).not.toBe(s2);
      expect(s1.wakeTriggers).not.toBe(s2.wakeTriggers);
    });
  });

  describe("isRunning", () => {
    it("returns false when off", () => {
      const daemon = new JarvisDaemon();
      expect(daemon.isRunning()).toBe(false);
    });
  });

  describe("getConfig / setConfig", () => {
    it("returns a copy of config", () => {
      const daemon = new JarvisDaemon();
      const c1 = daemon.getConfig();
      const c2 = daemon.getConfig();
      expect(c1).toEqual(c2);
      expect(c1).not.toBe(c2);
    });

    it("setConfig updates partial values", () => {
      const daemon = new JarvisDaemon();
      daemon.setConfig({ greeting: "Hello!" });
      expect(daemon.getConfig().greeting).toBe("Hello!");
      expect(daemon.getConfig().commandCooldownMs).toBe(2000); // default preserved
    });

    it("setConfig merges nested stt config", () => {
      const daemon = new JarvisDaemon();
      daemon.setConfig({ stt: { engine: "mock" } });
      // The JarvisDaemon forwards stt updates to the SttProcessor
      // We verify it doesn't throw
      expect(daemon.getConfig().stt).toEqual({ engine: "mock" });
    });
  });

  describe("stop", () => {
    it("is a no-op when already off", async () => {
      const daemon = new JarvisDaemon();
      // should not throw
      await daemon.stop();
      expect(daemon.getStatus().state).toBe("off");
    });
  });

  describe("DEFAULT_JARVIS_CONFIG", () => {
    it("has expected defaults", () => {
      expect(DEFAULT_JARVIS_CONFIG.enabled).toBe(false);
      expect(DEFAULT_JARVIS_CONFIG.commandCooldownMs).toBe(2000);
      expect(DEFAULT_JARVIS_CONFIG.minTranscriptConfidence).toBe(0.3);
      expect(DEFAULT_JARVIS_CONFIG.greeting).toBe(
        "Jarvis mode activated. Listening for your commands.",
      );
    });
  });

  describe("extractCommand (via integration)", () => {
    // extractCommand is private, so we test it indirectly via a small helper
    // that exercises the pattern matching logic via direct prototype access.
    let daemon: JarvisDaemon;

    beforeEach(() => {
      daemon = new JarvisDaemon();
    });

    function extractCmd(transcript: string): string | null {
      // Access private method for testing
      return (daemon as any).extractCommand(transcript);
    }

    it("detects plain wake word", () => {
      expect(extractCmd("agdi turn on the lights")).toBe("turn on the lights");
    });

    it("detects 'hey' prefix", () => {
      expect(extractCmd("hey agdi what time is it")).toBe("what time is it");
    });

    it("detects 'ok' prefix", () => {
      expect(extractCmd("ok agdi play some music")).toBe("play some music");
    });

    it("detects 'okay' prefix", () => {
      expect(extractCmd("okay agdi check email")).toBe("check email");
    });

    it("detects 'yo' prefix", () => {
      expect(extractCmd("yo agdi run the tests")).toBe("run the tests");
    });

    it("returns null if no wake word", () => {
      expect(extractCmd("just some random speech")).toBeNull();
    });

    it("returns null for wake word alone (no command)", () => {
      expect(extractCmd("agdi")).toBeNull();
    });

    it("is case insensitive", () => {
      expect(extractCmd("AGDI turn on the lights")).toBe("turn on the lights");
      expect(extractCmd("Hey AGDI check something")).toBe("check something");
    });

    it("strips filler words (can you, please, etc)", () => {
      expect(extractCmd("agdi can you check the logs")).toBe("check the logs");
      expect(extractCmd("agdi please restart")).toBe("restart");
      expect(extractCmd("agdi could you stop the server")).toBe("stop the server");
    });

    it("strips leading punctuation after wake word", () => {
      expect(extractCmd("agdi, turn on the lights")).toBe("turn on the lights");
      expect(extractCmd("agdi! do something")).toBe("do something");
    });
  });
});
