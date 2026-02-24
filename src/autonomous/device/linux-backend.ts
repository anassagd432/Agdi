/**
 * Linux device backend.
 *
 * Uses:
 * - xdotool — mouse/keyboard control + window management
 * - xdg-open — launch applications and files
 * - scrot / import (ImageMagick) — screenshots
 * - wmctrl — advanced window management (optional)
 * - xrandr — screen size detection
 */

import { execFile } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readFile, unlink } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import type {
  DeviceBackend,
  KeyModifier,
  MouseButton,
  Point,
  ScreenRegion,
  ScreenSize,
  ScrollDirection,
  WindowInfo,
} from "./types.js";

// ---------------------------------------------------------------------------
// Helper: run a command and return stdout
// ---------------------------------------------------------------------------

function exec(cmd: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { timeout: 10_000 }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(`${cmd} ${args.join(" ")} failed: ${stderr || error.message}`));
        return;
      }
      resolve(stdout.trim());
    });
  });
}

function execSilent(cmd: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { timeout: 10_000 }, (error) => {
      if (error) reject(new Error(`${cmd} failed: ${error.message}`));
      else resolve();
    });
  });
}

// ---------------------------------------------------------------------------
// Key mapping: standard names → xdotool key names
// ---------------------------------------------------------------------------

const KEY_MAP: Record<string, string> = {
  enter: "Return",
  return: "Return",
  tab: "Tab",
  escape: "Escape",
  esc: "Escape",
  backspace: "BackSpace",
  delete: "Delete",
  space: "space",
  up: "Up",
  down: "Down",
  left: "Left",
  right: "Right",
  home: "Home",
  end: "End",
  pageup: "Prior",
  pagedown: "Next",
  f1: "F1", f2: "F2", f3: "F3", f4: "F4",
  f5: "F5", f6: "F6", f7: "F7", f8: "F8",
  f9: "F9", f10: "F10", f11: "F11", f12: "F12",
};

const MODIFIER_MAP: Record<KeyModifier, string> = {
  ctrl: "ctrl",
  alt: "alt",
  shift: "shift",
  meta: "super",
  super: "super",
};

function mapKey(key: string): string {
  return KEY_MAP[key.toLowerCase()] ?? key;
}

function mapButton(button?: MouseButton): string {
  switch (button) {
    case "right": return "3";
    case "middle": return "2";
    default: return "1";
  }
}

// ---------------------------------------------------------------------------
// Linux Backend
// ---------------------------------------------------------------------------

export class LinuxBackend implements DeviceBackend {
  readonly platform = "linux" as const;

  // --- Mouse ---

  async mouseMoveTo(x: number, y: number): Promise<void> {
    await exec("xdotool", ["mousemove", "--sync", String(x), String(y)]);
  }

  async mouseClick(x: number, y: number, button?: MouseButton): Promise<void> {
    await exec("xdotool", [
      "mousemove", "--sync", String(x), String(y),
      "click", mapButton(button),
    ]);
  }

  async mouseDoubleClick(x: number, y: number): Promise<void> {
    await exec("xdotool", [
      "mousemove", "--sync", String(x), String(y),
      "click", "--repeat", "2", "--delay", "80", "1",
    ]);
  }

  async mouseRightClick(x: number, y: number): Promise<void> {
    await this.mouseClick(x, y, "right");
  }

  async mouseDrag(from: Point, to: Point): Promise<void> {
    await exec("xdotool", [
      "mousemove", "--sync", String(from.x), String(from.y),
      "mousedown", "1",
    ]);
    // Smooth drag in steps
    const steps = 10;
    for (let i = 1; i <= steps; i++) {
      const ratio = i / steps;
      const cx = Math.round(from.x + (to.x - from.x) * ratio);
      const cy = Math.round(from.y + (to.y - from.y) * ratio);
      await exec("xdotool", ["mousemove", "--sync", String(cx), String(cy)]);
    }
    await exec("xdotool", ["mouseup", "1"]);
  }

  async mouseScroll(direction: ScrollDirection, amount: number = 3): Promise<void> {
    const button = direction === "up" ? "4" : direction === "down" ? "5"
      : direction === "left" ? "6" : "7";
    await exec("xdotool", ["click", "--repeat", String(amount), button]);
  }

  // --- Keyboard ---

  async typeText(text: string): Promise<void> {
    await exec("xdotool", ["type", "--delay", "40", "--clearmodifiers", text]);
  }

  async pressKey(key: string): Promise<void> {
    await exec("xdotool", ["key", "--clearmodifiers", mapKey(key)]);
  }

  async hotkey(modifiers: KeyModifier[], key: string): Promise<void> {
    const combo = [
      ...modifiers.map((m) => MODIFIER_MAP[m]),
      mapKey(key),
    ].join("+");
    await exec("xdotool", ["key", "--clearmodifiers", combo]);
  }

  // --- Applications ---

  async openApp(appName: string): Promise<void> {
    await execSilent("xdg-open", [appName]).catch(async () => {
      // Fallback: try running directly
      await execSilent(appName.toLowerCase(), []);
    });
  }

  async openFile(filePath: string): Promise<void> {
    await execSilent("xdg-open", [filePath]);
  }

  async openUrl(url: string): Promise<void> {
    await execSilent("xdg-open", [url]);
  }

  // --- Windows ---

  async listWindows(): Promise<WindowInfo[]> {
    try {
      const output = await exec("wmctrl", ["-l", "-G"]);
      const lines = output.split("\n").filter(Boolean);
      const activeId = await exec("xdotool", ["getactivewindow"]).catch(() => "");

      return lines.map((line) => {
        const parts = line.split(/\s+/);
        const id = parts[0] ?? "";
        // wmctrl format: id desktop x y w h hostname title...
        const x = parseInt(parts[2] ?? "0", 10);
        const y = parseInt(parts[3] ?? "0", 10);
        const width = parseInt(parts[4] ?? "0", 10);
        const height = parseInt(parts[5] ?? "0", 10);
        const title = parts.slice(7).join(" ");
        const hexId = id.startsWith("0x") ? parseInt(id, 16).toString() : id;

        return {
          id,
          title,
          appName: title.split(" - ").pop() ?? title,
          bounds: { x, y, width, height },
          focused: hexId === activeId,
        };
      });
    } catch {
      // Fallback without wmctrl
      const output = await exec("xdotool", ["search", "--name", ""]);
      const ids = output.split("\n").filter(Boolean);
      const activeId = await exec("xdotool", ["getactivewindow"]).catch(() => "");

      const windows: WindowInfo[] = [];
      for (const id of ids.slice(0, 20)) {
        try {
          const name = await exec("xdotool", ["getwindowname", id]);
          if (name) {
            windows.push({
              id,
              title: name,
              appName: name.split(" - ").pop() ?? name,
              focused: id === activeId,
            });
          }
        } catch {
          // Skip inaccessible windows
        }
      }
      return windows;
    }
  }

  async focusWindow(titleOrId: string): Promise<void> {
    try {
      // Try as window ID first
      await exec("xdotool", ["windowactivate", "--sync", titleOrId]);
    } catch {
      // Search by title
      const id = await exec("xdotool", ["search", "--name", titleOrId]);
      const firstId = id.split("\n")[0];
      if (firstId) {
        await exec("xdotool", ["windowactivate", "--sync", firstId]);
      }
    }
  }

  async minimizeWindow(titleOrId?: string): Promise<void> {
    if (titleOrId) {
      await this.focusWindow(titleOrId);
    }
    await exec("xdotool", ["getactivewindow", "windowminimize"]);
  }

  async maximizeWindow(titleOrId?: string): Promise<void> {
    if (titleOrId) {
      await this.focusWindow(titleOrId);
    }
    try {
      await exec("wmctrl", ["-r", ":ACTIVE:", "-b", "add,maximized_vert,maximized_horz"]);
    } catch {
      await exec("xdotool", ["key", "super+Up"]);
    }
  }

  async closeWindow(titleOrId?: string): Promise<void> {
    if (titleOrId) {
      await this.focusWindow(titleOrId);
    }
    await exec("xdotool", ["getactivewindow", "windowclose"]);
  }

  // --- Screen ---

  async captureScreen(): Promise<Buffer> {
    const tmpPath = join(tmpdir(), `screen-${randomUUID()}.png`);
    try {
      try {
        await exec("scrot", ["-o", tmpPath]);
      } catch {
        // Fallback to ImageMagick
        await exec("import", ["-window", "root", tmpPath]);
      }
      return await readFile(tmpPath);
    } finally {
      await unlink(tmpPath).catch(() => {});
    }
  }

  async captureRegion(region: ScreenRegion): Promise<Buffer> {
    const tmpPath = join(tmpdir(), `region-${randomUUID()}.png`);
    const geometry = `${region.width}x${region.height}+${region.x}+${region.y}`;
    try {
      try {
        await exec("scrot", ["-a", `${region.x},${region.y},${region.width},${region.height}`, "-o", tmpPath]);
      } catch {
        await exec("import", ["-window", "root", "-crop", geometry, tmpPath]);
      }
      return await readFile(tmpPath);
    } finally {
      await unlink(tmpPath).catch(() => {});
    }
  }

  async getScreenSize(): Promise<ScreenSize> {
    try {
      const output = await exec("xrandr", ["--current"]);
      const match = output.match(/current (\d+) x (\d+)/);
      if (match) {
        return { width: parseInt(match[1]!, 10), height: parseInt(match[2]!, 10) };
      }
    } catch {
      // fallback
    }
    const output = await exec("xdotool", ["getdisplaygeometry"]);
    const [w, h] = output.split(" ").map(Number);
    return { width: w ?? 1920, height: h ?? 1080 };
  }

  // --- Utilities ---

  async checkDependencies(): Promise<{ available: boolean; missing: string[] }> {
    const deps = ["xdotool", "xdg-open", "xrandr"];
    const optional = ["scrot", "wmctrl"];
    const missing: string[] = [];

    for (const dep of deps) {
      try {
        await exec("which", [dep]);
      } catch {
        missing.push(dep);
      }
    }

    for (const dep of optional) {
      try {
        await exec("which", [dep]);
      } catch {
        // Optional — log but don't fail
      }
    }

    return { available: missing.length === 0, missing };
  }
}
