// ── Agdi Gateway Client ───────────────────────────────────────────────────

const GATEWAY_URL = process.env.NEXT_PUBLIC_GATEWAY_URL || "http://localhost:18789";

class AgdiClient {
  private ws: WebSocket | null = null;
  private listeners: Map<string, Set<(data: unknown) => void>> = new Map();

  get baseUrl() { return GATEWAY_URL; }

  async fetch(path: string, opts?: RequestInit): Promise<Response> {
    return fetch(`${GATEWAY_URL}${path}`, {
      ...opts,
      headers: { "Content-Type": "application/json", ...opts?.headers },
    });
  }

  async getStatus(): Promise<{ connected: boolean; version?: string }> {
    try {
      const r = await this.fetch("/api/status");
      if (r.ok) return { connected: true, ...(await r.json()) };
      return { connected: false };
    } catch { return { connected: false }; }
  }

  async getAgents(): Promise<unknown[]> {
    try {
      const r = await this.fetch("/api/agents");
      if (r.ok) { const d = await r.json(); return d.agents || []; }
      return [];
    } catch { return []; }
  }

  async sendMessage(agentId: string, message: string): Promise<unknown> {
    const r = await this.fetch(`/api/agents/${agentId}/message`, {
      method: "POST",
      body: JSON.stringify({ message }),
    });
    return r.json();
  }

  async getHistory(agentId: string): Promise<unknown[]> {
    try {
      const r = await this.fetch(`/api/agents/${agentId}/history`);
      if (r.ok) { const d = await r.json(); return d.messages || []; }
      return [];
    } catch { return []; }
  }

  connectWs() {
    if (this.ws?.readyState === WebSocket.OPEN) return;
    const wsUrl = GATEWAY_URL.replace(/^http/, "ws") + "/ws";
    this.ws = new WebSocket(wsUrl);
    this.ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        const handlers = this.listeners.get(msg.type);
        if (handlers) handlers.forEach((h) => h(msg.data));
      } catch { /* skip */ }
    };
    this.ws.onclose = () => { setTimeout(() => this.connectWs(), 3000); };
  }

  on(event: string, handler: (data: unknown) => void) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(handler);
    return () => { this.listeners.get(event)?.delete(handler); };
  }
}

export const agdi = new AgdiClient();
