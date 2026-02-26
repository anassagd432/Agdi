/**
 * Multi-Monitor Manager — detect and manage multiple screens.
 *
 * Parses xrandr output to identify monitors, their positions,
 * resolutions, and which is primary. Lets the agent target
 * actions to specific screens.
 */

import { execFile } from "node:child_process";
import { createSubsystemLogger } from "../logging/subsystem.js";

const log = createSubsystemLogger("multi-monitor");

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Monitor = {
  name: string; // e.g. "HDMI-1", "eDP-1"
  primary: boolean;
  connected: boolean;
  width: number;
  height: number;
  x: number; // position in virtual screen
  y: number;
  refreshRate: number;
  resolutions: string[]; // Available resolutions
};

export type VirtualScreen = {
  totalWidth: number;
  totalHeight: number;
  monitors: Monitor[];
};

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function exec(cmd: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { timeout: 5000 }, (error, stdout) => {
      if (error) reject(new Error(error.message));
      else resolve(stdout);
    });
  });
}

// ---------------------------------------------------------------------------
// Multi-Monitor Manager
// ---------------------------------------------------------------------------

export class MultiMonitorManager {
  /** Detect all connected monitors and their configuration. */
  async detect(): Promise<VirtualScreen> {
    const output = await exec("xrandr", ["--current"]);
    const monitors = this.parseXrandr(output);

    const totalWidth = monitors.reduce((max, m) => Math.max(max, m.x + m.width), 0);
    const totalHeight = monitors.reduce((max, m) => Math.max(max, m.y + m.height), 0);

    log.info(`detected ${monitors.length} monitor(s), virtual: ${totalWidth}x${totalHeight}`);

    return { totalWidth, totalHeight, monitors };
  }

  /** Get the monitor at a given coordinate. */
  async getMonitorAt(x: number, y: number): Promise<Monitor | null> {
    const screen = await this.detect();
    return (
      screen.monitors.find(
        (m) => x >= m.x && x < m.x + m.width && y >= m.y && y < m.y + m.height,
      ) ?? null
    );
  }

  /** Get the primary monitor. */
  async getPrimary(): Promise<Monitor | null> {
    const screen = await this.detect();
    return screen.monitors.find((m) => m.primary) ?? screen.monitors[0] ?? null;
  }

  /** Convert coordinates relative to a monitor to virtual screen coordinates. */
  async toVirtualCoords(
    monitorName: string,
    localX: number,
    localY: number,
  ): Promise<{ x: number; y: number }> {
    const screen = await this.detect();
    const monitor = screen.monitors.find((m) => m.name === monitorName);
    if (!monitor) throw new Error(`Monitor not found: ${monitorName}`);
    return { x: monitor.x + localX, y: monitor.y + localY };
  }

  /** Move a window to a specific monitor. */
  async moveWindowToMonitor(windowTitle: string, monitorName: string): Promise<void> {
    const screen = await this.detect();
    const monitor = screen.monitors.find((m) => m.name === monitorName);
    if (!monitor) throw new Error(`Monitor not found: ${monitorName}`);

    try {
      // Use wmctrl to move window
      await exec("wmctrl", [
        "-r",
        windowTitle,
        "-e",
        `0,${monitor.x},${monitor.y},${monitor.width},${monitor.height}`,
      ]);
    } catch {
      // Fallback: use xdotool
      const windowId = await exec("xdotool", ["search", "--name", windowTitle]);
      const id = windowId.trim().split("\n")[0];
      if (id) {
        await exec("xdotool", ["windowmove", id, String(monitor.x + 50), String(monitor.y + 50)]);
        await exec("xdotool", [
          "windowsize",
          id,
          String(monitor.width - 100),
          String(monitor.height - 100),
        ]);
      }
    }
    log.info(`moved "${windowTitle}" to ${monitorName}`);
  }

  // -------------------------------------------------------------------------
  // Private
  // -------------------------------------------------------------------------

  private parseXrandr(output: string): Monitor[] {
    const monitors: Monitor[] = [];
    const lines = output.split("\n");

    let currentMonitor: Partial<Monitor> | null = null;

    for (const line of lines) {
      // Monitor line: "HDMI-1 connected primary 1920x1080+0+0 ..."
      const monitorMatch = line.match(
        /^(\S+)\s+(connected|disconnected)\s*(primary)?\s*(?:(\d+)x(\d+)\+(\d+)\+(\d+))?/,
      );
      if (monitorMatch) {
        if (currentMonitor?.name) {
          monitors.push(currentMonitor as Monitor);
        }
        currentMonitor = {
          name: monitorMatch[1]!,
          connected: monitorMatch[2] === "connected",
          primary: monitorMatch[3] === "primary",
          width: parseInt(monitorMatch[4] ?? "0", 10),
          height: parseInt(monitorMatch[5] ?? "0", 10),
          x: parseInt(monitorMatch[6] ?? "0", 10),
          y: parseInt(monitorMatch[7] ?? "0", 10),
          refreshRate: 60,
          resolutions: [],
        };
        continue;
      }

      // Resolution line: "   1920x1080     60.00*+  59.94  ..."
      const resMatch = line.match(/^\s+(\d+x\d+)\s+([\d.]+)(\*?\+?)/);
      if (resMatch && currentMonitor) {
        currentMonitor.resolutions = currentMonitor.resolutions ?? [];
        currentMonitor.resolutions.push(resMatch[1]!);
        if (resMatch[3]?.includes("*")) {
          currentMonitor.refreshRate = parseFloat(resMatch[2]!);
        }
      }
    }

    if (currentMonitor?.name) {
      monitors.push(currentMonitor as Monitor);
    }

    return monitors.filter((m) => m.connected);
  }
}
