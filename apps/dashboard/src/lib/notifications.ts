// ── Push Notifications ────────────────────────────────────────────────────
import { toast } from "sonner";

let initialized = false;

export function initNotifications() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;

  // Listen for custom gateway events
  window.addEventListener("agdi:notification", ((e: CustomEvent) => {
    const { type, message } = e.detail || {};
    switch (type) {
      case "success": toast.success(message); break;
      case "error": toast.error(message); break;
      case "warning": toast.warning(message); break;
      default: toast.info(message || "New notification");
    }
  }) as EventListener);
}

export function pushNotification(type: "success" | "error" | "warning" | "info", message: string) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("agdi:notification", { detail: { type, message } }),
    );
  }
}
