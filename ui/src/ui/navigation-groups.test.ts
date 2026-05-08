import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type NavigationModule = typeof import("./navigation.ts");

function createStorageMock(): Storage {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.get(key) ?? null;
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, String(value));
    },
  };
}

describe("TAB_GROUPS", () => {
  let navigation: NavigationModule;

  beforeEach(async () => {
    vi.resetModules();
    vi.stubGlobal("localStorage", createStorageMock());
    vi.stubGlobal("navigator", { language: "en-US" } as Navigator);
    navigation = await import("./navigation.ts");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("groups workspace surfaces by user job", () => {
    const workspace = navigation.TAB_GROUPS.find((group) => group.label === "workspace");
    const assistants = navigation.TAB_GROUPS.find((group) => group.label === "assistants");
    const connections = navigation.TAB_GROUPS.find((group) => group.label === "connections");
    const automations = navigation.TAB_GROUPS.find((group) => group.label === "automations");
    const activity = navigation.TAB_GROUPS.find((group) => group.label === "activity");
    const settings = navigation.TAB_GROUPS.find((group) => group.label === "settings");

    expect(workspace?.tabs).toEqual(["chat", "overview"]);
    expect(assistants?.tabs).toEqual(["agents", "skills", "nodes"]);
    expect(connections?.tabs).toEqual(["channels", "communications", "instances"]);
    expect(automations?.tabs).toEqual(["cron", "automation"]);
    expect(activity?.tabs).toEqual(["sessions", "usage", "logs", "debug"]);
    expect(settings?.tabs).toEqual(["config", "appearance", "infrastructure", "aiAgents"]);
  });

  it("routes every published workspace slice", () => {
    expect(navigation.tabFromPath("/chat")).toBe("chat");
    expect(navigation.tabFromPath("/overview")).toBe("overview");
    expect(navigation.tabFromPath("/agents")).toBe("agents");
    expect(navigation.tabFromPath("/skills")).toBe("skills");
    expect(navigation.tabFromPath("/nodes")).toBe("nodes");
    expect(navigation.tabFromPath("/channels")).toBe("channels");
    expect(navigation.tabFromPath("/communications")).toBe("communications");
    expect(navigation.tabFromPath("/instances")).toBe("instances");
    expect(navigation.tabFromPath("/cron")).toBe("cron");
    expect(navigation.tabFromPath("/automation")).toBe("automation");
    expect(navigation.tabFromPath("/sessions")).toBe("sessions");
    expect(navigation.tabFromPath("/usage")).toBe("usage");
    expect(navigation.tabFromPath("/logs")).toBe("logs");
    expect(navigation.tabFromPath("/debug")).toBe("debug");
    expect(navigation.tabFromPath("/config")).toBe("config");
    expect(navigation.tabFromPath("/appearance")).toBe("appearance");
    expect(navigation.tabFromPath("/infrastructure")).toBe("infrastructure");
    expect(navigation.tabFromPath("/ai-agents")).toBe("aiAgents");
  });
});
