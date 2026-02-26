/**
 * Cross-platform device controller.
 *
 * Auto-detects the current platform and delegates all operations to the
 * appropriate backend (Linux, macOS, or Windows).
 *
 * Usage:
 *   const controller = await DeviceController.create();
 *   await controller.click(500, 300);
 *   await controller.type("hello world");
 *   await controller.openApp("Firefox");
 *   const screenshot = await controller.captureScreen();
 */

import { execFile } from "node:child_process";
import { writeFileSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { createSubsystemLogger } from "../logging/subsystem.js";

const run = promisify(execFile);
import type { LinuxSystemController } from "./device/linux-system.js";
import {
  detectPlatform,
  type DeviceBackend,
  type KeyModifier,
  type MouseButton,
  type Point,
  type ScreenRegion,
  type ScreenSize,
  type ScrollDirection,
  type WindowInfo,
} from "./device/types.js";

const log = createSubsystemLogger("device-control");

// ---------------------------------------------------------------------------
// Controller
// ---------------------------------------------------------------------------

export class DeviceController {
  private readonly backend: DeviceBackend;

  /**
   * Full system controller (Linux only).
   * Provides terminal, file, process, package, service, network, clipboard,
   * audio, display, and power control.
   */
  public readonly system: LinuxSystemController | null;

  private constructor(backend: DeviceBackend, system: LinuxSystemController | null) {
    this.backend = backend;
    this.system = system;
  }

  /**
   * Create a DeviceController for the current platform.
   * Validates that required native tools are available.
   */
  static async create(): Promise<DeviceController> {
    const platform = detectPlatform();
    let backend: DeviceBackend;
    let system: LinuxSystemController | null = null;

    switch (platform) {
      case "linux": {
        const { LinuxBackend } = await import("./device/linux-backend.js");
        const { LinuxSystemController: LSC } = await import("./device/linux-system.js");
        backend = new LinuxBackend();
        system = new LSC();
        break;
      }
      case "darwin": {
        const { MacOSBackend } = await import("./device/macos-backend.js");
        backend = new MacOSBackend();
        break;
      }
      case "win32": {
        const { WindowsBackend } = await import("./device/windows-backend.js");
        backend = new WindowsBackend();
        break;
      }
    }

    // Check that native tools are available
    const deps = await backend.checkDependencies();
    if (!deps.available) {
      log.warn(
        `missing native tools for ${platform}: ${deps.missing.join(", ")}. ` +
          `some device control features may not work.`,
      );
    } else {
      log.info(`device control ready on ${platform}`);
    }

    return new DeviceController(backend, system);
  }

  /** Which platform are we running on? */
  get platform() {
    return this.backend.platform;
  }

  // -------------------------------------------------------------------------
  // Mouse
  // -------------------------------------------------------------------------

  /** Move the mouse cursor to (x, y). */
  async moveTo(x: number, y: number): Promise<void> {
    log.info(`mouse → (${x}, ${y})`);
    await this.backend.mouseMoveTo(x, y);
  }

  /** Click at (x, y). Default: left button. */
  async click(x: number, y: number, button?: MouseButton): Promise<void> {
    log.info(`click ${button ?? "left"} → (${x}, ${y})`);
    await this.backend.mouseClick(x, y, button);
  }

  /** Double-click at (x, y). */
  async doubleClick(x: number, y: number): Promise<void> {
    log.info(`double-click → (${x}, ${y})`);
    await this.backend.mouseDoubleClick(x, y);
  }

  /** Right-click at (x, y). */
  async rightClick(x: number, y: number): Promise<void> {
    log.info(`right-click → (${x}, ${y})`);
    await this.backend.mouseRightClick(x, y);
  }

  /** Drag from one point to another. */
  async drag(from: Point, to: Point): Promise<void> {
    log.info(`drag (${from.x},${from.y}) → (${to.x},${to.y})`);
    await this.backend.mouseDrag(from, to);
  }

  /** Scroll in a direction. */
  async scroll(direction: ScrollDirection, amount?: number): Promise<void> {
    log.info(`scroll ${direction} ×${amount ?? 3}`);
    await this.backend.mouseScroll(direction, amount);
  }

  // -------------------------------------------------------------------------
  // Keyboard
  // -------------------------------------------------------------------------

  /** Type text as if from the keyboard. */
  async type(text: string): Promise<void> {
    log.info(`type "${text.slice(0, 40)}${text.length > 40 ? "…" : ""}"`);
    await this.backend.typeText(text);
  }

  /** Press a single key (Enter, Tab, F5, etc.). */
  async pressKey(key: string): Promise<void> {
    log.info(`press key: ${key}`);
    await this.backend.pressKey(key);
  }

  /** Press a hotkey combination (Ctrl+C, Alt+Tab, etc.). */
  async hotkey(modifiers: KeyModifier[], key: string): Promise<void> {
    log.info(`hotkey: ${modifiers.join("+")}+${key}`);
    await this.backend.hotkey(modifiers, key);
  }

  // -------------------------------------------------------------------------
  // Applications
  // -------------------------------------------------------------------------

  /** Open an application by name (e.g. "Firefox", "Visual Studio Code"). */
  async openApp(appName: string): Promise<void> {
    log.info(`open app: ${appName}`);
    await this.backend.openApp(appName);
  }

  /** Open a file with the default application. */
  async openFile(filePath: string): Promise<void> {
    log.info(`open file: ${filePath}`);
    await this.backend.openFile(filePath);
  }

  /** Open a URL in the default browser. */
  async openUrl(url: string): Promise<void> {
    log.info(`open URL: ${url}`);
    await this.backend.openUrl(url);
  }

  // -------------------------------------------------------------------------
  // Windows
  // -------------------------------------------------------------------------

  /** List all visible windows. */
  async listWindows(): Promise<WindowInfo[]> {
    return this.backend.listWindows();
  }

  /** Bring a window to the foreground by title or ID. */
  async focusWindow(titleOrId: string): Promise<void> {
    log.info(`focus window: ${titleOrId}`);
    await this.backend.focusWindow(titleOrId);
  }

  /** Minimize a window (defaults to the active window). */
  async minimizeWindow(titleOrId?: string): Promise<void> {
    log.info(`minimize: ${titleOrId ?? "active"}`);
    await this.backend.minimizeWindow(titleOrId);
  }

  /** Maximize a window (defaults to the active window). */
  async maximizeWindow(titleOrId?: string): Promise<void> {
    log.info(`maximize: ${titleOrId ?? "active"}`);
    await this.backend.maximizeWindow(titleOrId);
  }

  /** Close a window (defaults to the active window). */
  async closeWindow(titleOrId?: string): Promise<void> {
    log.info(`close: ${titleOrId ?? "active"}`);
    await this.backend.closeWindow(titleOrId);
  }

  // -------------------------------------------------------------------------
  // Screen
  // -------------------------------------------------------------------------

  /** Take a full-screen screenshot. Returns a PNG buffer. */
  async captureScreen(): Promise<Buffer> {
    log.info("capturing full screen");
    return this.backend.captureScreen();
  }

  /** Capture a specific region of the screen. Returns a PNG buffer. */
  async captureRegion(region: ScreenRegion): Promise<Buffer> {
    log.info(`capturing region ${region.x},${region.y} ${region.width}×${region.height}`);
    return this.backend.captureRegion(region);
  }

  /** Get the primary screen resolution. */
  async getScreenSize(): Promise<ScreenSize> {
    return this.backend.getScreenSize();
  }

  // -------------------------------------------------------------------------
  // Computer Vision (Track 1)
  // -------------------------------------------------------------------------

  /**
   * Finds a template image on the current screen using Python OpenCV.
   * Returns the center {x, y} coordinates for clicking if found.
   */
  async findImageOnScreen(
    templatePath: string,
    threshold = 0.8,
  ): Promise<{ match: boolean; x?: number; y?: number; confidence: number }> {
    log.info(`vision: searching for ${templatePath}`);
    const screenBuffer = await this.captureScreen();

    // Write screenshot to temp file for Python consumption
    const screenPic = join(tmpdir(), `agdi_screen_${Date.now()}.png`);
    writeFileSync(screenPic, screenBuffer);

    try {
      const matcherScript = new URL("./device/vision-matcher.py", import.meta.url).pathname;
      const { stdout } = await run("python3", [
        matcherScript,
        screenPic,
        templatePath,
        threshold.toString(),
      ]);
      const result = JSON.parse(stdout.trim());

      if (result.match) {
        log.info(`vision: found target at (${result.x}, ${result.y}) cov: ${result.confidence}`);
      } else {
        log.info(`vision: template not found globally (cov: ${result.confidence})`);
      }
      return result;
    } catch (err: any) {
      log.error(`vision matching failed: ${err.message}`);
      return { match: false, confidence: 0 };
    } finally {
      try {
        unlinkSync(screenPic);
      } catch {}
    }
  }

  /** Check if all required native tools are installed. */
  async checkDependencies(): Promise<{ available: boolean; missing: string[] }> {
    return this.backend.checkDependencies();
  }
}
