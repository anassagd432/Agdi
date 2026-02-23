export type AutonomousAgentConfig = {
  /** Master switch — set `true` to enable the autonomous agent feature. Default: false */
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
};
