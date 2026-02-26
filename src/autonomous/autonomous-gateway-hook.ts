/**
 * Gateway hook for autonomous mode.
 *
 * This thin integration layer is called by the gateway startup/shutdown
 * to start and stop the autonomous daemon alongside the gateway server.
 * The autonomous feature is controlled by `autonomous.enabled` in config.
 */

import { createSubsystemLogger } from "../logging/subsystem.js";

const log = createSubsystemLogger("autonomous");

let autonomousDaemon: any = null;

/**
 * Start the autonomous daemon if `autonomous.enabled` is true in config.
 *
 * Called from the gateway run loop after the server starts.
 * If autonomous is disabled or missing, this is a no-op.
 *
 * @param autonomousConfig - The `autonomous` section from AGDIConfig
 * @param opts - Optional overrides (e.g. from CLI flags)
 */
export async function maybeStartAutonomous(
  autonomousConfig:
    | {
        enabled?: boolean;
        headless?: boolean;
        dashboardPort?: number;
        visionModel?: string;
        fastModel?: string;
        dataDir?: string;
        selfImprove?: boolean;
        recording?: boolean;
        scheduler?: boolean;
        plugins?: boolean;
      }
    | undefined,
  opts?: { forceEnabled?: boolean; forceDisabled?: boolean },
): Promise<void> {
  // CLI flag overrides
  if (opts?.forceDisabled) return;

  const enabled = opts?.forceEnabled ?? autonomousConfig?.enabled;
  if (!enabled) return;

  try {
    const { startDaemon } = await import("./index.js");

    const config: Record<string, unknown> = {
      headless: autonomousConfig?.headless ?? true,
      dashboardPort: autonomousConfig?.dashboardPort ?? 7700,
      visionModel: autonomousConfig?.visionModel ?? "gemini-2.5-pro",
      fastModel: autonomousConfig?.fastModel ?? "gemini-2.0-flash",
    };

    if (autonomousConfig?.dataDir) config.dataDir = autonomousConfig.dataDir;

    log.info("starting autonomous agent...");
    autonomousDaemon = await startDaemon(config as any);

    const port = autonomousConfig?.dashboardPort ?? 7700;
    log.info(`autonomous agent active — dashboard: http://localhost:${port}`);
  } catch (err) {
    log.error(
      `failed to start autonomous agent: ${err instanceof Error ? err.message : String(err)}`,
    );
    // Don't crash the gateway — autonomous is best-effort
  }
}

/**
 * Stop the autonomous daemon gracefully.
 *
 * Called from the gateway shutdown handler.
 */
export async function stopAutonomous(): Promise<void> {
  if (!autonomousDaemon) return;

  try {
    log.info("stopping autonomous agent...");
    const { stopDaemon } = await import("./index.js");
    await stopDaemon();
    autonomousDaemon = null;
    log.info("autonomous agent stopped");
  } catch (err) {
    log.error(
      `error stopping autonomous agent: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

/**
 * Check if autonomous mode is currently active.
 */
export function isAutonomousActive(): boolean {
  return autonomousDaemon !== null;
}
