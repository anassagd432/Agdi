import { spawn, type ChildProcess } from "node:child_process";
import * as readline from "node:readline";
import type { JsonRpcRequest, JsonRpcResponse, McpServerConfig, McpTool, McpToolCallResult } from "./types.js";

export class McpClient {
  private readonly config: McpServerConfig;
  private process: ChildProcess | null = null;
  private requestId = 1;
  private pendingRequests: Map<
    number | string,
    {
      resolve: (value: unknown) => void;
      reject: (err: Error) => void;
    }
  > = new Map();
  private initialized = false;

  constructor(config: McpServerConfig) {
    this.config = config;
  }

  public async connect(): Promise<void> {
    if (this.process) return;

    if (!this.config.command) {
      throw new Error(`MCP server '${this.config.id}' does not specify an execution command.`);
    }

    this.process = spawn(this.config.command, this.config.args ?? [], {
      env: { ...process.env, ...(this.config.env ?? {}) },
      stdio: ["pipe", "pipe", "pipe"],
      shell: false,
    });

    if (!this.process.stdout || !this.process.stdin) {
      throw new Error(`Failed to initialize stdio for MCP server '${this.config.id}'.`);
    }

    const rl = readline.createInterface({
      input: this.process.stdout,
      terminal: false,
    });

    rl.on("line", (line) => {
      this.handleIncomingLine(line);
    });

    this.process.on("error", (err) => {
      for (const req of this.pendingRequests.values()) {
        req.reject(err);
      }
      this.pendingRequests.clear();
    });

    this.process.on("exit", (code) => {
      if (code !== 0 && code !== null) {
        const exitErr = new Error(`MCP process exited with code ${code}`);
        for (const req of this.pendingRequests.values()) {
          req.reject(exitErr);
        }
        this.pendingRequests.clear();
      }
    });

    // Send initialize request per MCP specification
    const initResult = await this.sendRequest("initialize", {
      protocolVersion: "2024-11-05",
      capabilities: {
        roots: { listChanged: true },
        sampling: {},
      },
      clientInfo: {
        name: "agdi-mcp-client",
        version: "1.0.0",
      },
    });

    // Send initialized notification
    this.sendNotification("notifications/initialized");
    this.initialized = true;
  }

  private handleIncomingLine(line: string): void {
    const trimmed = line.trim();
    if (!trimmed) return;

    try {
      const response = JSON.parse(trimmed) as JsonRpcResponse;
      if (response.id !== undefined && this.pendingRequests.has(response.id)) {
        const handler = this.pendingRequests.get(response.id)!;
        this.pendingRequests.delete(response.id);

        if (response.error) {
          handler.reject(new Error(`MCP Error ${response.error.code}: ${response.error.message}`));
        } else {
          handler.resolve(response.result);
        }
      }
    } catch {
      // ignore non-JSON or debug lines
    }
  }

  public sendRequest<T = unknown>(method: string, params?: Record<string, unknown>): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!this.process || !this.process.stdin) {
        return reject(new Error("MCP client not connected."));
      }

      const id = this.requestId++;
      const req: JsonRpcRequest = {
        jsonrpc: "2.0",
        id,
        method,
        params,
      };

      this.pendingRequests.set(id, {
        resolve: (val) => resolve(val as T),
        reject,
      });

      this.process.stdin.write(JSON.stringify(req) + "\n");
    });
  }

  public sendNotification(method: string, params?: Record<string, unknown>): void {
    if (!this.process || !this.process.stdin) return;
    const notif = {
      jsonrpc: "2.0",
      method,
      params,
    };
    this.process.stdin.write(JSON.stringify(notif) + "\n");
  }

  public async listTools(): Promise<McpTool[]> {
    const result = await this.sendRequest<{ tools: McpTool[] }>("tools/list");
    return result.tools ?? [];
  }

  public async callTool(name: string, toolArgs?: Record<string, unknown>): Promise<McpToolCallResult> {
    const result = await this.sendRequest<McpToolCallResult>("tools/call", {
      name,
      arguments: toolArgs ?? {},
    });
    return result;
  }

  public close(): void {
    if (this.process) {
      try {
        if (this.process.stdin && !this.process.stdin.destroyed) {
          this.process.stdin.end();
        }
        this.process.kill();
      } catch {
        // ignore
      }
      this.process = null;
    }
    this.pendingRequests.clear();
    this.initialized = false;
  }
}
