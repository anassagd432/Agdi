/**
 * Plugin system for the autonomous agent.
 *
 * Allows users to define custom tools/actions that the agent can use.
 * Plugins can extend the agent with API calls, file operations,
 * custom browser actions, and more.
 */

import type { Page } from "playwright-core";
import { readFile, readdir } from "node:fs/promises";
import { join, extname } from "node:path";
import type { Action, Goal } from "./types.js";

// ---------------------------------------------------------------------------
// Plugin interface
// ---------------------------------------------------------------------------

export type PluginContext = {
  page: Page;
  goal: Goal | null;
  dataDir: string;
  log: (message: string) => void;
};

export type PluginAction = {
  name: string;
  description: string;
  parameters?: Record<string, { type: string; description: string; required?: boolean }>;
  execute: (params: Record<string, unknown>, ctx: PluginContext) => Promise<PluginResult>;
};

export type PluginResult = {
  success: boolean;
  output?: string;
  screenshot?: Buffer;
  data?: unknown;
};

export type AgentPlugin = {
  name: string;
  version: string;
  description: string;
  actions: PluginAction[];
  setup?: (ctx: PluginContext) => Promise<void>;
  teardown?: () => Promise<void>;
};

export type PluginManifest = {
  name: string;
  version: string;
  description: string;
  entry: string;
  actions: string[];
};

// ---------------------------------------------------------------------------
// Plugin Registry
// ---------------------------------------------------------------------------

export class PluginRegistry {
  private plugins: Map<string, AgentPlugin> = new Map();
  private actionIndex: Map<string, { plugin: string; action: PluginAction }> = new Map();

  /** Register a plugin programmatically. */
  register(plugin: AgentPlugin): void {
    if (this.plugins.has(plugin.name)) {
      throw new Error(`Plugin "${plugin.name}" is already registered`);
    }

    this.plugins.set(plugin.name, plugin);

    // Index actions for fast lookup
    for (const action of plugin.actions) {
      const key = `${plugin.name}:${action.name}`;
      this.actionIndex.set(key, { plugin: plugin.name, action });
      // Also register short name if unique
      if (!this.actionIndex.has(action.name)) {
        this.actionIndex.set(action.name, { plugin: plugin.name, action });
      }
    }
  }

  /** Unregister a plugin. */
  async unregister(name: string): Promise<void> {
    const plugin = this.plugins.get(name);
    if (!plugin) return;

    if (plugin.teardown) {
      await plugin.teardown().catch(() => {});
    }

    // Remove from action index
    for (const action of plugin.actions) {
      this.actionIndex.delete(`${name}:${action.name}`);
      const shortEntry = this.actionIndex.get(action.name);
      if (shortEntry && shortEntry.plugin === name) {
        this.actionIndex.delete(action.name);
      }
    }

    this.plugins.delete(name);
  }

  /** Execute a plugin action by name. */
  async execute(
    actionName: string,
    params: Record<string, unknown>,
    ctx: PluginContext,
  ): Promise<PluginResult> {
    const entry = this.actionIndex.get(actionName);
    if (!entry) {
      return { success: false, output: `Unknown action: ${actionName}` };
    }

    try {
      return await entry.action.execute(params, ctx);
    } catch (err) {
      return {
        success: false,
        output: `Plugin error: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  /** Check if an action exists. */
  hasAction(name: string): boolean {
    return this.actionIndex.has(name);
  }

  /** Get all available actions (for prompting the LLM). */
  getActionDescriptions(): string[] {
    const descriptions: string[] = [];
    for (const [key, entry] of this.actionIndex.entries()) {
      if (key.includes(":")) {
        // Use fully qualified names to avoid duplicates
        descriptions.push(`${key}: ${entry.action.description}`);
      }
    }
    return descriptions;
  }

  /** List registered plugins. */
  listPlugins(): Array<{
    name: string;
    version: string;
    description: string;
    actionCount: number;
  }> {
    return Array.from(this.plugins.values()).map((p) => ({
      name: p.name,
      version: p.version,
      description: p.description,
      actionCount: p.actions.length,
    }));
  }

  /** Load plugins from a directory (each plugin is a .json manifest + .js entry). */
  async loadFromDirectory(pluginDir: string): Promise<string[]> {
    const loaded: string[] = [];

    try {
      const files = await readdir(pluginDir);
      const manifests = files.filter((f) => f.endsWith(".plugin.json"));

      for (const manifestFile of manifests) {
        try {
          const raw = await readFile(join(pluginDir, manifestFile), "utf-8");
          const manifest: PluginManifest = JSON.parse(raw);

          // Dynamic import of the plugin entry
          const entryPath = join(pluginDir, manifest.entry);
          if (extname(entryPath) === ".js" || extname(entryPath) === ".mjs") {
            const mod = await import(entryPath);
            if (mod.default && typeof mod.default === "object" && mod.default.name) {
              this.register(mod.default as AgentPlugin);
              loaded.push(manifest.name);
            }
          }
        } catch {
          // Skip invalid plugins
        }
      }
    } catch {
      // Plugin directory doesn't exist yet — that's fine
    }

    return loaded;
  }

  /** Generate a tool description string for the LLM prompt. */
  generateToolPrompt(): string {
    if (this.plugins.size === 0) return "";

    const lines = ["## Available Plugin Actions\n"];
    for (const plugin of this.plugins.values()) {
      lines.push(`### ${plugin.name} (v${plugin.version})`);
      lines.push(plugin.description);
      for (const action of plugin.actions) {
        lines.push(`- **${action.name}**: ${action.description}`);
        if (action.parameters) {
          for (const [param, info] of Object.entries(action.parameters)) {
            lines.push(
              `  - \`${param}\` (${info.type}${info.required ? ", required" : ""}): ${info.description}`,
            );
          }
        }
      }
      lines.push("");
    }
    return lines.join("\n");
  }

  /** Number of registered plugins. */
  get count(): number {
    return this.plugins.size;
  }

  /** Total number of registered actions. */
  get actionCount(): number {
    // Count only fully-qualified keys
    return Array.from(this.actionIndex.keys()).filter((k) => k.includes(":")).length;
  }
}

// ---------------------------------------------------------------------------
// Built-in plugin: API caller
// ---------------------------------------------------------------------------

export function createApiPlugin(): AgentPlugin {
  return {
    name: "api",
    version: "1.0.0",
    description: "Make HTTP API calls (GET, POST, PUT, DELETE)",
    actions: [
      {
        name: "fetch",
        description: "Make an HTTP request to an API endpoint",
        parameters: {
          url: { type: "string", description: "URL to fetch", required: true },
          method: {
            type: "string",
            description: "HTTP method (GET, POST, PUT, DELETE)",
            required: false,
          },
          body: { type: "string", description: "Request body (JSON string)", required: false },
          headers: { type: "object", description: "Additional headers", required: false },
        },
        execute: async (params) => {
          const url = String(params.url);
          const method = String(params.method ?? "GET").toUpperCase();
          const headers: Record<string, string> = {
            "Content-Type": "application/json",
            ...((params.headers as Record<string, string>) ?? {}),
          };

          try {
            const response = await fetch(url, {
              method,
              headers,
              body: params.body ? String(params.body) : undefined,
            });
            const text = await response.text();
            return {
              success: response.ok,
              output: `${response.status} ${response.statusText}\n${text.slice(0, 2000)}`,
              data: { status: response.status, body: text },
            };
          } catch (err) {
            return {
              success: false,
              output: `Fetch error: ${err instanceof Error ? err.message : String(err)}`,
            };
          }
        },
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// Built-in plugin: File operations (sandboxed to data dir)
// ---------------------------------------------------------------------------

export function createFilePlugin(): AgentPlugin {
  return {
    name: "files",
    version: "1.0.0",
    description: "Read and write files (sandboxed to the agent's data directory)",
    actions: [
      {
        name: "read",
        description: "Read a file from the agent's data directory",
        parameters: {
          path: {
            type: "string",
            description: "Relative file path within data dir",
            required: true,
          },
        },
        execute: async (params, ctx) => {
          const filePath = join(ctx.dataDir, String(params.path));
          // Security: ensure the path stays within dataDir
          if (!filePath.startsWith(ctx.dataDir)) {
            return { success: false, output: "Path traversal denied" };
          }
          try {
            const content = await readFile(filePath, "utf-8");
            return { success: true, output: content.slice(0, 5000), data: content };
          } catch (err) {
            return {
              success: false,
              output: `Read error: ${err instanceof Error ? err.message : String(err)}`,
            };
          }
        },
      },
      {
        name: "write",
        description: "Write a file to the agent's data directory",
        parameters: {
          path: {
            type: "string",
            description: "Relative file path within data dir",
            required: true,
          },
          content: { type: "string", description: "File content to write", required: true },
        },
        execute: async (params, ctx) => {
          const { writeFile: wf, mkdir: mkd } = await import("node:fs/promises");
          const { dirname } = await import("node:path");
          const filePath = join(ctx.dataDir, String(params.path));
          if (!filePath.startsWith(ctx.dataDir)) {
            return { success: false, output: "Path traversal denied" };
          }
          try {
            await mkd(dirname(filePath), { recursive: true });
            await wf(filePath, String(params.content));
            return { success: true, output: `Written to ${params.path}` };
          } catch (err) {
            return {
              success: false,
              output: `Write error: ${err instanceof Error ? err.message : String(err)}`,
            };
          }
        },
      },
    ],
  };
}
