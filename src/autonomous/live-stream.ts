/**
 * Desktop Live Stream — broadcasts screenshots at configurable FPS.
 *
 * Takes full-desktop screenshots via DeviceController and streams them
 * as base64-encoded JPEG frames over WebSocket. Used by the dashboard
 * for the "watch mode" feature.
 */

import type { DeviceController } from "./device-controller.js";
import { createSubsystemLogger } from "../logging/subsystem.js";

const log = createSubsystemLogger("live-stream");

export type LiveStreamFrame = {
  type: "desktop_frame";
  data: string; // base64 JPEG
  timestamp: number;
  width: number;
  height: number;
  cursor?: { x: number; y: number };
};

export type LiveStreamOverlay = {
  type: "agent_overlay";
  thinking: string; // Current agent reasoning
  action: string; // Current or next action description
  confidence: number;
  state: string; // Agent state (planning, executing, etc.)
  timestamp: number;
};

export type StreamConfig = {
  fps: number; // Frames per second (1-10)
  quality: number; // JPEG quality (10-100)
  maxWidth: number; // Max frame width (resize if larger)
  enabled: boolean;
};

const DEFAULT_CONFIG: StreamConfig = {
  fps: 3,
  quality: 60,
  maxWidth: 1280,
  enabled: true,
};

export class DesktopLiveStream {
  private controller: DeviceController | null = null;
  private config: StreamConfig;
  private timer: ReturnType<typeof setInterval> | null = null;
  private listeners: Set<(frame: LiveStreamFrame | LiveStreamOverlay) => void> = new Set();
  private frameCount = 0;
  private _running = false;

  constructor(config?: Partial<StreamConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /** Start streaming desktop screenshots. */
  async start(controller: DeviceController): Promise<void> {
    if (this._running) return;
    this.controller = controller;
    this._running = true;

    const intervalMs = Math.round(1000 / this.config.fps);
    log.info(`starting desktop stream at ${this.config.fps} FPS (${intervalMs}ms interval)`);

    this.timer = setInterval(() => {
      void this.captureFrame();
    }, intervalMs);
  }

  /** Stop streaming. */
  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this._running = false;
    this.listeners.clear();
    log.info(`stream stopped after ${this.frameCount} frames`);
  }

  /** Subscribe to frame updates. */
  onFrame(listener: (frame: LiveStreamFrame | LiveStreamOverlay) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Send an agent thinking/action overlay to viewers. */
  sendOverlay(overlay: Omit<LiveStreamOverlay, "type" | "timestamp">): void {
    const msg: LiveStreamOverlay = {
      type: "agent_overlay",
      timestamp: Date.now(),
      ...overlay,
    };
    for (const listener of Array.from(this.listeners)) {
      try {
        listener(msg);
      } catch {
        /* skip */
      }
    }
  }

  /** Adjust stream quality on the fly. */
  setConfig(updates: Partial<StreamConfig>): void {
    const needsRestart = updates.fps !== undefined && updates.fps !== this.config.fps;
    this.config = { ...this.config, ...updates };

    if (needsRestart && this._running && this.controller) {
      this.stop();
      // Restart will be handled by the caller
    }
  }

  get running(): boolean {
    return this._running;
  }

  get stats() {
    return {
      running: this._running,
      fps: this.config.fps,
      quality: this.config.quality,
      frameCount: this.frameCount,
      viewerCount: this.listeners.size,
    };
  }

  // -------------------------------------------------------------------------
  // Private
  // -------------------------------------------------------------------------

  private async captureFrame(): Promise<void> {
    if (!this.controller || !this._running) return;

    try {
      const screenshot = await this.controller.captureScreen();
      const base64 = screenshot.toString("base64");
      const size = await this.controller.getScreenSize();

      this.frameCount++;

      const frame: LiveStreamFrame = {
        type: "desktop_frame",
        data: base64,
        timestamp: Date.now(),
        width: size.width,
        height: size.height,
      };

      for (const listener of Array.from(this.listeners)) {
        try {
          listener(frame);
        } catch {
          /* skip failed listeners */
        }
      }
    } catch (err) {
      // Don't spam logs — screenshot can fail if screen is locked etc.
      if (this.frameCount % 30 === 0) {
        log.warn(`frame capture failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }
}
