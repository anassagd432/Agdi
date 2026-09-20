import { McpClient } from "./client.js";
import type { McpServerConfig, McpTool, McpToolCallResult } from "./types.js";

export class McpRegistry {
  private servers: Map<string, McpClient> = new Map();
  private toolToServerMap: Map<string, string> = new Map();

  public registerServer(config: McpServerConfig): McpClient {
    if (this.servers.has(config.id)) {
      this.servers.get(config.id)!.close();
    }
    const client = new McpClient(config);
    this.servers.set(config.id, client);
    return client;
  }

  public async connectAll(): Promise<void> {
    for (const [id, client] of this.servers.entries()) {
      try {
        await client.connect();
      } catch (err) {
        console.error(`[McpRegistry] Failed to connect to MCP server '${id}':`, err);
      }
    }
  }

  public async getAllTools(): Promise<Array<McpTool & { serverId: string }>> {
    const allTools: Array<McpTool & { serverId: string }> = [];
    this.toolToServerMap.clear();

    for (const [serverId, client] of this.servers.entries()) {
      try {
        const tools = await client.listTools();
        for (const t of tools) {
          allTools.push({ ...t, serverId });
          this.toolToServerMap.set(t.name, serverId);
        }
      } catch (err) {
        console.error(`[McpRegistry] Failed to list tools from '${serverId}':`, err);
      }
    }

    return allTools;
  }

  public async callTool(toolName: string, args?: Record<string, unknown>): Promise<McpToolCallResult> {
    const serverId = this.toolToServerMap.get(toolName);
    if (!serverId) {
      throw new Error(`Tool '${toolName}' is not registered with any active MCP server.`);
    }

    const client = this.servers.get(serverId);
    if (!client) {
      throw new Error(`MCP server '${serverId}' not available.`);
    }

    return client.callTool(toolName, args);
  }

  public closeAll(): void {
    for (const client of this.servers.values()) {
      client.close();
    }
    this.servers.clear();
    this.toolToServerMap.clear();
  }
}
