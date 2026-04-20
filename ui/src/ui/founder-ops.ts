import {
  createFounderOpsAgendaFromControlPlane,
  type FounderOpsAgendaSnapshot,
} from "../../../src/founder-ops/control-plane.js";
import type { ExecApprovalRequest } from "./controllers/exec-approval.ts";
import type { CronJob, SessionsListResult } from "./types.ts";

function resolveSessionTitle(session: SessionsListResult["sessions"][number]): string {
  return (
    session.label?.trim() ||
    session.displayName?.trim() ||
    session.subject?.trim() ||
    session.room?.trim() ||
    session.space?.trim() ||
    session.key
  );
}

export function createFounderOpsAgendaFromDashboardData(params: {
  sessionsResult: SessionsListResult | null;
  cronJobs: readonly CronJob[];
  execApprovalQueue?: readonly ExecApprovalRequest[];
  nowMs?: number;
}): FounderOpsAgendaSnapshot {
  return createFounderOpsAgendaFromControlPlane({
    sessions: (params.sessionsResult?.sessions ?? []).map((session) => ({
      key: session.key,
      title: resolveSessionTitle(session),
      updatedAtMs: session.updatedAt ?? params.nowMs ?? Date.now(),
      status: session.status ?? null,
      abortedLastRun: session.abortedLastRun ?? false,
      surface: session.surface ?? null,
      lastMessagePreview: session.lastMessagePreview ?? null,
    })),
    routines: params.cronJobs.map((job) => ({
      id: job.id,
      name: job.name,
      agentId: job.agentId ?? null,
      enabled: job.enabled,
      updatedAtMs: job.updatedAtMs ?? job.createdAtMs ?? params.nowMs ?? Date.now(),
      nextRunAtMs: job.state?.nextRunAtMs,
      lastStatus: job.state?.lastStatus ?? null,
      lastError: job.state?.lastError ?? null,
      sessionTarget: job.sessionTarget,
    })),
    approvals: (params.execApprovalQueue ?? []).map((entry) => ({
      id: entry.id,
      command: entry.request.command,
      ask: entry.request.ask ?? null,
      createdAtMs: entry.createdAtMs,
      sessionKey: entry.request.sessionKey ?? null,
      sourceContext: entry.request.cwd ?? null,
      cwd: entry.request.cwd ?? null,
      host: entry.request.host ?? null,
      resolvedPath: entry.request.resolvedPath ?? null,
      security: entry.request.security ?? null,
    })),
    nowMs: params.nowMs,
  });
}
