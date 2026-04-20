export type FounderOpsEntityKind =
  | "initiative"
  | "task"
  | "decision"
  | "follow_up"
  | "blocker"
  | "waiting_on"
  | "approval"
  | "meeting"
  | "contact"
  | "account"
  | "risk"
  | "routine";

export type FounderOpsSourceKind =
  | "chat"
  | "calendar"
  | "tasks"
  | "crm"
  | "approval"
  | "routine"
  | "session";

export type FounderOpsActionBucket = "knows" | "internal" | "approval";

export type FounderOpsTimeoutFallback =
  | "escalate"
  | "retry-later"
  | "continue-safe-internal";

export type FounderOpsAgendaItem = {
  id: string;
  kind: FounderOpsEntityKind;
  title: string;
  summary: string;
  rationale?: string;
  source: FounderOpsSourceKind;
  bucket: FounderOpsActionBucket;
  state: "open" | "blocked" | "waiting" | "stale" | "done";
  priority: number;
  updatedAtMs: number;
  stale: boolean;
  sessionKey?: string;
  sourceContext?: string;
  expectedOutcome?: string;
  consequenceOfDelay?: string;
  timeoutFallback?: FounderOpsTimeoutFallback;
  recommendedAction?: string;
  tags?: string[];
};

export type FounderOpsSectionKey =
  | "today"
  | "blockers"
  | "waiting"
  | "approvals"
  | "stale"
  | "recommended";

export type FounderOpsSection = {
  key: FounderOpsSectionKey;
  title: string;
  items: FounderOpsAgendaItem[];
};

export type FounderOpsAgendaSnapshot = {
  generatedAtMs: number;
  items: FounderOpsAgendaItem[];
  sections: Record<FounderOpsSectionKey, FounderOpsSection>;
  buckets: Record<FounderOpsActionBucket, FounderOpsAgendaItem[]>;
};

export type FounderOpsChatInput = {
  id: string;
  text: string;
  updatedAtMs: number;
  sessionKey?: string;
};

export type FounderOpsCalendarInput = {
  id: string;
  title: string;
  startAtMs: number;
  endAtMs?: number;
  actionItems?: string[];
  sessionKey?: string;
};

export type FounderOpsTaskInput = {
  id: string;
  title: string;
  status: "todo" | "blocked" | "waiting" | "done";
  updatedAtMs: number;
  dueAtMs?: number;
  sessionKey?: string;
};

export type FounderOpsCrmInput = {
  id: string;
  accountName: string;
  contactName?: string;
  riskLevel?: "low" | "medium" | "high";
  nextAction?: string;
  updatedAtMs: number;
  sessionKey?: string;
};

export type FounderOpsSourceAdapter<TInput> = {
  kind: Extract<FounderOpsSourceKind, "chat" | "calendar" | "tasks" | "crm">;
  normalize(input: readonly TInput[], nowMs?: number): FounderOpsAgendaItem[];
};

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const MAX_SECTION_ITEMS = 5;

function clampPriority(priority: number): number {
  return Math.max(0, Math.round(priority));
}

function dedupeAndSort(items: readonly FounderOpsAgendaItem[]): FounderOpsAgendaItem[] {
  const byId = new Map<string, FounderOpsAgendaItem>();
  for (const item of items) {
    const existing = byId.get(item.id);
    if (!existing || item.priority > existing.priority) {
      byId.set(item.id, item);
    }
  }
  return Array.from(byId.values()).toSorted((a, b) => {
    if (b.priority !== a.priority) {
      return b.priority - a.priority;
    }
    if (b.updatedAtMs !== a.updatedAtMs) {
      return b.updatedAtMs - a.updatedAtMs;
    }
    return a.id.localeCompare(b.id);
  });
}

export function normalizeApprovalTimeoutFallback(
  value?: string | null,
): FounderOpsTimeoutFallback {
  if (value === "retry-later" || value === "continue-safe-internal") {
    return value;
  }
  return "escalate";
}

export function createApprovalAgendaItem(params: {
  id: string;
  title: string;
  summary: string;
  rationale?: string;
  updatedAtMs: number;
  sessionKey?: string;
  sourceContext?: string;
  expectedOutcome?: string;
  consequenceOfDelay?: string;
  timeoutFallback?: string | null;
  recommendedAction?: string;
}): FounderOpsAgendaItem {
  return {
    id: params.id,
    kind: "approval",
    title: params.title,
    summary: params.summary,
    rationale: params.rationale,
    source: "approval",
    bucket: "approval",
    state: "open",
    priority: 92,
    updatedAtMs: params.updatedAtMs,
    stale: false,
    sessionKey: params.sessionKey,
    sourceContext: params.sourceContext,
    expectedOutcome: params.expectedOutcome,
    consequenceOfDelay: params.consequenceOfDelay,
    timeoutFallback: normalizeApprovalTimeoutFallback(params.timeoutFallback),
    recommendedAction: params.recommendedAction ?? "Review and approve or reject the action.",
    tags: ["approval"],
  };
}

export const chatSourceAdapter: FounderOpsSourceAdapter<FounderOpsChatInput> = {
  kind: "chat",
  normalize(input, nowMs = Date.now()) {
    return input.map((entry) => {
      const text = entry.text.trim();
      const lower = text.toLowerCase();
      const ageMs = Math.max(0, nowMs - entry.updatedAtMs);
      const stale = ageMs > 3 * DAY_MS;
      const isBlocker =
        /\b(blocked|stuck|urgent|incident|broken|waiting on)\b/.test(lower);
      const isDecision = /\b(decide|decision|approved|ship|go with)\b/.test(lower);
      const isFollowUp = /\b(follow up|follow-up|reply|send|ping|check in)\b/.test(lower);
      const kind: FounderOpsEntityKind = isBlocker
        ? "blocker"
        : isDecision
          ? "decision"
          : isFollowUp
            ? "follow_up"
            : "task";
      const state = stale ? "stale" : isBlocker ? "blocked" : "open";
      const priority = clampPriority(
        40 +
          (isBlocker ? 35 : 0) +
          (isDecision ? 18 : 0) +
          (isFollowUp ? 12 : 0) +
          (stale ? 16 : 0),
      );
      return {
        id: `chat:${entry.id}`,
        kind,
        title: text.length > 72 ? `${text.slice(0, 69)}...` : text,
        summary: text,
        source: "chat",
        bucket: "knows",
        state,
        priority,
        updatedAtMs: entry.updatedAtMs,
        stale,
        sessionKey: entry.sessionKey,
        recommendedAction: isBlocker
          ? "Unblock the dependency or assign an owner."
          : isDecision
            ? "Capture the decision and drive execution."
            : "Convert the thread into a concrete next step.",
        tags: ["chat"],
      };
    });
  },
};

export const calendarSourceAdapter: FounderOpsSourceAdapter<FounderOpsCalendarInput> = {
  kind: "calendar",
  normalize(input, nowMs = Date.now()) {
    const items: FounderOpsAgendaItem[] = [];
    for (const entry of input) {
      const withinDay = Math.abs(entry.startAtMs - nowMs) <= DAY_MS;
      const basePriority = withinDay ? 72 : 45;
      items.push({
        id: `calendar:meeting:${entry.id}`,
        kind: "meeting",
        title: entry.title,
        summary: withinDay
          ? `Meeting is in focus for the next 24 hours.`
          : `Scheduled meeting context.`,
        source: "calendar",
        bucket: "knows",
        state: "open",
        priority: basePriority,
        updatedAtMs: entry.startAtMs,
        stale: false,
        sessionKey: entry.sessionKey,
        recommendedAction: "Review context and prepare the next decision.",
        tags: ["calendar", "meeting"],
      });
      for (const [index, actionItem] of (entry.actionItems ?? []).entries()) {
        items.push({
          id: `calendar:follow-up:${entry.id}:${index}`,
          kind: "follow_up",
          title: actionItem,
          summary: `Post-meeting follow-up from ${entry.title}.`,
          source: "calendar",
          bucket: "internal",
          state: "open",
          priority: clampPriority(basePriority - 6),
          updatedAtMs: Math.max(entry.endAtMs ?? entry.startAtMs, entry.startAtMs),
          stale: false,
          sessionKey: entry.sessionKey,
          recommendedAction: "Assign the follow-up and confirm the deadline.",
          tags: ["calendar", "follow-up"],
        });
      }
    }
    return items;
  },
};

export const tasksSourceAdapter: FounderOpsSourceAdapter<FounderOpsTaskInput> = {
  kind: "tasks",
  normalize(input, nowMs = Date.now()) {
    return input.map((entry) => {
      const overdue = typeof entry.dueAtMs === "number" && entry.dueAtMs < nowMs;
      const stale = overdue || nowMs - entry.updatedAtMs > 5 * DAY_MS;
      const kind: FounderOpsEntityKind =
        entry.status === "blocked"
          ? "blocker"
          : entry.status === "waiting"
            ? "waiting_on"
            : "task";
      const state =
        entry.status === "blocked"
          ? "blocked"
          : entry.status === "waiting"
            ? "waiting"
            : stale
              ? "stale"
              : entry.status === "done"
                ? "done"
                : "open";
      return {
        id: `task:${entry.id}`,
        kind,
        title: entry.title,
        summary: overdue
          ? "Task is overdue and needs follow-through."
          : entry.status === "waiting"
            ? "Task is waiting on an external dependency."
            : "Tracked task in the operating agenda.",
        source: "tasks",
        bucket: entry.status === "done" ? "internal" : "knows",
        state,
        priority: clampPriority(
          48 +
            (entry.status === "blocked" ? 34 : 0) +
            (entry.status === "waiting" ? 24 : 0) +
            (overdue ? 18 : 0),
        ),
        updatedAtMs: entry.updatedAtMs,
        stale,
        sessionKey: entry.sessionKey,
        recommendedAction:
          entry.status === "blocked"
            ? "Clear the blocker or escalate it."
            : entry.status === "waiting"
              ? "Check the dependency owner and expected date."
              : overdue
                ? "Renegotiate the deadline or complete the task."
                : "Keep the task moving.",
        tags: ["task"],
      };
    });
  },
};

export const crmSourceAdapter: FounderOpsSourceAdapter<FounderOpsCrmInput> = {
  kind: "crm",
  normalize(input) {
    const items: FounderOpsAgendaItem[] = [];
    for (const entry of input) {
      items.push({
        id: `crm:account:${entry.id}`,
        kind: "account",
        title: entry.accountName,
        summary: entry.contactName
          ? `Primary contact: ${entry.contactName}.`
          : "CRM account context.",
        source: "crm",
        bucket: "knows",
        state: "open",
        priority: 44,
        updatedAtMs: entry.updatedAtMs,
        stale: false,
        sessionKey: entry.sessionKey,
        recommendedAction: "Confirm the next commercial step.",
        tags: ["crm", "account"],
      });
      if (entry.contactName) {
        items.push({
          id: `crm:contact:${entry.id}`,
          kind: "contact",
          title: entry.contactName,
          summary: `Key contact for ${entry.accountName}.`,
          source: "crm",
          bucket: "knows",
          state: "open",
          priority: 42,
          updatedAtMs: entry.updatedAtMs,
          stale: false,
          sessionKey: entry.sessionKey,
          recommendedAction: "Keep the relationship warm with a clear next step.",
          tags: ["crm", "contact"],
        });
      }
      if (entry.nextAction) {
        items.push({
          id: `crm:follow-up:${entry.id}`,
          kind: "follow_up",
          title: entry.nextAction,
          summary: `Next CRM action for ${entry.accountName}.`,
          source: "crm",
          bucket: "approval",
          state: "open",
          priority: 68,
          updatedAtMs: entry.updatedAtMs,
          stale: false,
          sessionKey: entry.sessionKey,
          recommendedAction: "Approve the external follow-up before sending it.",
          tags: ["crm", "follow-up"],
        });
      }
      if (entry.riskLevel === "high") {
        items.push({
          id: `crm:risk:${entry.id}`,
          kind: "risk",
          title: `${entry.accountName} risk`,
          summary: "High-risk CRM account that can impact execution.",
          source: "crm",
          bucket: "knows",
          state: "blocked",
          priority: 86,
          updatedAtMs: entry.updatedAtMs,
          stale: false,
          sessionKey: entry.sessionKey,
          recommendedAction: "Review the account risk and set a mitigation plan.",
          tags: ["crm", "risk"],
        });
      }
    }
    return items;
  },
};

export function createFounderOpsAgenda(params: {
  chat?: readonly FounderOpsChatInput[];
  calendar?: readonly FounderOpsCalendarInput[];
  tasks?: readonly FounderOpsTaskInput[];
  crm?: readonly FounderOpsCrmInput[];
  extraItems?: readonly FounderOpsAgendaItem[];
  nowMs?: number;
}): FounderOpsAgendaSnapshot {
  const nowMs = params.nowMs ?? Date.now();
  const items = dedupeAndSort([
    ...chatSourceAdapter.normalize(params.chat ?? [], nowMs),
    ...calendarSourceAdapter.normalize(params.calendar ?? [], nowMs),
    ...tasksSourceAdapter.normalize(params.tasks ?? [], nowMs),
    ...crmSourceAdapter.normalize(params.crm ?? [], nowMs),
    ...(params.extraItems ?? []),
  ]);

  const sections: Record<FounderOpsSectionKey, FounderOpsSection> = {
    today: {
      key: "today",
      title: "Today",
      items: items
        .filter(
          (item) =>
            item.bucket !== "approval" &&
            item.kind !== "blocker" &&
            item.kind !== "waiting_on" &&
            !item.stale &&
            item.state !== "done",
        )
        .slice(0, MAX_SECTION_ITEMS),
    },
    blockers: {
      key: "blockers",
      title: "Blockers",
      items: items
        .filter((item) => item.kind === "blocker" || item.kind === "risk")
        .slice(0, MAX_SECTION_ITEMS),
    },
    waiting: {
      key: "waiting",
      title: "Waiting",
      items: items.filter((item) => item.kind === "waiting_on").slice(0, MAX_SECTION_ITEMS),
    },
    approvals: {
      key: "approvals",
      title: "Approvals",
      items: items
        .filter((item) => item.bucket === "approval" || item.kind === "approval")
        .slice(0, MAX_SECTION_ITEMS),
    },
    stale: {
      key: "stale",
      title: "Stale",
      items: items.filter((item) => item.stale).slice(0, MAX_SECTION_ITEMS),
    },
    recommended: {
      key: "recommended",
      title: "Recommended next actions",
      items: items
        .filter((item) => item.state !== "done")
        .map((item) => ({
          ...item,
          summary: item.recommendedAction ?? item.summary,
        }))
        .slice(0, MAX_SECTION_ITEMS),
    },
  };

  return {
    generatedAtMs: nowMs,
    items,
    sections,
    buckets: {
      knows: items.filter((item) => item.bucket === "knows"),
      internal: items.filter((item) => item.bucket === "internal"),
      approval: items.filter((item) => item.bucket === "approval"),
    },
  };
}
