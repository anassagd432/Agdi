import { Command } from "commander";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createCliRuntimeCapture } from "./test-runtime-capture.js";

const callGatewayFromCli = vi.fn(async (method: string, _opts: unknown, params?: unknown) => {
  if (method === "sessions.list") {
    return {
      sessions: [
        {
          key: "agent:main:main",
          label: "Board follow-up",
          updatedAt: Date.now(),
          status: "running",
          lastMessagePreview: "Follow up: Send revised investor update",
        },
      ],
    };
  }
  if (method === "cron.list") {
    return {
      jobs: [
        {
          id: "morning-brief",
          name: "Morning brief",
          agentId: "main",
          enabled: true,
          updatedAtMs: Date.now(),
          state: { nextRunAtMs: Date.now() + 60_000 },
        },
      ],
    };
  }
  if (method === "exec.approval.list") {
    return {
      approvals: [
        {
          id: "approval-1",
          createdAtMs: Date.now(),
          request: {
            command: "Send investor update",
            ask: "Approve the investor follow-up",
            sessionKey: "agent:main:main",
          },
        },
      ],
    };
  }
  return { ok: true, params };
});

const { defaultRuntime, resetRuntimeCapture, runtimeLogs } = createCliRuntimeCapture();

vi.mock("./gateway-rpc.js", async () => {
  const actual = await vi.importActual<typeof import("./gateway-rpc.js")>("./gateway-rpc.js");
  return {
    ...actual,
    callGatewayFromCli: (method: string, opts: unknown, params?: unknown) =>
      callGatewayFromCli(method, opts, params),
  };
});

vi.mock("../runtime.js", () => ({
  defaultRuntime,
}));

const { registerFounderOpsCli } = await import("./founder-ops-cli.js");

describe("founder ops CLI", () => {
  function createProgram() {
    const program = new Command();
    program.exitOverride();
    registerFounderOpsCli(program);
    return program;
  }

  beforeEach(() => {
    resetRuntimeCapture();
    callGatewayFromCli.mockClear();
  });

  it("loads the agenda brief from sessions, routines, and approvals", async () => {
    const program = createProgram();
    await program.parseAsync(["ops", "brief"], { from: "user" });

    expect(callGatewayFromCli).toHaveBeenCalledWith("sessions.list", expect.anything(), {
      includeGlobal: true,
      includeUnknown: true,
      limit: 200,
      includeLastMessage: true,
    });
    expect(callGatewayFromCli).toHaveBeenCalledWith("cron.list", expect.anything(), {
      includeDisabled: true,
      limit: 200,
      offset: 0,
      sortBy: "nextRunAtMs",
      sortDir: "asc",
    });
    expect(callGatewayFromCli).toHaveBeenCalledWith("exec.approval.list", expect.anything(), {});
    expect(runtimeLogs.join("\n")).toContain("Founder Ops");
  });

  it("triggers founder routines through cron.run", async () => {
    const program = createProgram();
    await program.parseAsync(["ops", "routine-trigger", "morning-brief"], { from: "user" });

    expect(callGatewayFromCli).toHaveBeenCalledWith("cron.run", expect.anything(), {
      id: "morning-brief",
      mode: "force",
    });
  });
});
