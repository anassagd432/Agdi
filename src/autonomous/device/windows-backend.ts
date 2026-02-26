/**
 * Windows device backend.
 *
 * Uses PowerShell with .NET / Win32 APIs:
 * - System.Windows.Forms — mouse/keyboard simulation (SendKeys, Cursor)
 * - Add-Type + user32.dll — native mouse events, window management
 * - Start-Process — launch applications
 * - System.Drawing — screenshots
 */

import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readFile, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
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
// Helper: run PowerShell commands
// ---------------------------------------------------------------------------

function powershell(script: string): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-Command", script],
      { timeout: 15_000 },
      (error, stdout, stderr) => {
        if (error) {
          reject(new Error(`PowerShell failed: ${stderr || error.message}`));
          return;
        }
        resolve(stdout.trim());
      },
    );
  });
}

function exec(cmd: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { timeout: 10_000 }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(`${cmd} failed: ${stderr || error.message}`));
        return;
      }
      resolve(stdout.trim());
    });
  });
}

// ---------------------------------------------------------------------------
// PowerShell snippets for mouse/keyboard via user32.dll
// ---------------------------------------------------------------------------

const ADD_TYPE_INPUT = `
Add-Type @"
using System;
using System.Runtime.InteropServices;

public class DeviceInput {
    [DllImport("user32.dll")]
    public static extern void SetCursorPos(int x, int y);

    [DllImport("user32.dll")]
    public static extern void mouse_event(uint dwFlags, int dx, int dy, int dwData, int dwExtraInfo);

    [DllImport("user32.dll")]
    public static extern IntPtr GetForegroundWindow();

    [DllImport("user32.dll")]
    public static extern bool SetForegroundWindow(IntPtr hWnd);

    [DllImport("user32.dll")]
    public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);

    [DllImport("user32.dll", CharSet = CharSet.Auto)]
    public static extern int GetWindowText(IntPtr hWnd, System.Text.StringBuilder lpString, int nMaxCount);

    [DllImport("user32.dll")]
    public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);

    [DllImport("user32.dll")]
    public static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);

    [DllImport("user32.dll")]
    public static extern bool IsWindowVisible(IntPtr hWnd);

    public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);

    [StructLayout(LayoutKind.Sequential)]
    public struct RECT {
        public int Left, Top, Right, Bottom;
    }

    // Mouse event flags
    public const uint MOUSEEVENTF_LEFTDOWN = 0x0002;
    public const uint MOUSEEVENTF_LEFTUP = 0x0004;
    public const uint MOUSEEVENTF_RIGHTDOWN = 0x0008;
    public const uint MOUSEEVENTF_RIGHTUP = 0x0010;
    public const uint MOUSEEVENTF_MIDDLEDOWN = 0x0020;
    public const uint MOUSEEVENTF_MIDDLEUP = 0x0040;
    public const uint MOUSEEVENTF_WHEEL = 0x0800;

    // ShowWindow constants
    public const int SW_MINIMIZE = 6;
    public const int SW_MAXIMIZE = 3;
    public const int SW_RESTORE = 9;

    public static void Click(int x, int y) {
        SetCursorPos(x, y);
        mouse_event(MOUSEEVENTF_LEFTDOWN, 0, 0, 0, 0);
        mouse_event(MOUSEEVENTF_LEFTUP, 0, 0, 0, 0);
    }

    public static void RightClick(int x, int y) {
        SetCursorPos(x, y);
        mouse_event(MOUSEEVENTF_RIGHTDOWN, 0, 0, 0, 0);
        mouse_event(MOUSEEVENTF_RIGHTUP, 0, 0, 0, 0);
    }

    public static void MiddleClick(int x, int y) {
        SetCursorPos(x, y);
        mouse_event(MOUSEEVENTF_MIDDLEDOWN, 0, 0, 0, 0);
        mouse_event(MOUSEEVENTF_MIDDLEUP, 0, 0, 0, 0);
    }

    public static void Scroll(int amount) {
        mouse_event(MOUSEEVENTF_WHEEL, 0, 0, amount * 120, 0);
    }
}
"@
`;

// ---------------------------------------------------------------------------
// Key mapping: standard names → SendKeys format
// ---------------------------------------------------------------------------

const SENDKEYS_MAP: Record<string, string> = {
  enter: "{ENTER}",
  return: "{ENTER}",
  tab: "{TAB}",
  escape: "{ESC}",
  esc: "{ESC}",
  backspace: "{BACKSPACE}",
  delete: "{DELETE}",
  space: " ",
  up: "{UP}",
  down: "{DOWN}",
  left: "{LEFT}",
  right: "{RIGHT}",
  home: "{HOME}",
  end: "{END}",
  pageup: "{PGUP}",
  pagedown: "{PGDN}",
  f1: "{F1}",
  f2: "{F2}",
  f3: "{F3}",
  f4: "{F4}",
  f5: "{F5}",
  f6: "{F6}",
  f7: "{F7}",
  f8: "{F8}",
  f9: "{F9}",
  f10: "{F10}",
  f11: "{F11}",
  f12: "{F12}",
};

const MODIFIER_PREFIX: Record<KeyModifier, string> = {
  ctrl: "^",
  alt: "%",
  shift: "+",
  meta: "^{ESC}", // Windows key approximation
  super: "^{ESC}",
};

// ---------------------------------------------------------------------------
// Windows Backend
// ---------------------------------------------------------------------------

export class WindowsBackend implements DeviceBackend {
  readonly platform = "win32" as const;

  // --- Mouse ---

  async mouseMoveTo(x: number, y: number): Promise<void> {
    await powershell(`${ADD_TYPE_INPUT}\n[DeviceInput]::SetCursorPos(${x}, ${y})`);
  }

  async mouseClick(x: number, y: number, button?: MouseButton): Promise<void> {
    const method =
      button === "right" ? "RightClick" : button === "middle" ? "MiddleClick" : "Click";
    await powershell(`${ADD_TYPE_INPUT}\n[DeviceInput]::${method}(${x}, ${y})`);
  }

  async mouseDoubleClick(x: number, y: number): Promise<void> {
    await powershell(`${ADD_TYPE_INPUT}
[DeviceInput]::Click(${x}, ${y})
Start-Sleep -Milliseconds 80
[DeviceInput]::Click(${x}, ${y})`);
  }

  async mouseRightClick(x: number, y: number): Promise<void> {
    await this.mouseClick(x, y, "right");
  }

  async mouseDrag(from: Point, to: Point): Promise<void> {
    await powershell(`${ADD_TYPE_INPUT}
[DeviceInput]::SetCursorPos(${from.x}, ${from.y})
[DeviceInput]::mouse_event([DeviceInput]::MOUSEEVENTF_LEFTDOWN, 0, 0, 0, 0)
$steps = 10
for ($i = 1; $i -le $steps; $i++) {
    $ratio = $i / $steps
    $cx = [int](${from.x} + (${to.x} - ${from.x}) * $ratio)
    $cy = [int](${from.y} + (${to.y} - ${from.y}) * $ratio)
    [DeviceInput]::SetCursorPos($cx, $cy)
    Start-Sleep -Milliseconds 20
}
[DeviceInput]::mouse_event([DeviceInput]::MOUSEEVENTF_LEFTUP, 0, 0, 0, 0)`);
  }

  async mouseScroll(direction: ScrollDirection, amount: number = 3): Promise<void> {
    const delta = direction === "up" || direction === "left" ? amount : -amount;
    await powershell(`${ADD_TYPE_INPUT}\n[DeviceInput]::Scroll(${delta})`);
  }

  // --- Keyboard ---

  async typeText(text: string): Promise<void> {
    // Escape special SendKeys characters
    const escaped = text
      .replace(/[+^%~(){}[\]]/g, "{$&}")
      .replace(/\{(\{)\}/g, "{{}") // fix double-brace
      .replace(/\{(\})\}/g, "{}}");
    await powershell(`
Add-Type -AssemblyName System.Windows.Forms
[System.Windows.Forms.SendKeys]::SendWait("${escaped}")
    `);
  }

  async pressKey(key: string): Promise<void> {
    const mapped = SENDKEYS_MAP[key.toLowerCase()] ?? key;
    await powershell(`
Add-Type -AssemblyName System.Windows.Forms
[System.Windows.Forms.SendKeys]::SendWait("${mapped}")
    `);
  }

  async hotkey(modifiers: KeyModifier[], key: string): Promise<void> {
    const modPrefixes = modifiers
      .filter((m) => m !== "meta" && m !== "super")
      .map((m) => MODIFIER_PREFIX[m])
      .join("");
    const mappedKey = SENDKEYS_MAP[key.toLowerCase()] ?? key.toLowerCase();

    // Handle Windows key separately
    if (modifiers.includes("meta") || modifiers.includes("super")) {
      await powershell(`${ADD_TYPE_INPUT}
Add-Type -AssemblyName System.Windows.Forms
# Simulate Win key + other key via keybd_event
[System.Windows.Forms.SendKeys]::SendWait("${modPrefixes}${mappedKey}")
      `);
    } else {
      await powershell(`
Add-Type -AssemblyName System.Windows.Forms
[System.Windows.Forms.SendKeys]::SendWait("${modPrefixes}${mappedKey}")
      `);
    }
  }

  // --- Applications ---

  async openApp(appName: string): Promise<void> {
    await powershell(`Start-Process "${appName}"`);
  }

  async openFile(filePath: string): Promise<void> {
    await powershell(`Start-Process "${filePath}"`);
  }

  async openUrl(url: string): Promise<void> {
    await powershell(`Start-Process "${url}"`);
  }

  // --- Windows ---

  async listWindows(): Promise<WindowInfo[]> {
    const output = await powershell(`${ADD_TYPE_INPUT}
$fg = [DeviceInput]::GetForegroundWindow()
$windows = @()
$callback = [DeviceInput+EnumWindowsProc]{
    param($hWnd, $lParam)
    if ([DeviceInput]::IsWindowVisible($hWnd)) {
        $sb = New-Object System.Text.StringBuilder 256
        [DeviceInput]::GetWindowText($hWnd, $sb, 256) | Out-Null
        $title = $sb.ToString()
        if ($title.Length -gt 0) {
            $rect = New-Object DeviceInput+RECT
            [DeviceInput]::GetWindowRect($hWnd, [ref]$rect) | Out-Null
            $focused = if ($hWnd -eq $fg) { "1" } else { "0" }
            Write-Output "$hWnd|||$title|||$($rect.Left),$($rect.Top),$($rect.Right - $rect.Left),$($rect.Bottom - $rect.Top)|||$focused"
        }
    }
    return $true
}
[DeviceInput]::EnumWindows($callback, [IntPtr]::Zero)
    `);

    return output
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        const [id, title, bounds, focused] = line.split("|||");
        const [x, y, w, h] = (bounds ?? "0,0,0,0").split(",").map(Number);
        return {
          id: id ?? "0",
          title: title ?? "",
          appName: (title ?? "").split(" - ").pop() ?? title ?? "",
          bounds: { x: x ?? 0, y: y ?? 0, width: w ?? 0, height: h ?? 0 },
          focused: focused === "1",
        };
      });
  }

  async focusWindow(titleOrId: string): Promise<void> {
    await powershell(`${ADD_TYPE_INPUT}
$proc = Get-Process | Where-Object { $_.MainWindowTitle -like "*${titleOrId}*" } | Select-Object -First 1
if ($proc) {
    [DeviceInput]::SetForegroundWindow($proc.MainWindowHandle) | Out-Null
} else {
    # Try as raw handle
    try {
        [DeviceInput]::SetForegroundWindow([IntPtr]${titleOrId}) | Out-Null
    } catch {}
}
    `);
  }

  async minimizeWindow(titleOrId?: string): Promise<void> {
    if (titleOrId) await this.focusWindow(titleOrId);
    await powershell(`${ADD_TYPE_INPUT}
$hwnd = [DeviceInput]::GetForegroundWindow()
[DeviceInput]::ShowWindow($hwnd, [DeviceInput]::SW_MINIMIZE) | Out-Null
    `);
  }

  async maximizeWindow(titleOrId?: string): Promise<void> {
    if (titleOrId) await this.focusWindow(titleOrId);
    await powershell(`${ADD_TYPE_INPUT}
$hwnd = [DeviceInput]::GetForegroundWindow()
[DeviceInput]::ShowWindow($hwnd, [DeviceInput]::SW_MAXIMIZE) | Out-Null
    `);
  }

  async closeWindow(titleOrId?: string): Promise<void> {
    if (titleOrId) {
      await powershell(`
$proc = Get-Process | Where-Object { $_.MainWindowTitle -like "*${titleOrId}*" } | Select-Object -First 1
if ($proc) { $proc.CloseMainWindow() | Out-Null }
      `);
    } else {
      await this.hotkey(["alt"], "f4");
    }
  }

  // --- Screen ---

  async captureScreen(): Promise<Buffer> {
    const tmpPath = join(tmpdir(), `screen-${randomUUID()}.png`);
    try {
      await powershell(`
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
$screen = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
$bitmap = New-Object System.Drawing.Bitmap($screen.Width, $screen.Height)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.CopyFromScreen($screen.Location, [System.Drawing.Point]::Empty, $screen.Size)
$bitmap.Save("${tmpPath.replace(/\\/g, "\\\\")}")
$graphics.Dispose()
$bitmap.Dispose()
      `);
      return await readFile(tmpPath);
    } finally {
      await unlink(tmpPath).catch(() => {});
    }
  }

  async captureRegion(region: ScreenRegion): Promise<Buffer> {
    const tmpPath = join(tmpdir(), `region-${randomUUID()}.png`);
    try {
      await powershell(`
Add-Type -AssemblyName System.Drawing
$bitmap = New-Object System.Drawing.Bitmap(${region.width}, ${region.height})
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.CopyFromScreen(${region.x}, ${region.y}, 0, 0, New-Object System.Drawing.Size(${region.width}, ${region.height}))
$bitmap.Save("${tmpPath.replace(/\\/g, "\\\\")}")
$graphics.Dispose()
$bitmap.Dispose()
      `);
      return await readFile(tmpPath);
    } finally {
      await unlink(tmpPath).catch(() => {});
    }
  }

  async getScreenSize(): Promise<ScreenSize> {
    const output = await powershell(`
Add-Type -AssemblyName System.Windows.Forms
$screen = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
Write-Output "$($screen.Width),$($screen.Height)"
    `);
    const [w, h] = output.split(",").map(Number);
    return { width: w ?? 1920, height: h ?? 1080 };
  }

  // --- Utilities ---

  async checkDependencies(): Promise<{ available: boolean; missing: string[] }> {
    const missing: string[] = [];
    try {
      await exec("powershell.exe", ["-NoProfile", "-Command", "echo ok"]);
    } catch {
      missing.push("powershell");
    }
    return { available: missing.length === 0, missing };
  }
}
