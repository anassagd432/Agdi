/**
 * macOS device backend.
 *
 * Uses:
 * - cliclick — mouse control (coordinates-based click/move/drag)
 * - osascript (AppleScript/JXA) — keyboard, window management, app control
 * - open — launch applications, files, URLs
 * - screencapture — native screenshot tool
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

function osascript(script: string): Promise<string> {
  return exec("osascript", ["-e", script]);
}

// ---------------------------------------------------------------------------
// Key mapping: standard names → AppleScript key codes
// ---------------------------------------------------------------------------

const KEY_CODE_MAP: Record<string, number> = {
  return: 36, enter: 36, tab: 48, escape: 53, esc: 53,
  delete: 51, backspace: 51, forwarddelete: 117,
  space: 49, up: 126, down: 125, left: 123, right: 124,
  home: 115, end: 119, pageup: 116, pagedown: 121,
  f1: 122, f2: 120, f3: 99, f4: 118, f5: 96, f6: 97,
  f7: 98, f8: 100, f9: 101, f10: 109, f11: 103, f12: 111,
};

const MODIFIER_MAP: Record<KeyModifier, string> = {
  ctrl: "control down",
  alt: "option down",
  shift: "shift down",
  meta: "command down",
  super: "command down",
};

function buttonArg(button?: MouseButton): string {
  switch (button) {
    case "right": return "rc";
    case "middle": return "mc";
    default: return "c";
  }
}

// ---------------------------------------------------------------------------
// macOS Backend
// ---------------------------------------------------------------------------

export class MacOSBackend implements DeviceBackend {
  readonly platform = "darwin" as const;

  // --- Mouse (using cliclick) ---

  async mouseMoveTo(x: number, y: number): Promise<void> {
    await exec("cliclick", [`m:${x},${y}`]);
  }

  async mouseClick(x: number, y: number, button?: MouseButton): Promise<void> {
    const action = `${buttonArg(button)}:${x},${y}`;
    await exec("cliclick", [action]);
  }

  async mouseDoubleClick(x: number, y: number): Promise<void> {
    await exec("cliclick", [`dc:${x},${y}`]);
  }

  async mouseRightClick(x: number, y: number): Promise<void> {
    await this.mouseClick(x, y, "right");
  }

  async mouseDrag(from: Point, to: Point): Promise<void> {
    await exec("cliclick", [`dd:${from.x},${from.y}`, `du:${to.x},${to.y}`]);
  }

  async mouseScroll(direction: ScrollDirection, amount: number = 3): Promise<void> {
    // AppleScript scroll via System Events
    const delta = direction === "up" ? amount : -amount;
    // cliclick doesn't support scroll, use AppleScript
    await osascript(`
      tell application "System Events"
        repeat ${Math.abs(delta)} times
          ${direction === "up" || direction === "left" ? 'key code 126 using {option down}' : 'key code 125 using {option down}'}
        end repeat
      end tell
    `).catch(async () => {
      // Fallback: use mouse scroll via cliclick if available
      const scrollDir = direction === "up" || direction === "left" ? "u" : "d";
      for (let i = 0; i < Math.abs(amount); i++) {
        await exec("cliclick", [`scroll:${scrollDir}`]).catch(() => {});
      }
    });
  }

  // --- Keyboard ---

  async typeText(text: string): Promise<void> {
    // Use cliclick for typing (more reliable for special chars)
    try {
      await exec("cliclick", [`t:${text}`]);
    } catch {
      // Fallback to AppleScript
      const escaped = text.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
      await osascript(`
        tell application "System Events"
          keystroke "${escaped}"
        end tell
      `);
    }
  }

  async pressKey(key: string): Promise<void> {
    const keyCode = KEY_CODE_MAP[key.toLowerCase()];
    if (keyCode !== undefined) {
      await osascript(`
        tell application "System Events"
          key code ${keyCode}
        end tell
      `);
    } else {
      // Try as a single character keystroke
      await osascript(`
        tell application "System Events"
          keystroke "${key}"
        end tell
      `);
    }
  }

  async hotkey(modifiers: KeyModifier[], key: string): Promise<void> {
    const modStr = modifiers.map((m) => MODIFIER_MAP[m]).join(", ");
    const keyCode = KEY_CODE_MAP[key.toLowerCase()];

    if (keyCode !== undefined) {
      await osascript(`
        tell application "System Events"
          key code ${keyCode} using {${modStr}}
        end tell
      `);
    } else {
      await osascript(`
        tell application "System Events"
          keystroke "${key}" using {${modStr}}
        end tell
      `);
    }
  }

  // --- Applications ---

  async openApp(appName: string): Promise<void> {
    await execSilent("open", ["-a", appName]);
  }

  async openFile(filePath: string): Promise<void> {
    await execSilent("open", [filePath]);
  }

  async openUrl(url: string): Promise<void> {
    await execSilent("open", [url]);
  }

  // --- Windows ---

  async listWindows(): Promise<WindowInfo[]> {
    const script = `
      set windowList to ""
      tell application "System Events"
        set allProcesses to every process whose visible is true
        repeat with proc in allProcesses
          set procName to name of proc
          try
            set allWindows to every window of proc
            repeat with w in allWindows
              set winTitle to name of w
              set winPos to position of w
              set winSize to size of w
              set windowList to windowList & procName & "|||" & winTitle & "|||" & (item 1 of winPos) & "," & (item 2 of winPos) & "," & (item 1 of winSize) & "," & (item 2 of winSize) & "\\n"
            end repeat
          end try
        end repeat
      end tell
      return windowList
    `;
    const output = await osascript(script);
    const lines = output.split("\n").filter(Boolean);
    const frontApp = await osascript('tell application "System Events" to get name of first process whose frontmost is true').catch(() => "");

    return lines.map((line, idx) => {
      const [appName, title, bounds] = line.split("|||");
      const [x, y, w, h] = (bounds ?? "0,0,0,0").split(",").map(Number);
      return {
        id: String(idx),
        title: title ?? "",
        appName: appName ?? "",
        bounds: { x: x ?? 0, y: y ?? 0, width: w ?? 0, height: h ?? 0 },
        focused: appName === frontApp,
      };
    });
  }

  async focusWindow(titleOrId: string): Promise<void> {
    // Try activating by app name first
    await osascript(`
      tell application "${titleOrId}" to activate
    `).catch(async () => {
      // Search by window title
      await osascript(`
        tell application "System Events"
          set targetProc to first process whose visible is true and (name of first window contains "${titleOrId}")
          set frontmost of targetProc to true
        end tell
      `);
    });
  }

  async minimizeWindow(titleOrId?: string): Promise<void> {
    if (titleOrId) await this.focusWindow(titleOrId);
    await osascript(`
      tell application "System Events"
        set frontProc to first process whose frontmost is true
        click (first button of first window of frontProc whose subrole is "AXMinimizeButton")
      end tell
    `).catch(async () => {
      await this.hotkey(["meta"], "m");
    });
  }

  async maximizeWindow(titleOrId?: string): Promise<void> {
    if (titleOrId) await this.focusWindow(titleOrId);
    await osascript(`
      tell application "System Events"
        set frontProc to first process whose frontmost is true
        click (first button of first window of frontProc whose subrole is "AXFullScreenButton")
      end tell
    `).catch(async () => {
      await this.hotkey(["meta", "ctrl"], "f");
    });
  }

  async closeWindow(titleOrId?: string): Promise<void> {
    if (titleOrId) await this.focusWindow(titleOrId);
    await this.hotkey(["meta"], "w");
  }

  // --- Screen ---

  async captureScreen(): Promise<Buffer> {
    const tmpPath = join(tmpdir(), `screen-${randomUUID()}.png`);
    try {
      await exec("screencapture", ["-x", tmpPath]);
      return await readFile(tmpPath);
    } finally {
      await unlink(tmpPath).catch(() => {});
    }
  }

  async captureRegion(region: ScreenRegion): Promise<Buffer> {
    const tmpPath = join(tmpdir(), `region-${randomUUID()}.png`);
    try {
      await exec("screencapture", [
        "-x",
        "-R", `${region.x},${region.y},${region.width},${region.height}`,
        tmpPath,
      ]);
      return await readFile(tmpPath);
    } finally {
      await unlink(tmpPath).catch(() => {});
    }
  }

  async getScreenSize(): Promise<ScreenSize> {
    const output = await osascript(`
      tell application "Finder"
        set screenBounds to bounds of window of desktop
        return (item 3 of screenBounds) & "," & (item 4 of screenBounds)
      end tell
    `);
    const [w, h] = output.split(",").map(Number);
    return { width: w ?? 1920, height: h ?? 1080 };
  }

  // --- Utilities ---

  async checkDependencies(): Promise<{ available: boolean; missing: string[] }> {
    const missing: string[] = [];

    // cliclick is required for mouse control
    try { await exec("which", ["cliclick"]); } catch { missing.push("cliclick"); }

    // osascript is built into macOS
    try { await exec("which", ["osascript"]); } catch { missing.push("osascript"); }

    // screencapture is built into macOS
    try { await exec("which", ["screencapture"]); } catch { missing.push("screencapture"); }

    return { available: missing.length === 0, missing };
  }
}
