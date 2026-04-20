import {
  createApprovalAgendaItem,
  createFounderOpsAgenda,
  type FounderOpsAgendaItem,
  type FounderOpsAgendaSnapshot,
} from "./agenda.js";
import { toAgentStoreSessionKey } from "../routing/session-key.js";
export type { FounderOpsAgendaSnapshot } from "./agenda.js";

const DAY_MS = 24 * 60 * 60 * 1000;

export type FounderRoutineFamily =
  | "morning-brief"
  | "meeting-prep"
  | "follow-up-sweep"
  | "stale-blocker-review"
  | "end-of-day-recap";

export type FounderOpsSessionSignal = {
  key: string;
  title: string;
  updatedAtMs: number;
  status?: string | null;
  abortedLastRun?: boolean;
  surface?: string | null;
  lastMessagePreview?: string | null;
};

export type FounderOpsRoutineSignal = {
  id: string;
  name: string;
  agentId?: string | null;
  enabled: boolean;
  updatedAtMs: number;
  nextRunAtMs?: number;
  lastStatus?: string | null;
  lastError?: string | null;
  sessionTarget?: string | null;
  sessionKey?: string | null;
};

export type FounderOpsApprovalSignal = {
  id: string;
  command: string;
  ask?: string | null;
  createdAtMs: number;
  sessionKey?: string | null;
  sourceContext?: string | null;
  cwd?: string | null;
  host?: string | null;
  resolvedPath?: string | null;
  security?: string | null;
};

export type FounderOpsApprovalDescriptor = {
  title: string;
  summary: string;
  rationale: string;
  sourceContext: string;
  expectedOutcome: string;
  consequenceOfDelay: string;
  timeoutFallback: "escalate";
  labels: {
    approveOnce: string;
    approveAlways: string;
    reject: string;
  };
};

type RoutineOutputMatch = {
  kind: FounderOpsAgendaItem["kind"];
  title: string;
};

function slugifyRoutineLabel(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function resolveFounderRoutineFamily(params: {
  id?: string | null;
  name?: string | null;
}): FounderRoutineFamily | null {
  const normalized = [params.id, params.name]
    .map((value) => slugifyRoutineLabel(String(value ?? "")))
    .filter(Boolean);
  if (normalized.some((value) => value.includes("morning-brief"))) {
    return "morning-brief";
  }
  if (normalized.some((value) => value.includes("meeting-prep"))) {
    return "meeting-prep";
  }
  if (
    normalized.some(
      (value) => value.includes("follow-up-sweep") || value.includes("followup-sweep"),
    )
  ) {
    return "follow-up-sweep";
  }
  if (normalized.some((value) => value.includes("stale-blocker-review"))) {
    return "stale-blocker-review";
  }
  if (
    normalized.some((value) => value.includes("end-of-day-recap") || value.includes("eod-recap"))
  ) {
    return "end-of-day-recap";
  }
  return null;
}

export function resolveFounderRoutineSessionRequestKey(params: {
  id?: string | null;
  name?: string | null;
  sessionTarget?: string | null;
}): string | null {
  const sessionTarget = params.sessionTarget?.trim();
  if (sessionTarget?.startsWith("session:")) {
    const customKey = sessionTarget.slice("session:".length).trim();
    return customKey || null;
  }
  const family = resolveFounderRoutineFamily(params);
  if (family) {
    return `founder-ops:routine:${family}`;
  }
  const jobId = params.id?.trim();
  return jobId ? `cron:${jobId}` : null;
}

export function resolveFounderRoutineSessionKey(params: {
  id?: string | null;
  name?: string | null;
  agentId?: string | null;
  sessionTarget?: string | null;
  sessionKey?: string | null;
}): string | undefined {
  const explicitSessionKey = params.sessionKey?.trim();
  if (explicitSessionKey) {
    return explicitSessionKey;
  }
  const requestKey = resolveFounderRoutineSessionRequestKey(params);
  if (!requestKey) {
    return undefined;
  }
  return toAgentStoreSessionKey({
    agentId: params.agentId ?? "main",
    requestKey,
  });
}

export function describeFounderOpsApproval(params: {
  command: string;
  ask?: string | null;
  sessionKey?: string | null;
  sourceContext?: string | null;
  cwd?: string | null;
  host?: string | null;
  resolvedPath?: string | null;
  security?: string | null;
}): FounderOpsApprovalDescriptor {
  const actionTitle = params.ask?.trim() || "External action pending approval";
  const contextParts = [
    params.sourceContext?.trim(),
    params.cwd?.trim(),
    params.resolvedPath?.trim(),
    params.sessionKey?.trim() ? `thread ${params.sessionKey.trim()}` : "",
    params.host?.trim() ? `host ${params.host.trim()}` : "",
  ].filter(Boolean);
  const sourceContext =
    contextParts.length > 0 ? contextParts.join(" | ") : "No additional source context available.";
  const security = params.security?.trim();
  const rationale = security
    ? `Agdi paused this step because it crosses an external or security-sensitive boundary (${security}).`
    : "Agdi paused this step because it can create an external side effect.";
  return {
    title: actionTitle,
    summary: params.command.trim(),
    rationale,
    sourceContext,
    expectedOutcome: `Complete the requested step without Agdi taking the external action automatically: ${actionTitle}.`,
    consequenceOfDelay: "External follow-through stays blocked until the founder responds.",
    timeoutFallback: "escalate",
    labels: {
      approveOnce: "Approve once",
      approveAlways: "Always approve",
      reject: "Reject",
    },
  };
}

function buildSessionAgendaItems(
  sessions: readonly FounderOpsSessionSignal[],
  nowMs: number,
): FounderOpsAgendaItem[] {
  return sessions.map((session) => {
    const stale = nowMs - session.updatedAtMs > 3 * DAY_MS;
    const isBlocked = Boolean(session.abortedLastRun) || session.status === "error";
    const isWaiting = session.status === "waiting";
    return {
      id: `session:${session.key}`,
      kind: isBlocked ? "blocker" : isWaiting ? "waiting_on" : "follow_up",
      title: session.title,
      summary: isBlocked
        ? "Recent thread is blocked and needs intervention."
        : isWaiting
          ? "Thread is waiting on a dependency."
          : `Active thread on ${session.surface ?? "Agdi"}.`,
      source: "session",
      bucket: "knows",
      state: stale ? "stale" : isBlocked ? "blocked" : isWaiting ? "waiting" : "open",
      priority: isBlocked ? 84 : isWaiting ? 70 : stale ? 58 : 52,
      updatedAtMs: session.updatedAtMs,
      stale,
      sessionKey: session.key,
      recommendedAction: isBlocked
        ? "Open the thread and remove the blocker."
        : isWaiting
          ? "Check the dependency and set a follow-up date."
          : "Review the thread and assign the next step.",
      tags: ["session", session.surface ?? "unknown"],
    };
  });
}

function resolveRoutineKindPriority(kind: FounderOpsAgendaItem["kind"]) {
  switch (kind) {
    case "blocker":
      return { bucket: "knows" as const, state: "blocked" as const, priority: 88 };
    case "waiting_on":
      return { bucket: "knows" as const, state: "waiting" as const, priority: 76 };
    case "decision":
      return { bucket: "internal" as const, state: "open" as const, priority: 68 };
    case "task":
      return { bucket: "internal" as const, state: "open" as const, priority: 64 };
    case "follow_up":
      return { bucket: "internal" as const, state: "open" as const, priority: 72 };
    case "routine":
    default:
      return { bucket: "internal" as const, state: "open" as const, priority: 54 };
  }
}

function resolveRoutineHeadingKind(line: string): FounderOpsAgendaItem["kind"] | null {
  const normalized = slugifyRoutineLabel(line.replace(/^#+\s*/, "").replace(/:$/, ""));
  if (normalized === "blockers" || normalized === "blocker") {
    return "blocker";
  }
  if (
    normalized === "waiting" ||
    normalized === "waiting-on" ||
    normalized === "waitingon"
  ) {
    return "waiting_on";
  }
  if (normalized === "decisions" || normalized === "decision") {
    return "decision";
  }
  if (normalized === "tasks" || normalized === "task") {
    return "task";
  }
  if (
    normalized === "follow-ups" ||
    normalized === "follow-up" ||
    normalized === "followups" ||
    normalized === "followup"
  ) {
    return "follow_up";
  }
  if (normalized === "routine" || normalized === "routines") {
    return "routine";
  }
  return null;
}

function parseRoutineOutputLine(line: string): RoutineOutputMatch | null {
  const prefixed = line.match(
    /^(blocker|waiting(?: on)?|decision|task|follow[- ]?up|routine)\s*:\s*(.+)$/i,
  );
  if (!prefixed) {
    return null;
  }
  const rawKind = slugifyRoutineLabel(prefixed[1] ?? "");
  const title = (prefixed[2] ?? "").trim();
  if (!title) {
    return null;
  }
  const kind =
    rawKind === "blocker"
      ? "blocker"
      : rawKind === "waiting" || rawKind === "waiting-on" || rawKind === "waitingon"
        ? "waiting_on"
        : rawKind === "decision"
          ? "decision"
          : rawKind === "task"
            ? "task"
            : rawKind === "follow-up" || rawKind === "followup"
              ? "follow_up"
              : "routine";
  return { kind, title };
}

function parseRoutineSessionOutput(params: {
  family: FounderRoutineFamily;
  sessionKey: string;
  updatedAtMs: number;
  preview: string;
}): FounderOpsAgendaItem[] {
  const lines = params.preview
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const matches: RoutineOutputMatch[] = [];
  let activeKind: FounderOpsAgendaItem["kind"] | null = null;

  for (const line of lines) {
    const prefixed = parseRoutineOutputLine(line);
    if (prefixed) {
      matches.push(prefixed);
      activeKind = null;
      continue;
    }
    const headingKind = resolveRoutineHeadingKind(line);
    if (headingKind) {
      activeKind = headingKind;
      continue;
    }
    const bullet = line.match(/^[-*]\s+(.+)$/);
    if (bullet && activeKind) {
      const title = bullet[1]?.trim();
      if (title) {
        matches.push({ kind: activeKind, title });
      }
      continue;
    }
  }

  if (matches.length === 0) {
    const summary = params.preview.trim();
    if (!summary) {
      return [];
    }
    return [
      {
        id: `routine-output:${params.family}:summary`,
        kind: "routine",
        title: summary.length > 72 ? `${summary.slice(0, 69)}...` : summary,
        summary,
        source: "routine",
        bucket: "internal",
        state: "open",
        priority: 52,
        updatedAtMs: params.updatedAtMs,
        stale: false,
        sessionKey: params.sessionKey,
        recommendedAction: "Open the routine thread and turn the summary into the next action.",
        tags: ["routine-output", params.family],
      },
    ];
  }

  return matches.map((match, index) => {
    const presentation = resolveRoutineKindPriority(match.kind);
    return {
      id: `routine-output:${params.family}:${index}:${slugifyRoutineLabel(match.title)}`,
      kind: match.kind,
      title: match.title,
      summary: `Derived from the ${params.family.replace(/-/g, " ")} routine thread.`,
      source: "routine",
      bucket: presentation.bucket,
      state: presentation.state,
      priority: presentation.priority,
      updatedAtMs: params.updatedAtMs,
      stale: false,
      sessionKey: params.sessionKey,
      recommendedAction:
        match.kind === "blocker"
          ? "Open the routine thread and clear the blocker."
          : match.kind === "waiting_on"
            ? "Open the thread and chase the dependency owner."
            : "Open the routine thread and carry the action forward.",
      tags: ["routine-output", params.family],
    };
  });
}

function buildRoutineAgendaItems(
  routines: readonly FounderOpsRoutineSignal[],
  sessions: readonly FounderOpsSessionSignal[],
  nowMs: number,
): FounderOpsAgendaItem[] {
  const items: FounderOpsAgendaItem[] = [];
  const sessionsByKey = new Map(sessions.map((session) => [session.key, session]));
  for (const routine of routines) {
    const family = resolveFounderRoutineFamily(routine);
    const sessionKey = resolveFounderRoutineSessionKey(routine);
    const session = sessionKey ? sessionsByKey.get(sessionKey) : undefined;
    const nextRunSoon =
      typeof routine.nextRunAtMs === "number" && routine.nextRunAtMs - nowMs <= DAY_MS;
    items.push({
      id: `routine:${routine.id}`,
      kind: "routine",
      title: routine.name,
      summary: nextRunSoon ? "Routine is due within the next 24 hours." : "Standing founder routine.",
      source: "routine",
      bucket: "internal",
      state: routine.enabled ? "open" : "done",
      priority: nextRunSoon ? 46 : 28,
      updatedAtMs: routine.updatedAtMs,
      stale: false,
      sessionKey,
      recommendedAction: "Run the routine or confirm the latest output.",
      tags: ["routine", ...(family ? [family] : [])],
    });
    if (family && sessionKey && session?.lastMessagePreview) {
      items.push(
        ...parseRoutineSessionOutput({
          family,
          sessionKey,
          updatedAtMs: session.updatedAtMs,
          preview: session.lastMessagePreview,
        }),
      );
    }
    if (routine.lastStatus === "error") {
      items.push({
        id: `routine:blocker:${routine.id}`,
        kind: "blocker",
        title: `${routine.name} failed`,
        summary: routine.lastError || "Routine execution failed.",
        source: "routine",
        bucket: "knows",
        state: "blocked",
        priority: 82,
        updatedAtMs: routine.updatedAtMs,
        stale: false,
        sessionKey,
        recommendedAction: "Inspect the failing routine and repair it.",
        tags: ["routine", "error"],
      });
    }
  }
  return items;
}

function buildApprovalAgendaItems(
  approvals: readonly FounderOpsApprovalSignal[],
): FounderOpsAgendaItem[] {
  return approvals.map((approval) => {
    const descriptor = describeFounderOpsApproval(approval);
    return createApprovalAgendaItem({
      id: approval.id,
      title: descriptor.title,
      summary: descriptor.summary,
      rationale: descriptor.rationale,
      updatedAtMs: approval.createdAtMs,
      sessionKey: approval.sessionKey ?? undefined,
      sourceContext: descriptor.sourceContext,
      expectedOutcome: descriptor.expectedOutcome,
      consequenceOfDelay: descriptor.consequenceOfDelay,
      timeoutFallback: descriptor.timeoutFallback,
      recommendedAction: "Approve, reject, or redirect the external action.",
    });
  });
}

export function createFounderOpsAgendaFromControlPlane(params: {
  sessions?: readonly FounderOpsSessionSignal[];
  routines?: readonly FounderOpsRoutineSignal[];
  approvals?: readonly FounderOpsApprovalSignal[];
  nowMs?: number;
}): FounderOpsAgendaSnapshot {
  const nowMs = params.nowMs ?? Date.now();
  return createFounderOpsAgenda({
    extraItems: [
      ...buildSessionAgendaItems(params.sessions ?? [], nowMs),
      ...buildRoutineAgendaItems(params.routines ?? [], params.sessions ?? [], nowMs),
      ...buildApprovalAgendaItems(params.approvals ?? []),
    ],
    nowMs,
  });
}
