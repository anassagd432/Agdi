/**
 * Shared types for cross-platform device control.
 *
 * These interfaces define the contract that each platform backend
 * (Linux, macOS, Windows) must implement.
 */

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

export type MouseButton = "left" | "right" | "middle";

export type ScrollDirection = "up" | "down" | "left" | "right";

export type KeyModifier = "ctrl" | "alt" | "shift" | "meta" | "super";

export type Point = { x: number; y: number };

export type ScreenSize = { width: number; height: number };

export type ScreenRegion = {
  x: number;
  y: number;
  width: number;
  height: number;
};

// ---------------------------------------------------------------------------
// Window info
// ---------------------------------------------------------------------------

export type WindowInfo = {
  id: string;
  title: string;
  appName: string;
  bounds?: ScreenRegion;
  focused: boolean;
};

// ---------------------------------------------------------------------------
// Platform detection
// ---------------------------------------------------------------------------

export type Platform = "linux" | "darwin" | "win32";

export function detectPlatform(): Platform {
  const p = process.platform;
  if (p === "linux" || p === "darwin" || p === "win32") return p;
  throw new Error(`Unsupported platform: ${p}`);
}

// ---------------------------------------------------------------------------
// Device backend interface
// ---------------------------------------------------------------------------

/**
 * Each platform backend implements this interface.
 * All methods are async since they shell out to native tools.
 */
export interface DeviceBackend {
  readonly platform: Platform;

  // --- Mouse ---
  mouseMoveTo(x: number, y: number): Promise<void>;
  mouseClick(x: number, y: number, button?: MouseButton): Promise<void>;
  mouseDoubleClick(x: number, y: number): Promise<void>;
  mouseRightClick(x: number, y: number): Promise<void>;
  mouseDrag(from: Point, to: Point): Promise<void>;
  mouseScroll(direction: ScrollDirection, amount?: number): Promise<void>;

  // --- Keyboard ---
  typeText(text: string): Promise<void>;
  pressKey(key: string): Promise<void>;
  hotkey(modifiers: KeyModifier[], key: string): Promise<void>;

  // --- Applications ---
  openApp(appName: string): Promise<void>;
  openFile(filePath: string): Promise<void>;
  openUrl(url: string): Promise<void>;

  // --- Windows ---
  listWindows(): Promise<WindowInfo[]>;
  focusWindow(titleOrId: string): Promise<void>;
  minimizeWindow(titleOrId?: string): Promise<void>;
  maximizeWindow(titleOrId?: string): Promise<void>;
  closeWindow(titleOrId?: string): Promise<void>;

  // --- Screen ---
  captureScreen(): Promise<Buffer>;
  captureRegion(region: ScreenRegion): Promise<Buffer>;
  getScreenSize(): Promise<ScreenSize>;

  // --- Utilities ---
  checkDependencies(): Promise<{ available: boolean; missing: string[] }>;
}

// ---------------------------------------------------------------------------
// Device action types (for the agent's action system)
// ---------------------------------------------------------------------------

export type DeviceActionType =
  | "device_click"
  | "device_double_click"
  | "device_right_click"
  | "device_type"
  | "device_press_key"
  | "device_hotkey"
  | "device_scroll"
  | "device_drag"
  | "device_open_app"
  | "device_open_file"
  | "device_open_url"
  | "device_focus_window"
  | "device_minimize_window"
  | "device_maximize_window"
  | "device_close_window"
  | "device_screenshot"
  | "device_click_image";

export type DeviceAction = {
  action: DeviceActionType;
  coordinates?: Point;
  toCoordinates?: Point;
  text?: string;
  key?: string;
  modifiers?: KeyModifier[];
  appName?: string;
  filePath?: string;
  url?: string;
  imageTemplatePath?: string;
  windowTitle?: string;
  scrollDirection?: ScrollDirection;
  scrollAmount?: number;
  region?: ScreenRegion;
  confidence: number;
  reasoning: string;
};
