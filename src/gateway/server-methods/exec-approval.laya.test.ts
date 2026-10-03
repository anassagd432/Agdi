import { afterEach, describe, expect, it, vi } from "vitest";
import { ExecApprovalManager } from "../exec-approval-manager.js";
import { createExecApprovalHandlers } from "./exec-approval.js";

const ENV_KEYS = ["LAYA_ENABLED", "LAYA_API_KEY", "LAYA_TIMEOUT_MS", "LAYA_BASE_URL"] as const;

function snapshotEnv(): Record<(typeof ENV_KEYS)[number], string | undefined> {
  return {
    LAYA_ENABLED: process.env.LAYA_ENABLED,
    LAYA_API_KEY: process.env.LAYA_API_KEY,
    LAYA_TIMEOUT_MS: process.env.LAYA_TIMEOUT_MS,
    LAYA_BASE_URL: process.env.LAYA_BASE_URL,
  };
}

function restoreEnv(snapshot: Record<(typeof ENV_KEYS)[number], string | undefined>) {
  for (const key of ENV_KEYS) {
    const value = snapshot[key];
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}

function cleanAnswers(harm: Record<string, unknown> = { noul: 0.91, confidence: 0.9 }) {
  const calm = { noul: 0.04, confidence: 0.93 };
  return {
    uncertainty: calm,
    mistakes: calm,
    contradictions: calm,
    harm,
  };
}

describe.sequential("exec approval Laya advice", () => {
  const saved = snapshotEnv();

  afterEach(() => {
    restoreEnv(saved);
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  function createFixture() {
    const manager = new ExecApprovalManager();
    const handlers = createExecApprovalHandlers(manager);
    const broadcasts: Array<{ event: string; payload: unknown }> = [];
    const respond = vi.fn();
    const context = {
      broadcast: (event: string, payload: unknown) => {
        broadcasts.push({ event, payload });
      },
      hasExecApprovalClients: () => true,
      logGateway: { error: vi.fn() },
    };
    return { manager, handlers, broadcasts, respond, context };
  }

  async function requestApproval(params: {
    command: string;
    commandArgv?: string[];
    handlers: ReturnType<typeof createExecApprovalHandlers>;
    respond: ReturnType<typeof vi.fn>;
    context: {
      broadcast: (event: string, payload: unknown) => void;
      hasExecApprovalClients: () => boolean;
    };
  }) {
    const requestPromise = params.handlers["exec.approval.request"]({
      params: {
        command: params.command,
        commandArgv: params.commandArgv,
        cwd: "/tmp",
        host: "gateway",
        security: "allowlist",
        ask: "always",
        timeoutMs: 5_000,
        twoPhase: true,
      },
      respond: params.respond,
      context: params.context as never,
      client: null,
      req: { id: "req-laya", type: "req", method: "exec.approval.request" },
      isWebchatConnect: () => false,
    });
    await vi.waitFor(() => {
      expect(params.respond).toHaveBeenCalled();
    });
    return { requestPromise };
  }

  function requestedPayload(broadcasts: Array<{ event: string; payload: unknown }>) {
    const requested = broadcasts.find((entry) => entry.event === "exec.approval.requested");
    return requested?.payload as
      | { id?: string; request?: { layaAdvice?: string; command?: string } }
      | undefined;
  }

  function decisions(respond: ReturnType<typeof vi.fn>): string[] {
    return respond.mock.calls.flatMap((call) => {
      const payload = call[1] as { decision?: unknown } | undefined;
      return typeof payload?.decision === "string" ? [payload.decision] : [];
    });
  }

  it("attaches Laya advice and still waits for a human decision", async () => {
    process.env.LAYA_ENABLED = "1";
    process.env.LAYA_API_KEY = "test-key";
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        answers: cleanAnswers(),
      }),
    }));
    vi.stubGlobal("fetch", fetchMock);
    const { manager, handlers, broadcasts, respond, context } = createFixture();

    const { requestPromise: pending } = await requestApproval({
      command: "rm -rf /data",
      commandArgv: ["rm", "-rf", "/data"],
      handlers,
      respond,
      context,
    });

    const payload = requestedPayload(broadcasts);
    expect(payload?.request?.layaAdvice).toContain("not permission: harm");
    expect(payload?.request?.layaAdvice?.toLowerCase()).not.toContain("verified");
    expect(fetchMock).toHaveBeenCalledOnce();
    const id = payload?.id ?? "";
    expect(manager.getSnapshot(id)?.decision).toBeUndefined();
    expect(decisions(respond)).not.toContain("allow-once");
    expect(decisions(respond)).not.toContain("allow-always");

    expect(manager.resolve(id, "deny", "tester")).toBe(true);
    await pending;
    expect(decisions(respond)).toContain("deny");
    expect(decisions(respond)).not.toContain("allow-once");
  });

  it("still requires approval when Laya returns an allow signal", async () => {
    process.env.LAYA_ENABLED = "1";
    process.env.LAYA_API_KEY = "test-key";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          decision: "allow-once",
          action: { act: true },
          answers: cleanAnswers({ noul: 0.02, confidence: 0.97, choice: "allow" }),
        }),
      })),
    );
    const { manager, handlers, broadcasts, respond, context } = createFixture();
    const { requestPromise: pending } = await requestApproval({
      command: "npm publish",
      commandArgv: ["npm", "publish"],
      handlers,
      respond,
      context,
    });

    const payload = requestedPayload(broadcasts);
    expect(payload?.request?.layaAdvice).toContain("allow-like Laya signal was ignored");
    expect(payload?.request?.layaAdvice).toContain("Approval is still required");
    const id = payload?.id ?? "";
    expect(manager.getSnapshot(id)?.decision).toBeUndefined();
    expect(decisions(respond)).not.toContain("allow-once");
    expect(decisions(respond)).not.toContain("allow-always");

    expect(manager.resolve(id, "deny", "tester")).toBe(true);
    await pending;
  });

  it("still requires approval when Laya is unavailable", async () => {
    process.env.LAYA_ENABLED = "1";
    process.env.LAYA_API_KEY = "test-key";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("network down");
      }),
    );
    const { manager, handlers, broadcasts, respond, context } = createFixture();
    const { requestPromise: pending } = await requestApproval({
      command: "git push origin main",
      commandArgv: ["git", "push", "origin", "main"],
      handlers,
      respond,
      context,
    });

    const payload = requestedPayload(broadcasts);
    expect(payload?.request?.layaAdvice).toContain("Laya unavailable");
    expect(payload?.request?.layaAdvice).toContain("Silence is not clearance");
    const id = payload?.id ?? "";
    expect(manager.getSnapshot(id)?.decision).toBeUndefined();
    expect(respond).toHaveBeenCalledWith(
      true,
      expect.objectContaining({ status: "accepted", id }),
      undefined,
    );
    expect(decisions(respond)).not.toContain("allow-once");

    expect(manager.resolve(id, "deny", "tester")).toBe(true);
    await pending;
  });

  it("does not call Laya for read-only commands", async () => {
    process.env.LAYA_ENABLED = "1";
    process.env.LAYA_API_KEY = "test-key";
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { manager, handlers, broadcasts, respond, context } = createFixture();
    const { requestPromise: pending } = await requestApproval({
      command: "ls -la",
      commandArgv: ["ls", "-la"],
      handlers,
      respond,
      context,
    });

    const payload = requestedPayload(broadcasts);
    expect(payload?.request?.layaAdvice).toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();
    const id = payload?.id ?? "";
    expect(manager.getSnapshot(id)?.decision).toBeUndefined();
    expect(manager.resolve(id, "deny", "tester")).toBe(true);
    await pending;
  });
});
