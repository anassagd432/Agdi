/* @vitest-environment jsdom */

import { render } from "lit";
import { describe, expect, it, vi } from "vitest";
import { createFounderOpsAgendaFromDashboardData } from "../founder-ops.ts";
import type { ExecApprovalRequest } from "../controllers/exec-approval.ts";
import type { CronJob, SessionsListResult } from "../types.ts";
import { renderFounderCommandCenter } from "./founder-command-center.ts";

function createSessionsResult(): SessionsListResult {
  return {
    ts: Date.now(),
    path: "(multiple)",
    count: 2,
    defaults: { modelProvider: null, model: null, contextTokens: null },
    sessions: [
      {
        key: "agent:main:main",
        kind: "direct",
        label: "Board follow-up",
        updatedAt: Date.now(),
      },
      {
        key: "agent:main:blocker",
        kind: "direct",
        label: "Finance sync",
        updatedAt: Date.now(),
        abortedLastRun: true,
      },
      {
        key: "agent:main:founder-ops:routine:morning-brief",
        kind: "direct",
        label: "Morning brief thread",
        updatedAt: Date.now(),
        lastMessagePreview: "Follow up: Send revised investor update",
      },
    ],
  };
}

function createCronJobs(): CronJob[] {
  return [
    {
      id: "morning-brief",
      name: "Morning brief",
      agentId: "main",
      enabled: true,
      createdAtMs: Date.now(),
      updatedAtMs: Date.now(),
      schedule: { kind: "cron", expr: "0 9 * * *" },
      sessionTarget: "isolated",
      wakeMode: "next-heartbeat",
      payload: { kind: "agentTurn", message: "brief" },
      state: { nextRunAtMs: Date.now() + 60 * 60 * 1000 },
    },
  ];
}

function createApprovalQueue(): ExecApprovalRequest[] {
  return [
    {
      id: "approval-1",
      request: {
        command: "Send investor update",
        ask: "Approve the investor follow-up",
        cwd: "/tmp/founder-ops",
        sessionKey: "agent:main:main",
        security: "external",
      },
      createdAtMs: Date.now(),
      expiresAtMs: Date.now() + 60_000,
    },
  ];
}

describe("founder command center", () => {
  it("renders all core founder-ops sections", async () => {
    const container = document.createElement("div");
    const agenda = createFounderOpsAgendaFromDashboardData({
      sessionsResult: createSessionsResult(),
      cronJobs: createCronJobs(),
      execApprovalQueue: createApprovalQueue(),
      nowMs: Date.UTC(2026, 3, 19, 12, 0, 0),
    });

    render(
      renderFounderCommandCenter({
        agenda,
        onNavigate: () => undefined,
        onOpenSession: () => undefined,
      }),
      container,
    );
    await Promise.resolve();

    expect(container.textContent).toContain("Founder Command Center");
    expect(container.textContent).toContain("Today");
    expect(container.textContent).toContain("Blockers");
    expect(container.textContent).toContain("Waiting");
    expect(container.textContent).toContain("Approvals");
    expect(container.textContent).toContain("Stale");
    expect(container.textContent).toContain("Recommended next actions");
    expect(container.textContent).toContain("Send revised investor update");
    expect(container.textContent).toContain("Why:");
  });

  it("opens the related thread from an agenda card", async () => {
    const onNavigate = vi.fn();
    const onOpenSession = vi.fn();
    const container = document.createElement("div");
    const agenda = createFounderOpsAgendaFromDashboardData({
      sessionsResult: createSessionsResult(),
      cronJobs: [],
      execApprovalQueue: [],
    });

    render(
      renderFounderCommandCenter({
        agenda,
        onNavigate,
        onOpenSession,
      }),
      container,
    );
    await Promise.resolve();

    const button = Array.from(container.querySelectorAll("button")).find((candidate) =>
      candidate.textContent?.includes("Open thread"),
    );
    expect(button).toBeDefined();
    button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(onOpenSession).toHaveBeenCalled();
    expect(onNavigate).toHaveBeenCalledWith("chat");
  });
});
