/**
 * Jarvis gateway handlers — start/stop/status/config for the Jarvis service.
 */

import type { GatewayRequestHandlers } from "./types.js";
import { ErrorCodes, errorShape } from "../protocol/index.js";
import { formatForLog } from "../ws-log.js";

export const jarvisHandlers: GatewayRequestHandlers = {
  "jarvis.status": async ({ respond, context }) => {
    try {
      const jarvis = context.getJarvis?.();
      if (!jarvis) {
        respond(true, {
          state: "off",
          available: false,
          message: "Jarvis module not initialized",
        });
        return;
      }
      respond(true, { ...jarvis.getStatus(), available: true });
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.UNAVAILABLE, formatForLog(err)));
    }
  },

  "jarvis.start": async ({ respond, context }) => {
    try {
      const jarvis = context.getJarvis?.();
      if (!jarvis) {
        respond(
          false,
          undefined,
          errorShape(ErrorCodes.UNAVAILABLE, "Jarvis module not initialized"),
        );
        return;
      }
      if (jarvis.isRunning()) {
        respond(true, { message: "Jarvis is already running", ...jarvis.getStatus() });
        return;
      }
      await jarvis.start();
      respond(true, { message: "Jarvis started", ...jarvis.getStatus() });
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.UNAVAILABLE, formatForLog(err)));
    }
  },

  "jarvis.stop": async ({ respond, context }) => {
    try {
      const jarvis = context.getJarvis?.();
      if (!jarvis) {
        respond(
          false,
          undefined,
          errorShape(ErrorCodes.UNAVAILABLE, "Jarvis module not initialized"),
        );
        return;
      }
      await jarvis.stop();
      respond(true, { message: "Jarvis stopped", ...jarvis.getStatus() });
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.UNAVAILABLE, formatForLog(err)));
    }
  },

  "jarvis.config": async ({ params, respond, context }) => {
    try {
      const jarvis = context.getJarvis?.();
      if (!jarvis) {
        respond(
          false,
          undefined,
          errorShape(ErrorCodes.UNAVAILABLE, "Jarvis module not initialized"),
        );
        return;
      }

      // GET: no params → return current config
      if (!params || Object.keys(params).length === 0) {
        respond(true, jarvis.getConfig());
        return;
      }

      // SET: update config
      jarvis.setConfig(params as Record<string, unknown>);
      respond(true, { message: "Config updated", config: jarvis.getConfig() });
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.UNAVAILABLE, formatForLog(err)));
    }
  },
};
