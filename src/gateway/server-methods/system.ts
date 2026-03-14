import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { SessionEntry } from "../../config/sessions.js";
import type { GatewayRequestHandlers } from "./types.js";
import { loadConfig } from "../../config/config.js";
import { resolveMainSessionKeyFromConfig } from "../../config/sessions.js";
import { resolveMainSessionKey, loadSessionStore } from "../../config/sessions.js";
import { getLastHeartbeatEvent } from "../../infra/heartbeat-events.js";
import { setHeartbeatsEnabled } from "../../infra/heartbeat-runner.js";
import { enqueueSystemEvent, isSystemEventContextChanged } from "../../infra/system-events.js";
import { listSystemPresence, updateSystemPresence } from "../../infra/system-presence.js";
import { ErrorCodes, errorShape } from "../protocol/index.js";
import {
  listAgentsForGateway,
  readSessionPreviewItemsFromTranscript,
  loadCombinedSessionStoreForGateway,
  resolveGatewaySessionStoreTarget,
} from "../session-utils.js";

export const systemHandlers: GatewayRequestHandlers = {
  "last-heartbeat": ({ respond }) => {
    respond(true, getLastHeartbeatEvent(), undefined);
  },
  "set-heartbeats": ({ params, respond }) => {
    const enabled = params.enabled;
    if (typeof enabled !== "boolean") {
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INVALID_REQUEST,
          "invalid set-heartbeats params: enabled (boolean) required",
        ),
      );
      return;
    }
    setHeartbeatsEnabled(enabled);
    respond(true, { ok: true, enabled }, undefined);
  },
  "system-presence": ({ respond }) => {
    const presence = listSystemPresence();
    respond(true, presence, undefined);
  },
  "system-event": ({ params, respond, context }) => {
    const text = typeof params.text === "string" ? params.text.trim() : "";
    if (!text) {
      respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, "text required"));
      return;
    }
    const sessionKey = resolveMainSessionKeyFromConfig();
    const deviceId = typeof params.deviceId === "string" ? params.deviceId : undefined;
    const instanceId = typeof params.instanceId === "string" ? params.instanceId : undefined;
    const host = typeof params.host === "string" ? params.host : undefined;
    const ip = typeof params.ip === "string" ? params.ip : undefined;
    const mode = typeof params.mode === "string" ? params.mode : undefined;
    const version = typeof params.version === "string" ? params.version : undefined;
    const platform = typeof params.platform === "string" ? params.platform : undefined;
    const deviceFamily = typeof params.deviceFamily === "string" ? params.deviceFamily : undefined;
    const modelIdentifier =
      typeof params.modelIdentifier === "string" ? params.modelIdentifier : undefined;
    const lastInputSeconds =
      typeof params.lastInputSeconds === "number" && Number.isFinite(params.lastInputSeconds)
        ? params.lastInputSeconds
        : undefined;
    const reason = typeof params.reason === "string" ? params.reason : undefined;
    const roles =
      Array.isArray(params.roles) && params.roles.every((t) => typeof t === "string")
        ? params.roles
        : undefined;
    const scopes =
      Array.isArray(params.scopes) && params.scopes.every((t) => typeof t === "string")
        ? params.scopes
        : undefined;
    const tags =
      Array.isArray(params.tags) && params.tags.every((t) => typeof t === "string")
        ? params.tags
        : undefined;
    const presenceUpdate = updateSystemPresence({
      text,
      deviceId,
      instanceId,
      host,
      ip,
      mode,
      version,
      platform,
      deviceFamily,
      modelIdentifier,
      lastInputSeconds,
      reason,
      roles,
      scopes,
      tags,
    });
    const isNodePresenceLine = text.startsWith("Node:");
    if (isNodePresenceLine) {
      const next = presenceUpdate.next;
      const changed = new Set(presenceUpdate.changedKeys);
      const reasonValue = next.reason ?? reason;
      const normalizedReason = (reasonValue ?? "").toLowerCase();
      const ignoreReason =
        normalizedReason.startsWith("periodic") || normalizedReason === "heartbeat";
      const hostChanged = changed.has("host");
      const ipChanged = changed.has("ip");
      const versionChanged = changed.has("version");
      const modeChanged = changed.has("mode");
      const reasonChanged = changed.has("reason") && !ignoreReason;
      const hasChanges = hostChanged || ipChanged || versionChanged || modeChanged || reasonChanged;
      if (hasChanges) {
        const contextChanged = isSystemEventContextChanged(sessionKey, presenceUpdate.key);
        const parts: string[] = [];
        if (contextChanged || hostChanged || ipChanged) {
          const hostLabel = next.host?.trim() || "Unknown";
          const ipLabel = next.ip?.trim();
          parts.push(`Node: ${hostLabel}${ipLabel ? ` (${ipLabel})` : ""}`);
        }
        if (versionChanged) {
          parts.push(`app ${next.version?.trim() || "unknown"}`);
        }
        if (modeChanged) {
          parts.push(`mode ${next.mode?.trim() || "unknown"}`);
        }
        if (reasonChanged) {
          parts.push(`reason ${reasonValue?.trim() || "event"}`);
        }
        const deltaText = parts.join(" · ");
        if (deltaText) {
          enqueueSystemEvent(deltaText, {
            sessionKey,
            contextKey: presenceUpdate.key,
          });
        }
      }
    } else {
      enqueueSystemEvent(text, { sessionKey });
    }
    const nextPresenceVersion = context.incrementPresenceVersion();
    context.broadcast(
      "presence",
      { presence: listSystemPresence() },
      {
        dropIfSlow: true,
        stateVersion: {
          presence: nextPresenceVersion,
          health: context.getHealthVersion(),
        },
      },
    );
    respond(true, { ok: true }, undefined);
  },
  "system.status": ({ respond }) => {
    const cfg = loadConfig();

    // Real agent count from on-disk agent config
    const agentsResult = listAgentsForGateway(cfg);
    const activeAgents = agentsResult.agents?.length ?? 0;

    // Sum token counts from all session entries in the store
    const { store } = loadCombinedSessionStoreForGateway(cfg);
    let totalTokens = 0;
    let totalCost = 0;
    for (const entry of Object.values(store) as (SessionEntry | undefined)[]) {
      if (entry) {
        totalTokens += entry.totalTokens ?? 0;
        // Very rough cost estimate: ~$3 per 1M output tokens (Claude Haiku ballpark)
        const outTok = entry.outputTokens ?? 0;
        totalCost += (outTok / 1_000_000) * 3;
      }
    }

    const mem = process.memoryUsage();

    respond(
      true,
      {
        tokens: totalTokens,
        activeAgents,
        uptime: process.uptime(),
        memory: `${Math.round(mem.heapUsed / 1024 / 1024)} MB`,
        cost: Math.round(totalCost * 1000) / 1000,
        rss: `${Math.round(mem.rss / 1024 / 1024)} MB`,
        heapTotal: `${Math.round(mem.heapTotal / 1024 / 1024)} MB`,
      },
      undefined,
    );
  },
  "knowledge.list": ({ respond }) => {
    // Scan the standard agent workspace for real files the user has placed there
    const workspaceDir = path.join(os.homedir(), ".agdi", "workspace");

    const documents: Array<{
      id: string;
      title: string;
      type: string;
      size: string;
      status: string;
      lastSynced: string;
    }> = [];

    const walk = (dir: string, depth = 0) => {
      if (depth > 2 || documents.length >= 50) return;
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.name.startsWith(".")) continue;
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            walk(fullPath, depth + 1);
          } else if (entry.isFile()) {
            try {
              const stat = fs.statSync(fullPath);
              const ext = path.extname(entry.name).slice(1).toUpperCase() || "FILE";
              const sizeBytes = stat.size;
              const sizeLabel =
                sizeBytes > 1_048_576
                  ? `${(sizeBytes / 1_048_576).toFixed(1)} MB`
                  : sizeBytes > 1024
                    ? `${Math.round(sizeBytes / 1024)} KB`
                    : `${sizeBytes} B`;
              const mtime = stat.mtimeMs;
              const ageMs = Date.now() - mtime;
              const lastSynced =
                ageMs < 60_000
                  ? "Just now"
                  : ageMs < 3_600_000
                    ? `${Math.round(ageMs / 60_000)} min ago`
                    : ageMs < 86_400_000
                      ? `${Math.round(ageMs / 3_600_000)} hr ago`
                      : `${Math.round(ageMs / 86_400_000)} days ago`;
              documents.push({
                id: fullPath,
                title: entry.name,
                type: ext,
                size: sizeLabel,
                status: "Synced",
                lastSynced,
              });
            } catch {
              // skip unreadable files
            }
          }
        }
      } catch {
        // skip unreadable dirs
      }
    };

    if (fs.existsSync(workspaceDir)) {
      walk(workspaceDir);
    }

    respond(true, { documents }, undefined);
  },
  "knowledge.sync": ({ respond }) => {
    respond(true, { ok: true }, undefined);
  },
  "knowledge.remove": ({ params, respond }) => {
    respond(true, { ok: true, id: params.id }, undefined);
  },
  "memory.messages.list": ({ respond }) => {
    const cfg = loadConfig();
    // Look up the main session and read its most recent transcript messages
    const mainKey = resolveMainSessionKey(cfg);
    const target = resolveGatewaySessionStoreTarget({ cfg, key: mainKey });
    const { storePath } = target;

    try {
      const store = loadSessionStore(storePath);
      const entry = target.storeKeys.map((k) => store[k]).find(Boolean);
      if (entry?.sessionId) {
        const items = readSessionPreviewItemsFromTranscript(
          entry.sessionId,
          storePath,
          entry.sessionFile,
          target.agentId,
          20, // last 20 messages
          500, // max 500 chars per message
        );
        const messages = items.map((item, idx) => ({
          id: String(idx + 1),
          role: item.role ?? "assistant",
          content: item.text ?? "",
          // SessionPreviewItem doesn't include timestamps; use current time as fallback
          timestamp: new Date().toISOString(),
        }));
        respond(true, { messages }, undefined);
        return;
      }
    } catch {
      // fall through to empty
    }

    respond(true, { messages: [] }, undefined);
  },
};
