import { Type } from "@sinclair/typebox";
import type { AGDIConfig } from "../../config/config.js";
import type { AnyAgentTool } from "./common.js";
import { jsonResult } from "./common.js";

const N8nWebhookToolSchema = Type.Object({
  workflowName: Type.String({
    description: "Optional name of the n8n workflow you are triggering, for logging purposes.",
  }),
  payload: Type.Record(Type.String(), Type.Any(), {
    description:
      "The JSON payload to send to the n8n webhook. This should contain any variables the workflow needs.",
  }),
});

export function createN8nWebhookTool(opts?: { config?: AGDIConfig }): AnyAgentTool | null {
  const n8nConfig = opts?.config?.n8n;

  // If no n8n webhook URL is configured, we simply omit this tool from the agent.
  if (!n8nConfig?.webhookUrl) {
    return null;
  }

  return {
    label: "Trigger n8n Workflow",
    name: "n8n_webhook",
    description:
      "Trigger an automation workflow in the connected n8n instance by sending it a JSON payload.",
    parameters: N8nWebhookToolSchema,
    execute: async (_toolCallId, args) => {
      const params = args as Record<string, unknown>;
      const workflowName =
        typeof params.workflowName === "string" ? params.workflowName : "Unknown Workflow";
      const payload = params.payload || {};

      try {
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          Accept: "application/json",
        };

        if (n8nConfig.authHeader) {
          headers["Authorization"] = n8nConfig.authHeader;
        }

        const webhookUrl = n8nConfig.webhookUrl;
        if (!webhookUrl) throw new Error("n8n webhookUrl is not configured");

        const response = await fetch(webhookUrl, {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
        });

        const status = response.status;
        let responseText = "";
        try {
          responseText = await response.text();
        } catch {
          // ignore parsing error if body empty
        }

        if (status >= 200 && status < 300) {
          return jsonResult({
            success: true,
            status,
            message: `Successfully triggered n8n workflow ${workflowName}.`,
            response: responseText,
          });
        } else {
          return jsonResult({
            success: false,
            status,
            message: `Failed to trigger n8n workflow ${workflowName}.`,
            response: responseText,
          });
        }
      } catch (err: unknown) {
        return jsonResult({
          success: false,
          error: (err as Error).message,
        });
      }
    },
  };
}
