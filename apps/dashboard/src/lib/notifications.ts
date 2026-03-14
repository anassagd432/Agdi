/**
 * Real-time notification router.
 * Maps gateway events → sonner toast notifications.
 */
import { toast } from "sonner";
import { agdi, type GatewayEvent } from "./agdi-client";

// ── Event → Toast configuration ───────────────────────────────────────

interface NotificationConfig {
  title: string;
  description?: (event: GatewayEvent) => string;
  variant: "success" | "error" | "warning" | "info";
  /** Duration in ms. Default 5000 */
  duration?: number;
}

const EVENT_MAP: Record<string, NotificationConfig> = {
  // ── Connection ──
  "gateway:connected": {
    title: "Gateway Connected",
    description: () => "WebSocket connection to Agdi gateway established.",
    variant: "success",
    duration: 3000,
  },
  "gateway:disconnected": {
    title: "Gateway Disconnected",
    description: () => "Lost connection to gateway. Reconnecting…",
    variant: "error",
    duration: 8000,
  },

  // ── Agents ──
  "agent:completed": {
    title: "Agent Completed",
    description: (e) => `Agent "${e.data?.name || e.data?.id || "unknown"}" finished its task.`,
    variant: "success",
  },
  "agent:failed": {
    title: "Agent Failed",
    description: (e) => `Agent "${e.data?.name || e.data?.id || "unknown"}" encountered an error.`,
    variant: "error",
  },
  "agent:started": {
    title: "Agent Started",
    description: (e) => `Agent "${e.data?.name || e.data?.id || "unknown"}" is now running.`,
    variant: "info",
    duration: 3000,
  },

  // ── Approvals ──
  "approval:pending": {
    title: "Approval Required",
    description: (e) => `A high-risk action needs your approval: ${e.data?.action || "review required"}.`,
    variant: "warning",
    duration: 10000,
  },

  // ── Channels ──
  "channel:disconnected": {
    title: "Channel Disconnected",
    description: (e) => `${e.data?.channel || "A channel"} lost connection.`,
    variant: "warning",
  },
  "channel:connected": {
    title: "Channel Connected",
    description: (e) => `${e.data?.channel || "A channel"} is now online.`,
    variant: "success",
    duration: 3000,
  },

  // ── Security ──
  "security:login_failed": {
    title: "Failed Login Attempt",
    description: (e) => `Login attempt from ${e.data?.ip || "unknown IP"} was rejected.`,
    variant: "warning",
  },
  "security:locked_out": {
    title: "IP Locked Out",
    description: (e) => `${e.data?.ip || "An IP"} was locked out after too many failed attempts.`,
    variant: "error",
    duration: 10000,
  },
};

// ── Toast dispatcher ──────────────────────────────────────────────────

function dispatchToast(config: NotificationConfig, event: GatewayEvent) {
  const description = config.description?.(event) ?? "";
  const duration = config.duration ?? 5000;

  switch (config.variant) {
    case "success":
      toast.success(config.title, { description, duration });
      break;
    case "error":
      toast.error(config.title, { description, duration });
      break;
    case "warning":
      toast.warning(config.title, { description, duration });
      break;
    case "info":
    default:
      toast.info(config.title, { description, duration });
      break;
  }
}

// ── Initialization ────────────────────────────────────────────────────

let cleanup: (() => void) | null = null;

/**
 * Start listening for gateway events and routing them to toast notifications.
 * Returns a cleanup function to stop listening.
 */
export function initNotifications(): () => void {
  // Prevent double-initialization
  if (cleanup) return cleanup;

  // Subscribe to all events with wildcard
  const unsub = agdi.onEvent("*", (event: GatewayEvent) => {
    const config = EVENT_MAP[event.type];
    if (config) {
      dispatchToast(config, event);
    }
  });

  cleanup = () => {
    unsub();
    cleanup = null;
  };

  return cleanup;
}
