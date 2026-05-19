import { Type } from "@sinclair/typebox";
import type { OpenClawPluginDefinition } from "agdi/plugin-sdk/plugin-entry";
import { type AnyAgentTool, jsonResult } from "agdi/plugin-sdk/agent-runtime";

const HelloWorldPlugin: OpenClawPluginDefinition = {
  id: "helloworld",
  name: "Hello World",
  description: "A demonstration plugin showing how to extend Agdi with custom commands and tools",
  version: "1.0.0",
  
  register: (api) => {
    // 1. Register a simple command that responds instantly
    api.registerCommand({
      name: "hello",
      description: "Responds with a friendly greeting",
      acceptsArgs: true,
      requireAuth: false,
      handler: async (ctx) => {
        const name = ctx.args?.trim() || "World";
        return {
          text: `Hello, ${name}! This is the HelloWorld plugin responding from Agdi.`,
        };
      }
    });

    // 2. Register an agent tool so the LLM can use this plugin natively
    api.registerTool((ctx) => {
      const tool: AnyAgentTool = {
        name: "hello_world_info",
        label: "Hello World Info",
        description: "Returns a friendly developer greeting. Use when asked to say hello via plugin.",
        parameters: Type.Object({
          name: Type.Optional(Type.String({ description: "Who to greet" }))
        }),
        execute: async (_callId, args) => {
          const params = args as Record<string, string>;
          const name = params.name ?? "Traveler";
          return jsonResult({
            ok: true,
            greeting: `Greetings, ${name}! I am a plugin loaded by agent ${ctx.agentId || "unknown"}`
          });
        }
      };
      return tool;
    });

    api.logger.info("HelloWorld plugin has been successfully registered!");
  }
};

export default HelloWorldPlugin;
