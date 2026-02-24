/**
 * Android Device Backend — control Android phones/tablets via ADB.
 *
 * Requires: Android Debug Bridge (adb) installed and device connected
 * via USB or WiFi (adb connect <ip>:5555).
 *
 * Capabilities:
 * - Touch: tap, swipe, long-press, pinch
 * - Keyboard: text input, key events
 * - Apps: launch, kill, list, install/uninstall
 * - Screen: screenshot, screen recording, screen size
 * - Files: push/pull files to/from device
 * - System: battery, wifi, bluetooth, volume, brightness
 * - Shell: run arbitrary shell commands on device
 */

import { execFile } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readFile, unlink } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { createSubsystemLogger } from "../../logging/subsystem.js";

const log = createSubsystemLogger("android");

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function adb(args: string[], timeoutMs: number = 15_000): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile("adb", args, { timeout: timeoutMs }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(`adb ${args.join(" ")} failed: ${stderr || error.message}`));
        return;
      }
      resolve(stdout.trim());
    });
  });
}

function adbShell(command: string, timeoutMs?: number): Promise<string> {
  return adb(["shell", command], timeoutMs);
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AndroidDevice = {
  serial: string;
  model: string;
  state: "device" | "offline" | "unauthorized" | "unknown";
};

export type AndroidApp = {
  packageName: string;
  activityName?: string;
};

export type AndroidScreenSize = {
  width: number;
  height: number;
  density: number;
};

export type BatteryInfo = {
  level: number;
  status: string;
  charging: boolean;
  temperature: number;
};

// ---------------------------------------------------------------------------
// Android Backend
// ---------------------------------------------------------------------------

export class AndroidBackend {
  private serial: string | null = null;

  /**
   * Connect to a specific device. If null, uses the only connected device.
   */
  async connect(serial?: string): Promise<void> {
    if (serial) {
      this.serial = serial;
    }
    const devices = await this.listDevices();
    if (devices.length === 0) throw new Error("No Android devices found. Connect via USB or run: adb connect <ip>:5555");
    if (!this.serial) {
      this.serial = devices[0]!.serial;
    }
    log.info(`connected to ${this.serial}`);
  }

  private deviceArgs(): string[] {
    return this.serial ? ["-s", this.serial] : [];
  }

  private async cmd(args: string[], timeout?: number): Promise<string> {
    return adb([...this.deviceArgs(), ...args], timeout);
  }

  private async shell(command: string, timeout?: number): Promise<string> {
    return adb([...this.deviceArgs(), "shell", command], timeout);
  }

  // -------------------------------------------------------------------------
  // Device Management
  // -------------------------------------------------------------------------

  /** List connected Android devices. */
  async listDevices(): Promise<AndroidDevice[]> {
    const output = await adb(["devices", "-l"]);
    const lines = output.split("\n").slice(1).filter((l) => l.trim());

    return lines.map((line) => {
      const parts = line.split(/\s+/);
      const serial = parts[0] ?? "";
      const state = (parts[1] ?? "unknown") as AndroidDevice["state"];
      const modelMatch = line.match(/model:(\S+)/);
      return {
        serial,
        state,
        model: modelMatch?.[1] ?? "unknown",
      };
    });
  }

  /** Connect to a device over WiFi. */
  async connectWifi(ip: string, port: number = 5555): Promise<void> {
    await adb(["connect", `${ip}:${port}`]);
    this.serial = `${ip}:${port}`;
    log.info(`wifi connected: ${this.serial}`);
  }

  // -------------------------------------------------------------------------
  // Touch / Input
  // -------------------------------------------------------------------------

  /** Tap at (x, y). */
  async tap(x: number, y: number): Promise<void> {
    log.info(`tap (${x}, ${y})`);
    await this.shell(`input tap ${x} ${y}`);
  }

  /** Long press at (x, y). */
  async longPress(x: number, y: number, durationMs: number = 1000): Promise<void> {
    log.info(`long press (${x}, ${y}) ${durationMs}ms`);
    await this.shell(`input swipe ${x} ${y} ${x} ${y} ${durationMs}`);
  }

  /** Swipe from one point to another. */
  async swipe(fromX: number, fromY: number, toX: number, toY: number, durationMs: number = 300): Promise<void> {
    log.info(`swipe (${fromX},${fromY}) → (${toX},${toY})`);
    await this.shell(`input swipe ${fromX} ${fromY} ${toX} ${toY} ${durationMs}`);
  }

  /** Scroll up/down on the screen. */
  async scroll(direction: "up" | "down", amount: number = 500): Promise<void> {
    const size = await this.getScreenSize();
    const cx = Math.round(size.width / 2);
    const cy = Math.round(size.height / 2);
    if (direction === "down") {
      await this.swipe(cx, cy, cx, cy - amount);
    } else {
      await this.swipe(cx, cy, cx, cy + amount);
    }
  }

  /** Double-tap. */
  async doubleTap(x: number, y: number): Promise<void> {
    await this.tap(x, y);
    await new Promise((r) => setTimeout(r, 80));
    await this.tap(x, y);
  }

  /** Pinch in/out (zoom). */
  async pinch(centerX: number, centerY: number, direction: "in" | "out"): Promise<void> {
    const offset = direction === "out" ? 200 : -200;
    // Simulate two-finger gesture
    await this.shell(`input swipe ${centerX - offset} ${centerY} ${centerX + offset} ${centerY} 300`);
  }

  // -------------------------------------------------------------------------
  // Keyboard / Text
  // -------------------------------------------------------------------------

  /** Type text on the device. */
  async typeText(text: string): Promise<void> {
    log.info(`type: "${text.slice(0, 30)}"`);
    const escaped = text.replace(/ /g, "%s").replace(/'/g, "\\'").replace(/"/g, '\\"');
    await this.shell(`input text '${escaped}'`);
  }

  /** Press a key (home, back, menu, enter, etc.). */
  async pressKey(keyCode: string | number): Promise<void> {
    const KEY_MAP: Record<string, number> = {
      home: 3, back: 4, menu: 82, enter: 66, tab: 61,
      delete: 67, space: 62, up: 19, down: 20, left: 21, right: 22,
      volumeup: 24, volumedown: 25, power: 26, camera: 27,
      search: 84, mute: 164, escape: 111,
      recentapps: 187, appswitcher: 187,
    };
    const code = typeof keyCode === "number" ? keyCode : KEY_MAP[keyCode.toLowerCase()] ?? 0;
    log.info(`key: ${keyCode} (code ${code})`);
    await this.shell(`input keyevent ${code}`);
  }

  // -------------------------------------------------------------------------
  // Apps
  // -------------------------------------------------------------------------

  /** Launch an app by package name. */
  async launchApp(packageName: string): Promise<void> {
    log.info(`launch: ${packageName}`);
    await this.shell(`monkey -p ${packageName} -c android.intent.category.LAUNCHER 1`);
  }

  /** Kill an app. */
  async killApp(packageName: string): Promise<void> {
    log.info(`kill: ${packageName}`);
    await this.shell(`am force-stop ${packageName}`);
  }

  /** List installed apps. */
  async listApps(filter?: string): Promise<string[]> {
    const output = await this.shell("pm list packages");
    const packages = output.split("\n")
      .map((l) => l.replace("package:", "").trim())
      .filter(Boolean);
    if (filter) return packages.filter((p) => p.includes(filter));
    return packages;
  }

  /** Install an APK from local path. */
  async installApk(localPath: string): Promise<void> {
    log.info(`installing APK: ${localPath}`);
    await this.cmd(["install", "-r", localPath], 60_000);
  }

  /** Uninstall an app. */
  async uninstallApp(packageName: string): Promise<void> {
    log.info(`uninstalling: ${packageName}`);
    await this.cmd(["uninstall", packageName]);
  }

  /** Open a URL in the default browser. */
  async openUrl(url: string): Promise<void> {
    await this.shell(`am start -a android.intent.action.VIEW -d "${url}"`);
  }

  /** Get the current foreground app. */
  async getCurrentApp(): Promise<string> {
    const output = await this.shell("dumpsys window windows | grep mCurrentFocus");
    const match = output.match(/\{.+\s+(\S+)\/(\S+)\}/);
    return match?.[1] ?? "unknown";
  }

  // -------------------------------------------------------------------------
  // Screen
  // -------------------------------------------------------------------------

  /** Take a screenshot. Returns PNG buffer. */
  async captureScreen(): Promise<Buffer> {
    const remotePath = `/sdcard/screenshot-${randomUUID()}.png`;
    const localPath = join(tmpdir(), `android-${randomUUID()}.png`);
    try {
      await this.shell(`screencap -p ${remotePath}`);
      await this.cmd(["pull", remotePath, localPath]);
      await this.shell(`rm ${remotePath}`);
      return await readFile(localPath);
    } finally {
      await unlink(localPath).catch(() => {});
    }
  }

  /** Get screen dimensions. */
  async getScreenSize(): Promise<AndroidScreenSize> {
    const sizeOutput = await this.shell("wm size");
    const densityOutput = await this.shell("wm density");
    const sizeMatch = sizeOutput.match(/(\d+)x(\d+)/);
    const densityMatch = densityOutput.match(/(\d+)/);
    return {
      width: parseInt(sizeMatch?.[1] ?? "1080", 10),
      height: parseInt(sizeMatch?.[2] ?? "1920", 10),
      density: parseInt(densityMatch?.[1] ?? "420", 10),
    };
  }

  // -------------------------------------------------------------------------
  // Files
  // -------------------------------------------------------------------------

  /** Push a file to the device. */
  async pushFile(localPath: string, remotePath: string): Promise<void> {
    await this.cmd(["push", localPath, remotePath]);
  }

  /** Pull a file from the device. */
  async pullFile(remotePath: string, localPath: string): Promise<void> {
    await this.cmd(["pull", remotePath, localPath]);
  }

  /** List files on device. */
  async listFiles(remotePath: string): Promise<string[]> {
    const output = await this.shell(`ls "${remotePath}"`);
    return output.split("\n").filter(Boolean);
  }

  // -------------------------------------------------------------------------
  // System
  // -------------------------------------------------------------------------

  /** Get battery info. */
  async getBattery(): Promise<BatteryInfo> {
    const output = await this.shell("dumpsys battery");
    const level = parseInt(output.match(/level: (\d+)/)?.[1] ?? "0", 10);
    const status = output.match(/status: (\d+)/)?.[1] ?? "0";
    const temp = parseInt(output.match(/temperature: (\d+)/)?.[1] ?? "0", 10);
    return {
      level,
      status: ["unknown", "charging", "discharging", "not charging", "full"][parseInt(status)] ?? "unknown",
      charging: status === "2" || status === "5",
      temperature: temp / 10,
    };
  }

  /** Toggle WiFi on/off. */
  async toggleWifi(enabled: boolean): Promise<void> {
    await this.shell(`svc wifi ${enabled ? "enable" : "disable"}`);
  }

  /** Toggle Bluetooth. */
  async toggleBluetooth(enabled: boolean): Promise<void> {
    const action = enabled ? "enable" : "disable";
    await this.shell(`settings put global bluetooth_on ${enabled ? 1 : 0}`);
  }

  /** Set screen brightness (0-255). */
  async setBrightness(value: number): Promise<void> {
    const clamped = Math.min(255, Math.max(0, value));
    await this.shell(`settings put system screen_brightness ${clamped}`);
  }

  /** Set volume (0-15 for most streams). */
  async setVolume(stream: "music" | "ring" | "alarm" | "notification" = "music", level: number): Promise<void> {
    const streamMap = { music: 3, ring: 2, alarm: 4, notification: 5 };
    await this.shell(`media volume --stream ${streamMap[stream]} --set ${level}`);
  }

  /** Run an arbitrary shell command on the device. */
  async shellCommand(command: string): Promise<string> {
    return this.shell(command);
  }

  // -------------------------------------------------------------------------
  // Utility
  // -------------------------------------------------------------------------

  /** Check if ADB is available and a device is connected. */
  async checkDependencies(): Promise<{ available: boolean; missing: string[] }> {
    const missing: string[] = [];
    try {
      await adb(["version"]);
    } catch {
      missing.push("adb");
      return { available: false, missing };
    }
    const devices = await this.listDevices();
    if (devices.filter((d) => d.state === "device").length === 0) {
      missing.push("connected-device");
    }
    return { available: missing.length === 0, missing };
  }
}
