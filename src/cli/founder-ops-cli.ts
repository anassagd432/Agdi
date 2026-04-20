import type { Command } from "commander";
import {
  createFounderOpsAgendaFromControlPlane,
  type FounderOpsAgendaItem,
  resolveFounderRoutineSessionKey,
} from "../founder-ops/control-plane.js";
import { defaultRuntime } from "../runtime.js";
import { formatDocsLink } from "../terminal/links.js";
import { theme } from "../terminal/theme.js";
import { addGatewayClientOptions, callGatewayFromCli, type GatewayRpcOpts } from "./gateway-rpc.js";

type FounderOpsCliOpts = GatewayRpcOpts & {
  json?: boolean;
};

type SessionsListResponse = {
  sessions?: Array<{
    key: string;
    label?: string;
    displayName?: string;
    subject?: string;
    room?: string;
    space?: string;
    updatedAt?: number | null;
    status?: string | null;
    abortedLastRun?: boolean;
    surface?: string | null;
    lastMessagePreview?: string | null;
  }>;
};

type CronListResponse = {
  jobs?: Array<{
    id: string;
    name: string;
    agentId?: string | null;
    enabled: boolean;
    createdAtMs?: number;
    updatedAtMs?: number;
    sessionTarget?: string;
    state?: {
      nextRunAtMs?: number;
      lastStatus?: string | null;
      lastError?: string | null;
    };
  }>;
};

type ApprovalListResponse = {
  approvals?: Array<{
    id: string;
    createdAtMs: number;
    request: {
      command: string;
      ask?: string | null;
      sessionKey?: string | null;
      cwd?: string | null;
    };
  }>;
};

function resolveSessionTitle(session: NonNullable<SessionsListResponse["sessions"]>[number]): string {
  return (
    session.label?.trim() ||
    session.displayName?.trim() ||
    session.subject?.trim() ||
    session.room?.trim() ||
    session.space?.trim() ||
    session.key
  );
}

async function loadFounderOpsSnapshot(opts: FounderOpsCliOpts) {
  const [sessionsResponse, cronResponse, approvalsResponse] = await Promise.all([
    callGatewayFromCli("sessions.list", opts, {
      includeGlobal: true,
      includeUnknown: true,
      limit: 200,
      includeLastMessage: true,
    }),
    callGatewayFromCli("cron.list", opts, {
      includeDisabled: true,
      limit: 200,
      offset: 0,
      sortBy: "nextRunAtMs",
      sortDir: "asc",
    }),
    callGatewayFromCli("exec.approval.list", opts, {}),
  ]);

  const sessions = ((sessionsResponse as SessionsListResponse).sessions ?? []).map((session) => ({
    key: session.key,
    title: resolveSessionTitle(session),
    updatedAtMs: session.updatedAt ?? Date.now(),
    status: session.status ?? null,
    abortedLastRun: session.abortedLastRun ?? false,
    surface: session.surface ?? null,
    lastMessagePreview: session.lastMessagePreview ?? null,
  }));
  const routines = ((cronResponse as CronListResponse).jobs ?? []).map((job) => ({
    id: job.id,
    name: job.name,
    agentId: job.agentId ?? "main",
    enabled: job.enabled,
    updatedAtMs: job.updatedAtMs ?? job.createdAtMs ?? Date.now(),
    nextRunAtMs: job.state?.nextRunAtMs,
    lastStatus: job.state?.lastStatus ?? null,
    lastError: job.state?.lastError ?? null,
    sessionTarget: job.sessionTarget ?? null,
  }));
  const approvals = ((approvalsResponse as ApprovalListResponse).approvals ?? []).map((approval) => ({
    id: approval.id,
    command: approval.request.command,
    ask: approval.request.ask ?? null,
    createdAtMs: approval.createdAtMs,
    sessionKey: approval.request.sessionKey ?? null,
    sourceContext: approval.request.cwd ?? null,
    cwd: approval.request.cwd ?? null,
  }));

  return createFounderOpsAgendaFromControlPlane({ sessions, routines, approvals });
}

function renderItems(items: readonly FounderOpsAgendaItem[]) {
  if (items.length === 0) {
    defaultRuntime.log(theme.muted("  none"));
    return;
  }
  for (const item of items) {
    defaultRuntime.log(`  - ${item.title}`);
    defaultRuntime.log(theme.muted(`    ${item.summary}`));
    if (item.rationale) {
      defaultRuntime.log(theme.muted(`    Why: ${item.rationale}`));
    }
    if (item.sourceContext) {
      defaultRuntime.log(theme.muted(`    Context: ${item.sourceContext}`));
    }
    if (item.expectedOutcome) {
      defaultRuntime.log(theme.muted(`    Outcome: ${item.expectedOutcome}`));
    }
    if (item.consequenceOfDelay) {
      defaultRuntime.log(theme.muted(`    Delay: ${item.consequenceOfDelay}`));
    }
    if (item.timeoutFallback) {
      defaultRuntime.log(theme.muted(`    Timeout fallback: ${item.timeoutFallback}`));
    }
    if (item.sessionKey) {
      defaultRuntime.log(theme.muted(`    Thread: ${item.sessionKey}`));
    }
  }
}

function renderAgenda(snapshot: Awaited<ReturnType<typeof loadFounderOpsSnapshot>>) {
  defaultRuntime.log(theme.heading("Founder Ops"));
  defaultRuntime.log(
    theme.muted(
      `Buckets: knows=${snapshot.buckets.knows.length}, internal=${snapshot.buckets.internal.length}, approvals=${snapshot.buckets.approval.length}`,
    ),
  );
  defaultRuntime.log("");
  for (const section of [
    snapshot.sections.today,
    snapshot.sections.blockers,
    snapshot.sections.waiting,
    snapshot.sections.approvals,
    snapshot.sections.stale,
    snapshot.sections.recommended,
  ]) {
    defaultRuntime.log(theme.heading(section.title));
    renderItems(section.items);
    defaultRuntime.log("");
  }
}

export function registerFounderOpsCli(program: Command) {
  const ops = addGatewayClientOptions(
    program
      .command("ops")
      .description("Founder operations command center via Gateway")
      .addHelpText(
        "after",
        () =>
          `\n${theme.muted("Docs:")} ${formatDocsLink("/cli/status", "docs.openclaw.ai/cli/status")}\n`,
      ),
  );

  ops
    .command("brief")
    .description("Show the live founder-ops command center brief")
    .option("--json", "Output JSON instead of text", false)
    .action(async (opts: FounderOpsCliOpts) => {
      const snapshot = await loadFounderOpsSnapshot(opts);
      if (opts.json) {
        defaultRuntime.writeJson(snapshot, 0);
        return;
      }
      renderAgenda(snapshot);
    });

  ops
    .command("approvals")
    .description("Show pending founder-facing approval actions")
    .option("--json", "Output JSON instead of text", false)
    .action(async (opts: FounderOpsCliOpts) => {
      const snapshot = await loadFounderOpsSnapshot(opts);
      if (opts.json) {
        defaultRuntime.writeJson(snapshot.sections.approvals.items, 0);
        return;
      }
      defaultRuntime.log(theme.heading("Founder approvals"));
      renderItems(snapshot.sections.approvals.items);
    });

  ops
    .command("resync")
    .description("Rebuild the founder-ops agenda snapshot from live gateway state")
    .option("--json", "Output JSON instead of text", false)
    .action(async (opts: FounderOpsCliOpts) => {
      const snapshot = await loadFounderOpsSnapshot(opts);
      if (opts.json) {
        defaultRuntime.writeJson(snapshot, 0);
        return;
      }
      defaultRuntime.log("Agenda snapshot rebuilt from live gateway state.");
      defaultRuntime.log("");
      renderAgenda(snapshot);
    });

  ops
    .command("threads")
    .description("Inspect active founder work threads")
    .option("--json", "Output JSON instead of text", false)
    .action(async (opts: FounderOpsCliOpts) => {
      const snapshot = await loadFounderOpsSnapshot(opts);
      const threads = Array.from(
        new Map(
          snapshot.items
            .filter((item) => typeof item.sessionKey === "string" && item.sessionKey.length > 0)
            .map((item) => [
              `${item.sessionKey}:${item.kind}:${item.title}`,
              {
                sessionKey: item.sessionKey!,
                title: item.title,
                kind: item.kind,
                state: item.state,
              },
            ]),
        ).values(),
      );
      if (opts.json) {
        defaultRuntime.writeJson(threads, 0);
        return;
      }
      defaultRuntime.log(theme.heading("Founder threads"));
      if (threads.length === 0) {
        defaultRuntime.log(theme.muted("  none"));
        return;
      }
      for (const thread of threads) {
        defaultRuntime.log(`  - ${thread.title} (${thread.kind})`);
        defaultRuntime.log(theme.muted(`    ${thread.sessionKey}`));
      }
    });

  ops
    .command("routine-trigger <jobId>")
    .description("Trigger a founder routine now")
    .action(async (jobId: string, opts: FounderOpsCliOpts) => {
      const response = await callGatewayFromCli("cron.run", opts, { id: jobId, mode: "force" });
      if (opts.json) {
        defaultRuntime.writeJson(response, 0);
        return;
      }
      defaultRuntime.log(`Triggered routine ${jobId}.`);
      const cronResponse = await callGatewayFromCli("cron.list", opts, {
        includeDisabled: true,
        limit: 200,
        offset: 0,
        sortBy: "nextRunAtMs",
        sortDir: "asc",
      });
      const job = (cronResponse as CronListResponse).jobs?.find((entry) => entry.id === jobId);
      const threadKey = job
        ? resolveFounderRoutineSessionKey({
            id: job.id,
            name: job.name,
            agentId: job.agentId ?? "main",
            sessionTarget: job.sessionTarget ?? null,
          })
        : undefined;
      if (threadKey) {
        defaultRuntime.log(theme.muted(`Routine thread: ${threadKey}`));
      }
    });
}
