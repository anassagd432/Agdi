export interface LogEntry {
  id: string;
  timestamp: string;
  level: "info" | "warn" | "error" | "thought" | "action";
  message: string;
}

export interface AgentStatus {
  status: "idle" | "running" | "paused" | "offline";
  activeTasks: number;
}

export interface GatewayEvent {
  type: string;
  data?: Record<string, unknown>;
  ts: number;
}

/**
 * Resolve the gateway auth token.
 * Reads from a meta tag injected server-side, then falls back to env-based defaults.
 */
function resolveGatewayToken(): string {
  if (typeof document !== "undefined") {
    const meta = document.querySelector('meta[name="agdi-gw-token"]');
    if (meta) return meta.getAttribute("content") ?? "";
  }
  return "local-dev-token";
}

/**
 * Read the CSRF token from the cookie (needed for API mutations).
 */
export function getCsrfToken(): string {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(/(?:^|;\s*)agdi-csrf=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : "";
}

/**
 * Resolve the WebSocket URL for the gateway.
 * Uses NEXT_PUBLIC_WS_URL env var (set in Docker compose), falls back to localhost.
 */
function getWsUrl(): string {
  if (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_WS_URL) {
    return process.env.NEXT_PUBLIC_WS_URL;
  }
  return "ws://127.0.0.1:18789/ws";
}

class AgdiClient {
  private ws: WebSocket | null = null;
  private listeners: Set<(log: LogEntry) => void> = new Set();
  private eventListeners: Map<string, Set<(event: GatewayEvent) => void>> = new Map();
  public status: AgentStatus = { status: "offline", activeTasks: 0 };
  private messageIdCounter = 1;
  private pendingRequests: Map<
    string,
    { resolve: (val: any) => void; reject: (err: any) => void; ts: number }
  > = new Map();
  private handshakePromise: Promise<void> | null = null;
  private resolveHandshake: (() => void) | null = null;
  private connectId: string | null = null;
  private intentionalClose = false;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private lastPong = 0;
  private staleCheckInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.connect();
  }

  private connect() {
    if (typeof window === "undefined") return;

    try {
      this.intentionalClose = false;
      this.ws = new WebSocket(getWsUrl());

      this.ws.onopen = () => {
        this.status = { status: "idle", activeTasks: 0 };
        this.lastPong = Date.now();
        this.emit({
          level: "info",
          message: "Connected to Agdi Gateway",
        });
        this.dispatchEvent({ type: "gateway:connected", ts: Date.now() });

        this.startHeartbeat();

        this.connectId = `req-${this.messageIdCounter++}`;
        this.handshakePromise = new Promise((resolve, reject) => {
          this.resolveHandshake = resolve;
          this.pendingRequests.set(this.connectId!, {
            resolve: () => {},
            reject: (err) => {
              this.handshakePromise = null;
              console.warn("Connect handshake failed", err);
              this.emit({
                level: "error",
                message: "Gateway handshake rejected.",
              });
              reject(err);
            },
            ts: Date.now(),
          });

          setTimeout(() => {
            if (
              this.connectId &&
              this.pendingRequests.has(this.connectId)
            ) {
              this.pendingRequests
                .get(this.connectId)!
                .reject(new Error("Handshake timeout"));
              this.pendingRequests.delete(this.connectId);
            }
          }, 10000);
        });

        const token = resolveGatewayToken();

        this.ws!.send(
          JSON.stringify({
            type: "req",
            id: this.connectId,
            method: "connect",
            params: {
              minProtocol: 3,
              maxProtocol: 3,
              client: {
                id: "agdi-control-ui",
                displayName: "Web Dashboard UI",
                version: "1.0.0",
                platform: "web",
                mode: "ui",
              },
              auth: { token },
              caps: [],
            },
          }),
        );
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          // Track activity for heartbeat
          this.lastPong = Date.now();

          if (data.type === "hello-ok") {
            if (this.resolveHandshake) {
              this.resolveHandshake();
              this.resolveHandshake = null;
            }
            if (this.connectId) {
              this.pendingRequests.delete(this.connectId);
              this.connectId = null;
            }
            this.emit({
              level: "info",
              message: "Gateway handshake verified.",
            });
            return;
          }

          // Pong response from heartbeat
          if (data.type === "pong" || data.method === "pong") {
            return;
          }

          // Handle RPC responses
          if (
            data.type === "res" &&
            data.id !== undefined &&
            this.pendingRequests.has(data.id)
          ) {
            const req = this.pendingRequests.get(data.id)!;
            if (!data.ok || data.error) {
              req.reject(data.error);
            } else {
              req.resolve(data.payload);
            }
            this.pendingRequests.delete(data.id);
            return;
          }

          // Handle server-pushed events
          if (
            data.type === "event" ||
            data.method === "tick" ||
            data.method === "event"
          ) {
            const eventType = data.params?.event || data.method || "unknown";
            this.dispatchEvent({
              type: eventType,
              data: data.params || data,
              ts: Date.now(),
            });
            this.emit({
              level: "info",
              message: `[Event] ${JSON.stringify(data.params || data)}`,
            });
          }
        } catch (err) {
          console.error("Failed to parse WS message", err);
        }
      };

      this.ws.onclose = () => {
        this.status = { status: "offline", activeTasks: 0 };
        this.handshakePromise = null;
        this.stopHeartbeat();
        this.dispatchEvent({ type: "gateway:disconnected", ts: Date.now() });

        if (this.intentionalClose) return;

        this.emit({
          level: "warn",
          message:
            "Disconnected from Agdi Gateway. Reconnecting in 5s...",
        });
        setTimeout(() => this.connect(), 5000);
      };

      this.ws.onerror = (err) => {
        console.warn("WS Error:", err);
      };
    } catch (e) {
      console.warn("Failed to construct WebSocket:", e);
    }
  }

  // ── Heartbeat ──────────────────────────────────────────────────────────

  private startHeartbeat() {
    this.stopHeartbeat();

    // Send ping every 30 seconds
    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        try {
          this.ws.send(JSON.stringify({ type: "ping" }));
        } catch {
          // ignore send errors during heartbeat
        }
      }
    }, 30000);

    // Check for stale connections every 15 seconds
    this.staleCheckInterval = setInterval(() => {
      const now = Date.now();

      // If no pong in 60s, reconnect
      if (now - this.lastPong > 60000 && this.ws) {
        this.emit({
          level: "warn",
          message: "WS heartbeat timeout — reconnecting...",
        });
        this.ws.close();
        return;
      }

      // Clean up stale pending requests (>30s old)
      for (const [id, req] of Array.from(this.pendingRequests)) {
        if (now - req.ts > 30000) {
          req.reject(new Error("Request timed out (stale cleanup)"));
          this.pendingRequests.delete(id);
        }
      }
    }, 15000);
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    if (this.staleCheckInterval) {
      clearInterval(this.staleCheckInterval);
      this.staleCheckInterval = null;
    }
  }

  // ── RPC ────────────────────────────────────────────────────────────────

  public async call(method: string, params: any = {}): Promise<any> {
    if (method !== "connect" && this.handshakePromise) {
      await this.handshakePromise;
    }

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error("AgdiClient WebSocket is not connected.");
    }

    const id = `req-${this.messageIdCounter++}`;

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject, ts: Date.now() });

      const payload = { type: "req", id, method, params };
      this.ws!.send(JSON.stringify(payload));

      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests
            .get(id)!
            .reject(new Error(`RPC call ${method} timed out.`));
          this.pendingRequests.delete(id);
        }
      }, 15000);
    });
  }

  /**
   * Send a message to an agent and wait for response (longer timeout).
   */
  public async sendMessage(
    agentId: string,
    message: string,
    opts?: { model?: string },
  ): Promise<any> {
    // Agent messaging can take up to 120s for complex tasks
    if (this.handshakePromise) await this.handshakePromise;

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error("AgdiClient WebSocket is not connected.");
    }

    const id = `msg-${this.messageIdCounter++}`;

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject, ts: Date.now() });

      const payload = {
        type: "req",
        id,
        method: "agents.message",
        params: { agentId, message, ...opts },
      };
      this.ws!.send(JSON.stringify(payload));

      // 120s timeout for agent responses
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests
            .get(id)!
            .reject(new Error("Agent response timed out after 120s."));
          this.pendingRequests.delete(id);
        }
      }, 120_000);
    });
  }

  /**
   * Fetch agent's message history.
   */
  public async getHistory(
    agentId: string,
    limit = 50,
  ): Promise<any> {
    return this.call("agents.history", { agentId, limit });
  }

  public subscribe(callback: (log: LogEntry) => void) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Subscribe to typed gateway events.
   * Use '*' to receive all events.
   */
  public onEvent(type: string, callback: (event: GatewayEvent) => void): () => void {
    if (!this.eventListeners.has(type)) {
      this.eventListeners.set(type, new Set());
    }
    this.eventListeners.get(type)!.add(callback);
    return () => {
      this.eventListeners.get(type)?.delete(callback);
    };
  }

  private dispatchEvent(event: GatewayEvent) {
    // Notify specific type listeners
    this.eventListeners.get(event.type)?.forEach((cb) => cb(event));
    // Notify wildcard listeners
    this.eventListeners.get("*")?.forEach((cb) => cb(event));
  }

  private emit(log: Omit<LogEntry, "id" | "timestamp">) {
    const entry: LogEntry = {
      ...log,
      id: Math.random().toString(36).substring(7),
      timestamp: new Date().toLocaleTimeString(),
    };
    this.listeners.forEach((cb) => cb(entry));
  }

  /**
   * Cleanly close the WebSocket and prevent reconnection.
   */
  public destroy() {
    this.intentionalClose = true;
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.listeners.clear();
    this.pendingRequests.forEach(({ reject }) =>
      reject(new Error("Client destroyed")),
    );
    this.pendingRequests.clear();
    this.handshakePromise = null;
    this.status = { status: "offline", activeTasks: 0 };
  }
}

export const agdi = new AgdiClient();
