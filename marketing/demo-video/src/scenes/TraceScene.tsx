import { AbsoluteFill, useVideoConfig } from "remotion";
import { CheckCircle2, LockKeyhole, ScanLine } from "lucide-react";
import { colors, fonts, radii } from "../theme/tokens";
import { AgdiShell } from "../components/AgdiShell";
import { ContentPane } from "../components/ContentPane";
import { ChatBubble } from "../components/ChatBubble";
import { ToolCard } from "../components/ToolCard";
import { TracePanel } from "../components/TracePanel";

export function TraceScene() {
  const { width } = useVideoConfig();
  const showProofRail = width >= 1400;

  return (
    <AbsoluteFill>
      <AgdiShell active="activity" title="Activity trace">
        <ContentPane>
          <div style={{ display: "grid", gridTemplateColumns: showProofRail ? "600px 1fr" : "1fr", gap: 42 }}>
            <div>
              <ChatBubble
                author="Maya"
                avatarColor={colors.accent}
                text="check if prod is healthy"
                appearAtFrame={0}
              />
              <ChatBubble
                author="ops-agent"
                avatarColor={colors.accent2}
                text="On it. Hitting the health endpoint now."
                appearAtFrame={0}
              >
                <ToolCard
                  appearAtFrame={0}
                  completeAtFrame={0}
                  command='curl -s https://api.example.com/health -o /dev/null -w "%{http_code}\n"'
                  output="200"
                  outputAtFrame={0}
                />
                <TracePanel
                  appearAtFrame={6}
                  fields={[
                    { key: "tool", value: "shell.exec", mono: true, color: colors.accent },
                    {
                      key: "args",
                      value: '{ "cmd": "curl -s https://api.example.com/health" }',
                      mono: true,
                    },
                    { key: "stdout", value: "200", mono: true, color: colors.ok },
                    { key: "exit", value: "0", mono: true, color: colors.ok },
                    { key: "duration", value: "412 ms", mono: true },
                    { key: "assistant", value: "ops-agent - sonnet-4.6" },
                    { key: "machine", value: "team-macbook" },
                    { key: "timestamp", value: "2026-05-07T07:42:18Z", mono: true },
                  ]}
                />
              </ChatBubble>
              <ChatBubble
                author="ops-agent"
                avatarColor={colors.accent2}
                text="All systems green. 412ms."
                appearAtFrame={0}
              />
            </div>
            {showProofRail && <ProofRail />}
          </div>
        </ContentPane>
      </AgdiShell>
    </AbsoluteFill>
  );
}

function ProofRail() {
  return (
    <div
      style={{
        paddingTop: 28,
        display: "grid",
        gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
        gap: 14,
        alignContent: "start",
      }}
    >
      <ProofCard
        title="Runs locally"
        body="The assistant acts through your runtime, not a hidden hosted bot."
        icon={LockKeyhole}
      />
      <ProofCard
        title="Uses real tools"
        body="Every command, status, and output is visible as work happens."
        icon={ScanLine}
      />
      <ProofCard
        title="Leaves a trail"
        body="The activity log shows what ran, where it ran, and what changed."
        icon={CheckCircle2}
      />
    </div>
  );
}

function ProofCard({
  title,
  body,
  icon: Icon,
}: {
  title: string;
  body: string;
  icon: typeof CheckCircle2;
}) {
  return (
    <div
      style={{
        minHeight: 170,
        background: colors.card,
        border: `1px solid ${colors.border}`,
        borderRadius: radii.md,
        padding: 18,
      }}
    >
      <Icon size={22} color={colors.accent} />
      <div
        style={{
          color: colors.textStrong,
          fontFamily: fonts.body,
          fontSize: 15,
          fontWeight: 600,
          marginTop: 14,
        }}
      >
        {title}
      </div>
      <div style={{ color: colors.muted, fontSize: 13, lineHeight: 1.5, marginTop: 8 }}>
        {body}
      </div>
    </div>
  );
}
