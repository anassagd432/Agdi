/**
 * iOS Device Backend — control iPhones/iPads.
 *
 * Uses two approaches depending on what's available:
 *
 * 1. **libimobiledevice** (idevice* tools) — device info, screenshots,
 *    app install/uninstall, file transfer, syslog. Works over USB.
 *    Install: `brew install libimobiledevice` or `sudo apt install libimobiledevice-utils`
 *
 * 2. **WebDriverAgent (WDA)** — touch, tap, swipe, type, app launch.
 *    Requires WDA running on the device (via Xcode or tidevice).
 *    Communicates over HTTP to the WDA server on the device.
 *
 * 3. **tidevice** (Python) — alternative to libimobiledevice with
 *    WDA bootstrapping. Install: `pip3 install tidevice`
 *
 * Capabilities:
 * - Touch: tap, swipe, long-press, double-tap
 * - Keyboard: text input
 * - Apps: launch, kill, list, install/uninstall
 * - Screen: screenshot
 * - Device info: name, model, iOS version, battery, storage
 * - Files: push/pull via AFC (Apple File Conduit)
 */

import { execFile } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readFile, unlink } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { createSubsystemLogger } from "../../logging/subsystem.js";

const log = createSubsystemLogger("ios");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function run(cmd: string, args: string[], timeoutMs: number = 15_000): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { timeout: timeoutMs }, (error, stdout, stderr) => {
      if (error) reject(new Error(`${cmd} ${args.join(" ")} failed: ${stderr || error.message}`));
      else resolve(stdout.trim());
    });
  });
}

async function httpRequest(
  url: string,
  method: "GET" | "POST" | "DELETE" = "GET",
  body?: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const { default: http } = await import("node:http");
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const reqBody = body ? JSON.stringify(body) : undefined;
    const req = http.request(
      {
        hostname: urlObj.hostname,
        port: urlObj.port,
        path: urlObj.pathname,
        method,
        headers: reqBody
          ? { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(reqBody) }
          : {},
        timeout: 10_000,
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => { data += chunk; });
        res.on("end", () => {
          try { resolve(JSON.parse(data || "{}")); } catch { resolve({ raw: data }); }
        });
      },
    );
    req.on("error", reject);
    if (reqBody) req.write(reqBody);
    req.end();
  });
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type IOSDevice = {
  udid: string;
  name: string;
  model: string;
  iosVersion: string;
  connectionType: "usb" | "wifi";
};

export type IOSBatteryInfo = {
  level: number;
  state: "charging" | "unplugged" | "full" | "unknown";
};

export type IOSAppInfo = {
  bundleId: string;
  name: string;
  version?: string;
};

export type IOSScreenSize = {
  width: number;
  height: number;
  scale: number;
};

// ---------------------------------------------------------------------------
// iOS Backend
// ---------------------------------------------------------------------------

export class IOSBackend {
  private udid: string | null = null;
  private wdaBaseUrl: string | null = null; // e.g. "http://localhost:8100"
  private useTimachine = false; // whether tidevice is available

  /**
   * Connect to a device.
   * @param udid  Specific device UDID (optional — uses first found)
   * @param wdaPort  Port where WDA is running (default 8100)
   */
  async connect(udid?: string, wdaPort: number = 8100): Promise<void> {
    // Detect devices
    const devices = await this.listDevices();
    if (devices.length === 0) {
      throw new Error("No iOS devices found. Connect via USB and trust the computer.");
    }

    this.udid = udid ?? devices[0]!.udid;
    this.wdaBaseUrl = `http://localhost:${wdaPort}`;

    // Check if WDA is reachable
    try {
      await httpRequest(`${this.wdaBaseUrl}/status`);
      log.info(`connected to ${this.udid}, WDA available at port ${wdaPort}`);
    } catch {
      this.wdaBaseUrl = null;
      log.info(`connected to ${this.udid} (WDA not available — touch controls disabled)`);
      log.info("start WDA via Xcode or: tidevice wdaproxy --port 8100");
    }

    // Check tidevice
    try {
      await run("tidevice", ["version"]);
      this.useTimachine = true;
    } catch {
      this.useTimachine = false;
    }
  }

  // -------------------------------------------------------------------------
  // Device Management
  // -------------------------------------------------------------------------

  /** List connected iOS devices. */
  async listDevices(): Promise<IOSDevice[]> {
    try {
      // Try libimobiledevice first
      const output = await run("idevice_id", ["-l"]);
      const udids = output.split("\n").filter(Boolean);

      const devices: IOSDevice[] = [];
      for (const id of udids) {
        try {
          const name = await run("idevicename", ["-u", id]);
          const info = await run("ideviceinfo", ["-u", id, "-k", "ProductType"]);
          const version = await run("ideviceinfo", ["-u", id, "-k", "ProductVersion"]);
          devices.push({
            udid: id,
            name: name.trim(),
            model: info.trim(),
            iosVersion: version.trim(),
            connectionType: "usb",
          });
        } catch {
          devices.push({ udid: id, name: "Unknown", model: "Unknown", iosVersion: "", connectionType: "usb" });
        }
      }
      return devices;
    } catch {
      // Fallback: try tidevice
      try {
        const output = await run("tidevice", ["list", "--json"]);
        const parsed = JSON.parse(output) as Array<{ udid: string; name: string; model: string; version: string }>;
        return parsed.map((d) => ({
          udid: d.udid,
          name: d.name,
          model: d.model,
          iosVersion: d.version,
          connectionType: "usb" as const,
        }));
      } catch {
        return [];
      }
    }
  }

  // -------------------------------------------------------------------------
  // Touch / Input (requires WDA)
  // -------------------------------------------------------------------------

  /** Tap at (x, y). */
  async tap(x: number, y: number): Promise<void> {
    this.requireWDA();
    log.info(`tap (${x}, ${y})`);
    await httpRequest(`${this.wdaBaseUrl}/session/0/wda/tap/0`, "POST", { x, y });
  }

  /** Double-tap at (x, y). */
  async doubleTap(x: number, y: number): Promise<void> {
    this.requireWDA();
    log.info(`double tap (${x}, ${y})`);
    await httpRequest(`${this.wdaBaseUrl}/session/0/wda/doubleTap`, "POST", { x, y });
  }

  /** Long press at (x, y). */
  async longPress(x: number, y: number, durationS: number = 1): Promise<void> {
    this.requireWDA();
    log.info(`long press (${x}, ${y}) ${durationS}s`);
    await httpRequest(`${this.wdaBaseUrl}/session/0/wda/touchAndHold`, "POST", { x, y, duration: durationS });
  }

  /** Swipe from one point to another. */
  async swipe(fromX: number, fromY: number, toX: number, toY: number, durationS: number = 0.3): Promise<void> {
    this.requireWDA();
    log.info(`swipe (${fromX},${fromY}) → (${toX},${toY})`);
    await httpRequest(`${this.wdaBaseUrl}/session/0/wda/dragfromtoforduration`, "POST", {
      fromX, fromY, toX, toY, duration: durationS,
    });
  }

  /** Scroll up/down. */
  async scroll(direction: "up" | "down" | "left" | "right"): Promise<void> {
    this.requireWDA();
    await httpRequest(`${this.wdaBaseUrl}/session/0/wda/scroll`, "POST", { direction });
  }

  /** Type text (requires WDA). */
  async typeText(text: string): Promise<void> {
    this.requireWDA();
    log.info(`type: "${text.slice(0, 30)}"`);
    await httpRequest(`${this.wdaBaseUrl}/session/0/wda/keys`, "POST", {
      value: text.split(""),
    });
  }

  /** Press a hardware button (home, volumeUp, volumeDown). */
  async pressButton(button: "home" | "volumeUp" | "volumeDown" | "lock"): Promise<void> {
    this.requireWDA();
    const buttonMap: Record<string, string> = {
      home: "home",
      volumeUp: "volumeUp",
      volumeDown: "volumeDown",
      lock: "lock",
    };
    await httpRequest(`${this.wdaBaseUrl}/session/0/wda/pressButton`, "POST", {
      name: buttonMap[button] ?? button,
    });
  }

  // -------------------------------------------------------------------------
  // Apps
  // -------------------------------------------------------------------------

  /** Launch an app by bundle ID. */
  async launchApp(bundleId: string): Promise<void> {
    log.info(`launch: ${bundleId}`);
    if (this.wdaBaseUrl) {
      await httpRequest(`${this.wdaBaseUrl}/session/0/wda/apps/launch`, "POST", { bundleId });
    } else if (this.useTimachine) {
      await run("tidevice", ["-u", this.udid!, "launch", bundleId]);
    } else {
      await run("idevicedebug", ["-u", this.udid!, "run", bundleId]);
    }
  }

  /** Kill an app. */
  async killApp(bundleId: string): Promise<void> {
    log.info(`kill: ${bundleId}`);
    if (this.wdaBaseUrl) {
      await httpRequest(`${this.wdaBaseUrl}/session/0/wda/apps/terminate`, "POST", { bundleId });
    } else if (this.useTimachine) {
      await run("tidevice", ["-u", this.udid!, "kill", bundleId]);
    }
  }

  /** List installed apps. */
  async listApps(): Promise<IOSAppInfo[]> {
    try {
      const output = await run("ideviceinstaller", ["-u", this.udid!, "-l", "-o", "json"]);
      const parsed = JSON.parse(output) as Array<{ CFBundleIdentifier: string; CFBundleName: string; CFBundleShortVersionString?: string }>;
      return parsed.map((app) => ({
        bundleId: app.CFBundleIdentifier,
        name: app.CFBundleName,
        version: app.CFBundleShortVersionString,
      }));
    } catch {
      // Fallback: tidevice
      try {
        const output = await run("tidevice", ["-u", this.udid!, "applist"]);
        return output.split("\n").filter(Boolean).map((line) => {
          const match = line.match(/^(\S+)\s+(.*)/);
          return { bundleId: match?.[1] ?? line, name: match?.[2] ?? "" };
        });
      } catch {
        return [];
      }
    }
  }

  /** Install an IPA. */
  async installApp(ipaPath: string): Promise<void> {
    log.info(`installing: ${ipaPath}`);
    if (this.useTimachine) {
      await run("tidevice", ["-u", this.udid!, "install", ipaPath], 120_000);
    } else {
      await run("ideviceinstaller", ["-u", this.udid!, "-i", ipaPath], 120_000);
    }
  }

  /** Uninstall an app. */
  async uninstallApp(bundleId: string): Promise<void> {
    log.info(`uninstalling: ${bundleId}`);
    if (this.useTimachine) {
      await run("tidevice", ["-u", this.udid!, "uninstall", bundleId]);
    } else {
      await run("ideviceinstaller", ["-u", this.udid!, "-U", bundleId]);
    }
  }

  /** Open a URL on the device. */
  async openUrl(url: string): Promise<void> {
    if (this.wdaBaseUrl) {
      // Launch Safari with URL
      await httpRequest(`${this.wdaBaseUrl}/session/0/url`, "POST", { url });
    } else if (this.useTimachine) {
      await run("tidevice", ["-u", this.udid!, "openurl", url]);
    }
  }

  // -------------------------------------------------------------------------
  // Screen
  // -------------------------------------------------------------------------

  /** Take a screenshot. Returns PNG buffer. */
  async captureScreen(): Promise<Buffer> {
    const localPath = join(tmpdir(), `ios-${randomUUID()}.png`);
    try {
      if (this.wdaBaseUrl) {
        // WDA screenshot (returns base64 PNG)
        const resp = await httpRequest(`${this.wdaBaseUrl}/screenshot`);
        if (resp.value && typeof resp.value === "string") {
          return Buffer.from(resp.value, "base64");
        }
      }
      // Fallback: idevicescreenshot
      await run("idevicescreenshot", ["-u", this.udid!, localPath]);
      return await readFile(localPath);
    } finally {
      await unlink(localPath).catch(() => {});
    }
  }

  /** Get screen size. */
  async getScreenSize(): Promise<IOSScreenSize> {
    if (this.wdaBaseUrl) {
      const resp = await httpRequest(`${this.wdaBaseUrl}/session/0/window/size`);
      const value = resp.value as { width: number; height: number } | undefined;
      return { width: value?.width ?? 375, height: value?.height ?? 812, scale: 3 };
    }
    // Default iPhone 14 Pro dimensions
    return { width: 393, height: 852, scale: 3 };
  }

  // -------------------------------------------------------------------------
  // Device Info
  // -------------------------------------------------------------------------

  /** Get device info. */
  async getDeviceInfo(): Promise<Record<string, string>> {
    const info: Record<string, string> = {};
    const keys = [
      "DeviceName", "ProductType", "ProductVersion",
      "HardwareModel", "UniqueDeviceID", "WiFiAddress",
      "SerialNumber", "CPUArchitecture",
    ];

    for (const key of keys) {
      try {
        info[key] = await run("ideviceinfo", ["-u", this.udid!, "-k", key]);
      } catch {
        info[key] = "unknown";
      }
    }
    return info;
  }

  /** Get battery info. */
  async getBattery(): Promise<IOSBatteryInfo> {
    try {
      const levelStr = await run("ideviceinfo", ["-u", this.udid!, "-q", "com.apple.mobile.battery", "-k", "BatteryCurrentCapacity"]);
      const statusStr = await run("ideviceinfo", ["-u", this.udid!, "-q", "com.apple.mobile.battery", "-k", "BatteryIsCharging"]);
      return {
        level: parseInt(levelStr, 10) || 0,
        state: statusStr.toLowerCase().includes("true") ? "charging" : "unplugged",
      };
    } catch {
      return { level: -1, state: "unknown" };
    }
  }

  // -------------------------------------------------------------------------
  // Files (AFC — Apple File Conduit)
  // -------------------------------------------------------------------------

  /** List files in a directory on the device. */
  async listFiles(remotePath: string = "/"): Promise<string[]> {
    const output = await run("ifuse", ["--list-apps"]).catch(() => "");
    // AFC access is limited — only Documents folders of apps and media
    try {
      const result = await run("ideviceinfo", ["-u", this.udid!, "-q", "com.apple.mobile.file_relay"]);
      return result.split("\n").filter(Boolean);
    } catch {
      return [`AFC access limited. Use: ifuse /mount/point -u ${this.udid}`];
    }
  }

  /** Pull a file from the device. */
  async pullFile(remotePath: string, localPath: string): Promise<void> {
    if (this.useTimachine) {
      await run("tidevice", ["-u", this.udid!, "pull", remotePath, localPath]);
    }
  }

  /** Push a file to the device. */
  async pushFile(localPath: string, remotePath: string): Promise<void> {
    if (this.useTimachine) {
      await run("tidevice", ["-u", this.udid!, "push", localPath, remotePath]);
    }
  }

  // -------------------------------------------------------------------------
  // System
  // -------------------------------------------------------------------------

  /** Read the device syslog. */
  async getSyslog(lines: number = 50): Promise<string> {
    try {
      return await run("idevicesyslog", ["-u", this.udid!], 5000);
    } catch (err) {
      // idevicesyslog runs continuously, so timeout is expected
      return err instanceof Error ? err.message : "";
    }
  }

  /** Restart the device. */
  async restart(): Promise<void> {
    log.warn("restarting device");
    await run("idevicediagnostics", ["-u", this.udid!, "restart"]);
  }

  /** Put the device to sleep. */
  async sleep(): Promise<void> {
    await run("idevicediagnostics", ["-u", this.udid!, "sleep"]);
  }

  // -------------------------------------------------------------------------
  // Utility
  // -------------------------------------------------------------------------

  /** Check which iOS tools are available. */
  async checkDependencies(): Promise<{ available: boolean; missing: string[]; tools: Record<string, boolean> }> {
    const tools: Record<string, boolean> = {};
    const checks = [
      "idevice_id", "ideviceinfo", "idevicescreenshot",
      "ideviceinstaller", "idevicename", "idevicediagnostics",
      "idevicesyslog", "tidevice",
    ];

    const missing: string[] = [];
    for (const tool of checks) {
      try {
        await run("which", [tool]);
        tools[tool] = true;
      } catch {
        tools[tool] = false;
        missing.push(tool);
      }
    }

    // Minimum requirement: either libimobiledevice OR tidevice
    const hasLibimobiledevice = tools["idevice_id"] === true;
    const hasTidevice = tools["tidevice"] === true;
    const available = hasLibimobiledevice || hasTidevice;

    return { available, missing, tools };
  }

  // -------------------------------------------------------------------------
  // Private
  // -------------------------------------------------------------------------

  private requireWDA(): void {
    if (!this.wdaBaseUrl) {
      throw new Error(
        "WebDriverAgent (WDA) not available. Touch control requires WDA.\n" +
        "Start it via Xcode or: tidevice wdaproxy --port 8100"
      );
    }
  }
}
