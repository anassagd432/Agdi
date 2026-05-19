import { useCurrentFrame, AbsoluteFill, interpolate, useVideoConfig } from "remotion";
import { Activity, Bot, GitBranch, Link as LinkIcon, ShieldCheck } from "lucide-react";
import { colors, fonts, radii, shadows } from "../theme/tokens";
import { AgdiShell } from "../components/AgdiShell";
import { ContentPane } from "../components/ContentPane";
import { Cursor, type CursorPoint } from "../components/Cursor";
import type { ActiveNavId } from "../components/Sidebar";
import { agdiEaseOut } from "../lib/easing";

const STOPS: Array<{ id: ActiveNavId; at: number; title: string; y: number }> = [
  { id: "workspace", at: 0, title: "Workspace", y: 158 },
  { id: "assistants", at: 42, title: "Assistants", y: 198 },
  { id: "connections", at: 84, title: "Connections", y: 234 },
  { id: "automations", at: 126, title: "Automations", y: 270 },
  { id: "activity", at: 168, title: "Activity", y: 306 },
];

export function DashboardTourScene() {
  const frame = useCurrentFrame();
  const currentStop = STOPS.reduce((acc, s) => (frame >= s.at ? s : acc), STOPS[0]!);
  const { width } = useVideoConfig();
  const cursorX = width < 1300 ? 112 : 130;

  const cursorPath: CursorPoint[] = [
    { frame: -10, x: width * 0.52, y: 540 },
    ...STOPS.map((s) => ({ frame: s.at + 8, x: cursorX, y: s.y, click: true })),
  ];

  return (
    <AbsoluteFill>
      <AgdiShell active={currentStop.id} title={currentStop.title}>
        <ContentPane>
          <PaneContent stop={currentStop} frame={frame} />
        </ContentPane>
      </AgdiShell>
      <Cursor path={cursorPath} />
    </AbsoluteFill>
  );
}

function PaneContent({
  stop,
  frame,
}: {
  stop: (typeof STOPS)[number];
  frame: number;
}) {
  const opacity = interpolate(frame, [stop.at + 2, stop.at + 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: agdiEaseOut,
  });
  const translateY = interpolate(frame, [stop.at + 2, stop.at + 12], [10, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: agdiEaseOut,
  });

  return (
    <div
      key={stop.id}
      style={{
        opacity,
        transform: `translateY(${translateY}px)`,
        height: "100%",
      }}
    >
      {stop.id === "workspace" && <WorkspacePane />}
      {stop.id === "assistants" && <AssistantsPane />}
      {stop.id === "connections" && <ConnectionsPane />}
      {stop.id === "automations" && <AutomationsPane />}
      {stop.id === "activity" && <ActivityPane />}
    </div>
  );
}

function PageHeading({ title, sub }: { title: string; sub: string }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div
        style={{
          color: colors.textStrong,
          fontSize: 22,
          fontWeight: 600,
          letterSpacing: 0,
        }}
      >
        {title}
      </div>
      <div style={{ color: colors.muted, fontSize: 13, marginTop: 4 }}>{sub}</div>
    </div>
  );
}

function StatCard({
  label,
  value,
  delta,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  delta: string;
  icon: typeof Activity;
  accent: string;
}) {
  return (
    <div
      style={{
        background: colors.card,
        border: `1px solid ${colors.border}`,
        borderRadius: radii.md,
        padding: "18px 20px",
        boxShadow: shadows.sm,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 12,
        }}
      >
        <span style={{ color: colors.muted, fontSize: 12 }}>{label}</span>
        <Icon size={16} color={accent} />
      </div>
      <div
        style={{
          color: colors.textStrong,
          fontSize: 28,
          fontWeight: 600,
          fontFamily: fonts.mono,
          letterSpacing: 0,
        }}
      >
        {value}
      </div>
      <div style={{ color: colors.ok, fontSize: 12, marginTop: 4 }}>{delta}</div>
    </div>
  );
}

function WorkspacePane() {
  const { width } = useVideoConfig();
  const columns = width < 1300 ? "repeat(2, minmax(0, 1fr))" : "repeat(4, 1fr)";
  return (
    <>
      <PageHeading title="Workspace" sub="Live runtime activity across assistants, connections, and automations." />
      <div style={{ display: "grid", gridTemplateColumns: columns, gap: 14 }}>
        <StatCard label="Assistants" value="6" delta="+2 today" icon={Bot} accent={colors.accent} />
        <StatCard label="Connections" value="9" delta="all online" icon={LinkIcon} accent={colors.accent2} />
        <StatCard label="Automations" value="18" delta="4 running" icon={GitBranch} accent={colors.accent} />
        <StatCard label="Actions traced" value="412" delta="+18%" icon={ShieldCheck} accent={colors.ok} />
      </div>
      <div
        style={{
          marginTop: 18,
          background: colors.card,
          border: `1px solid ${colors.border}`,
          borderRadius: radii.md,
          padding: 20,
          height: width < 1300 ? 180 : 220,
        }}
      >
        <div style={{ color: colors.muted, fontSize: 12, marginBottom: 8 }}>Activity</div>
        <Sparkline />
      </div>
    </>
  );
}

function Sparkline() {
  const points = [12, 18, 14, 22, 30, 24, 32, 38, 28, 36, 44, 40, 52, 48, 60, 56, 68, 72, 64, 80];
  const max = 100;
  const w = 1100;
  const h = 140;
  const stepX = w / (points.length - 1);
  const path =
    "M " +
    points.map((p, i) => `${i * stepX} ${h - (p / max) * h}`).join(" L ");
  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id="activity-gradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={colors.accent} stopOpacity={0.4} />
          <stop offset="1" stopColor={colors.accent} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={`${path} L ${w} ${h} L 0 ${h} Z`} fill="url(#activity-gradient)" />
      <path d={path} stroke={colors.accent} strokeWidth={2} fill="none" />
    </svg>
  );
}

function ListPane({
  rows,
}: {
  rows: Array<{ name: string; sub: string; status: "ok" | "warn"; meta: string }>;
}) {
  return (
    <div
      style={{
        background: colors.card,
        border: `1px solid ${colors.border}`,
        borderRadius: radii.md,
        overflow: "hidden",
      }}
    >
      {rows.map((r, i) => (
        <div
          key={r.name}
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto auto",
            alignItems: "center",
            gap: 16,
            padding: "14px 18px",
            borderTop: i === 0 ? "none" : `1px solid ${colors.border}`,
          }}
        >
          <div>
            <div style={{ color: colors.textStrong, fontSize: 14, fontWeight: 500 }}>{r.name}</div>
            <div style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>{r.sub}</div>
          </div>
          <div style={{ color: colors.muted, fontSize: 12, fontFamily: fonts.mono }}>{r.meta}</div>
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              padding: "3px 10px",
              borderRadius: 999,
              background: r.status === "ok" ? "rgba(34,197,94,0.08)" : "rgba(245,158,11,0.08)",
              color: r.status === "ok" ? colors.ok : colors.warn,
              border: `1px solid ${r.status === "ok" ? colors.ok : colors.warn}`,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}
          >
            {r.status === "ok" ? "Online" : "Idle"}
          </span>
        </div>
      ))}
    </div>
  );
}

function AssistantsPane() {
  return (
    <>
      <PageHeading title="Assistants" sub="Long-lived helpers that can act across your workspace." />
      <ListPane
        rows={[
          { name: "ops-agent", sub: "sonnet-4.6 - 9 tools", status: "ok", meta: "uptime 7d" },
          { name: "research-agent", sub: "gpt-5.4 - 14 tools", status: "ok", meta: "uptime 2d" },
          { name: "triage-agent", sub: "haiku-4.5 - 6 tools", status: "ok", meta: "uptime 12h" },
        ]}
      />
    </>
  );
}

function ConnectionsPane() {
  return (
    <>
      <PageHeading title="Connections" sub="Where assistants listen, respond, and receive work." />
      <ListPane
        rows={[
          { name: "Discord - agdi-lab", sub: "Team space", status: "ok", meta: "4 msgs/h" },
          { name: "Matrix - #agents:matrix.org", sub: "Federated room", status: "warn", meta: "0 msgs/h" },
          { name: "Slack - #ops", sub: "Workspace: Acme", status: "ok", meta: "12 msgs/h" },
          { name: "Telegram - @ops_agent", sub: "Direct + 2 groups", status: "ok", meta: "29 msgs/h" },
        ]}
      />
    </>
  );
}

function AutomationsPane() {
  return (
    <>
      <PageHeading title="Automations" sub="Scheduled and event-driven jobs your assistants can run." />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12 }}>
        {[
          "daily.ops-report",
          "incident.triage",
          "pull-request.review",
          "customer.follow-up",
          "deploy.health-check",
          "meeting.brief",
          "channel.reply",
          "trace.emit",
          "workspace.backup",
        ].map((s) => (
          <div
            key={s}
            style={{
              background: colors.card,
              border: `1px solid ${colors.border}`,
              borderRadius: radii.md,
              padding: "14px 16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span style={{ color: colors.textStrong, fontFamily: fonts.mono, fontSize: 13 }}>
              {s}
            </span>
            <span style={{ color: colors.ok, fontSize: 11, fontWeight: 600 }}>READY</span>
          </div>
        ))}
      </div>
    </>
  );
}

function ActivityPane() {
  return (
    <>
      <PageHeading title="Activity" sub="A complete trail of assistant decisions, tools, and outputs." />
      <ListPane
        rows={[
          { name: "shell.exec", sub: "Health check returned 200", status: "ok", meta: "412 ms" },
          { name: "channel.reply", sub: "Posted summary to Slack #ops", status: "ok", meta: "88 ms" },
          { name: "git.diff", sub: "Reviewed deployment changes", status: "ok", meta: "1.2 s" },
          { name: "approval.wait", sub: "Waiting for operator approval", status: "warn", meta: "open" },
        ]}
      />
    </>
  );
}

export const DASHBOARD_TOUR_FRAMES = 210;
