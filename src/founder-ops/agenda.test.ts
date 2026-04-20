import { describe, expect, it } from "vitest";
import {
  chatSourceAdapter,
  createApprovalAgendaItem,
  createFounderOpsAgenda,
  crmSourceAdapter,
  calendarSourceAdapter,
  tasksSourceAdapter,
} from "./agenda.js";
import {
  createFounderOpsAgendaFromControlPlane,
  describeFounderOpsApproval,
  resolveFounderRoutineSessionKey,
} from "./control-plane.js";

describe("founder-ops agenda adapters", () => {
  it("normalizes chat inputs into blocker, decision, and follow-up work", () => {
    const nowMs = Date.UTC(2026, 3, 19, 12, 0, 0);
    const items = chatSourceAdapter.normalize(
      [
        { id: "1", text: "Blocked on finance numbers for the board deck", updatedAtMs: nowMs },
        { id: "2", text: "Decision: ship the launch on Thursday", updatedAtMs: nowMs },
        { id: "3", text: "Follow up with Sam on hiring feedback", updatedAtMs: nowMs },
      ],
      nowMs,
    );

    expect(items.map((item) => item.kind)).toEqual(["blocker", "decision", "follow_up"]);
  });

  it("normalizes calendar events into meeting context and follow-up placeholders", () => {
    const nowMs = Date.UTC(2026, 3, 19, 12, 0, 0);
    const items = calendarSourceAdapter.normalize(
      [
        {
          id: "meet-1",
          title: "Pipeline review",
          startAtMs: nowMs + 30 * 60 * 1000,
          actionItems: ["Send revised forecast", "Prepare investor update"],
        },
      ],
      nowMs,
    );

    expect(items.map((item) => item.kind)).toEqual(["meeting", "follow_up", "follow_up"]);
  });

  it("maps task inputs into blocked, waiting, and stale states", () => {
    const nowMs = Date.UTC(2026, 3, 19, 12, 0, 0);
    const items = tasksSourceAdapter.normalize(
      [
        { id: "t-1", title: "Close finance model", status: "blocked", updatedAtMs: nowMs },
        { id: "t-2", title: "Wait for legal redlines", status: "waiting", updatedAtMs: nowMs },
        {
          id: "t-3",
          title: "Update hiring scorecards",
          status: "todo",
          updatedAtMs: nowMs - 7 * 24 * 60 * 60 * 1000,
          dueAtMs: nowMs - 60 * 60 * 1000,
        },
      ],
      nowMs,
    );

    expect(items[0]?.kind).toBe("blocker");
    expect(items[1]?.kind).toBe("waiting_on");
    expect(items[2]?.stale).toBe(true);
  });

  it("maps CRM inputs into account, contact, follow-up, and risk items", () => {
    const nowMs = Date.UTC(2026, 3, 19, 12, 0, 0);
    const items = crmSourceAdapter.normalize([
      {
        id: "crm-1",
        accountName: "Northstar Capital",
        contactName: "Dana",
        riskLevel: "high",
        nextAction: "Send board-ready update",
        updatedAtMs: nowMs,
      },
    ]);

    expect(items.map((item) => item.kind)).toEqual(["account", "contact", "follow_up", "risk"]);
  });
});

describe("founder-ops agenda prioritization", () => {
  it("ranks stale commitments ahead of passive informational items", () => {
    const nowMs = Date.UTC(2026, 3, 19, 12, 0, 0);
    const agenda = createFounderOpsAgenda({
      chat: [{ id: "c-1", text: "Customer note", updatedAtMs: nowMs }],
      tasks: [
        {
          id: "t-1",
          title: "Missed follow-up",
          status: "todo",
          updatedAtMs: nowMs - 6 * 24 * 60 * 60 * 1000,
          dueAtMs: nowMs - 60 * 60 * 1000,
        },
      ],
      nowMs,
    });

    expect(agenda.sections.stale.items[0]?.title).toBe("Missed follow-up");
    expect(agenda.sections.recommended.items[0]?.title).toBe("Missed follow-up");
  });

  it("ranks blockers above routine noise and remains deterministic", () => {
    const nowMs = Date.UTC(2026, 3, 19, 12, 0, 0);
    const extraItems = [
      {
        id: "routine:1",
        kind: "routine" as const,
        title: "Morning brief",
        summary: "Routine completed.",
        source: "routine" as const,
        bucket: "internal" as const,
        state: "done" as const,
        priority: 12,
        updatedAtMs: nowMs,
        stale: false,
      },
      {
        id: "blocker:1",
        kind: "blocker" as const,
        title: "Payroll file missing",
        summary: "Finance cannot close the week.",
        source: "tasks" as const,
        bucket: "knows" as const,
        state: "blocked" as const,
        priority: 90,
        updatedAtMs: nowMs,
        stale: false,
      },
    ];

    const first = createFounderOpsAgenda({ extraItems, nowMs });
    const second = createFounderOpsAgenda({ extraItems, nowMs });

    expect(first.sections.blockers.items[0]?.title).toBe("Payroll file missing");
    expect(first.items.map((item) => item.id)).toEqual(second.items.map((item) => item.id));
  });
});

describe("founder-ops approval rules", () => {
  it("keeps external actions in the approval bucket and blocks auto-execute fallback", () => {
    const item = createApprovalAgendaItem({
      id: "approval-1",
      title: "Send investor update",
      summary: "External email draft is ready.",
      rationale: "Agdi paused this step because it can create an external side effect.",
      updatedAtMs: Date.UTC(2026, 3, 19, 12, 0, 0),
      timeoutFallback: "auto-execute",
    });

    expect(item.bucket).toBe("approval");
    expect(item.timeoutFallback).toBe("escalate");
  });

  it("derives founder-facing approval metadata and labels", () => {
    const descriptor = describeFounderOpsApproval({
      command: "Send investor update",
      ask: "Approve investor follow-up",
      cwd: "/workspace/founder",
      sessionKey: "agent:main:main",
      security: "external",
    });

    expect(descriptor.title).toBe("Approve investor follow-up");
    expect(descriptor.rationale).toContain("external or security-sensitive boundary");
    expect(descriptor.labels.approveOnce).toBe("Approve once");
    expect(descriptor.timeoutFallback).toBe("escalate");
  });
});

describe("founder-ops routines", () => {
  it("maps founder routines into deterministic session-backed threads", () => {
    expect(
      resolveFounderRoutineSessionKey({
        id: "morning-brief",
        name: "Morning brief",
        agentId: "main",
      }),
    ).toBe("agent:main:founder-ops:routine:morning-brief");
  });

  it("normalizes routine thread output into agenda items deterministically", () => {
    const nowMs = Date.UTC(2026, 3, 19, 12, 0, 0);
    const first = createFounderOpsAgendaFromControlPlane({
      sessions: [
        {
          key: "agent:main:founder-ops:routine:morning-brief",
          title: "Morning brief thread",
          updatedAtMs: nowMs,
          lastMessagePreview: [
            "Blocker: Finalize the board metrics",
            "Waiting on: Legal redlines",
            "Follow up: Send revised investor update",
          ].join("\n"),
        },
      ],
      routines: [
        {
          id: "morning-brief",
          name: "Morning brief",
          agentId: "main",
          enabled: true,
          updatedAtMs: nowMs,
        },
      ],
      nowMs,
    });
    const second = createFounderOpsAgendaFromControlPlane({
      sessions: [
        {
          key: "agent:main:founder-ops:routine:morning-brief",
          title: "Morning brief thread",
          updatedAtMs: nowMs,
          lastMessagePreview: [
            "Blocker: Finalize the board metrics",
            "Waiting on: Legal redlines",
            "Follow up: Send revised investor update",
          ].join("\n"),
        },
      ],
      routines: [
        {
          id: "morning-brief",
          name: "Morning brief",
          agentId: "main",
          enabled: true,
          updatedAtMs: nowMs,
        },
      ],
      nowMs,
    });

    expect(first.items.some((item) => item.title === "Finalize the board metrics")).toBe(true);
    expect(first.items.some((item) => item.title === "Legal redlines")).toBe(true);
    expect(first.items.some((item) => item.title === "Send revised investor update")).toBe(true);
    expect(first.items.map((item) => item.id)).toEqual(second.items.map((item) => item.id));
  });
});
