export type AutonomousAgentConfig = {
  /** Master switch â€” set `true` to enable the autonomous agent feature. Default: false */
  enabled?: boolean;
  /** Run browser in headless mode. Default: true */
  headless?: boolean;
  /** Dashboard HTTP port. Default: 7700 */
  dashboardPort?: number;
  /** Gemini vision model. Default: "gemini-2.5-pro" */
  visionModel?: string;
  /** Gemini fast model for quick analysis. Default: "gemini-2.0-flash" */
  fastModel?: string;
  /** Persistence directory. Default: ~/.agdi/autonomous */
  dataDir?: string;
  /** Enable self-improvement cycles. Default: true */
  selfImprove?: boolean;
  /** Enable task recording. Default: true */
  recording?: boolean;
  /** Enable the cron-based goal scheduler. Default: true */
  scheduler?: boolean;
  /** Enable the plugin system. Default: true */
  plugins?: boolean;
  /** Jarvis always-on voice assistant. */
  jarvis?: {
    /** Enable Jarvis mode. Default: false */
    enabled?: boolean;
    /** Mic device name (empty = system default). */
    micDevice?: string;
    /** STT engine: "whisper-local" | "whisper-api". Default: "whisper-api". */
    sttEngine?: "whisper-local" | "whisper-api";
    /** Whisper model size for local mode. Default: "base". */
    whisperModel?: "tiny" | "base" | "small" | "medium";
    /** Voice activity detection sensitivity (0.0â€“1.0). Default: 0.02. */
    vadSensitivity?: number;
    /** TTS engine: "system" | "browser" | "off". Default: "system". */
    ttsEngine?: "system" | "browser" | "off";
    /** Speech rate (0.5â€“2.0). Default: 1.0. */
    ttsRate?: number;
    /** Seconds of silence before speech capture ends. Default: 1.5. */
    silenceTimeout?: number;
    /** Cooldown (ms) between commands to prevent feedback. Default: 2000. */
    commandCooldownMs?: number;
    /** Language hint for STT (BCP-47). Default: "en". */
    language?: string;
  };
};
