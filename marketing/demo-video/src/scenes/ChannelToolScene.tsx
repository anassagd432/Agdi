import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import { Hash } from "lucide-react";
import { colors, fonts } from "../theme/tokens";
import { AgdiShell } from "../components/AgdiShell";
import { ContentPane } from "../components/ContentPane";
import { ChatBubble } from "../components/ChatBubble";
import { ToolCard } from "../components/ToolCard";
import { Cursor, type CursorPoint } from "../components/Cursor";
import { agdiEaseOut } from "../lib/easing";

export function ChannelToolScene() {
  const frame = useCurrentFrame();

  const cursorPath: CursorPoint[] = [
    { frame: 0, x: 1100, y: 200 },
    { frame: 60, x: 920, y: 540 },
    { frame: 240, x: 920, y: 540 },
    { frame: 270, x: 880, y: 580 },
  ];

  return (
    <AbsoluteFill>
      <AgdiShell active="connections" title="Slack - #ops">
        <ContentPane>
          <ChannelHeader />
          <div style={{ marginTop: 16 }}>
            <ChatBubble
              author="Maya"
              avatarColor={colors.accent}
              text="check if prod is healthy"
              appearAtFrame={10}
              typed
              charsPerFrame={2.4}
            />
            <TypingIndicator appearAtFrame={50} disappearAtFrame={75} />
            <ChatBubble
              author="ops-agent"
              avatarColor={colors.accent2}
              text="On it. Hitting the health endpoint now."
              appearAtFrame={75}
              typed
              charsPerFrame={2.4}
            >
              <ToolCard
                appearAtFrame={115}
                completeAtFrame={190}
                command='curl -s https://api.example.com/health -o /dev/null -w "%{http_code}\n"'
                output="200"
                outputAtFrame={170}
              />
            </ChatBubble>
            <ChatBubble
              author="ops-agent"
              avatarColor={colors.accent2}
              text="All systems green. 412ms."
              appearAtFrame={215}
              typed
              charsPerFrame={2.4}
            />
          </div>
        </ContentPane>
      </AgdiShell>
      <Cursor path={cursorPath} />
    </AbsoluteFill>
  );

  void frame;
}

function ChannelHeader() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        paddingBottom: 14,
        borderBottom: `1px solid ${colors.border}`,
      }}
    >
      <Hash size={16} color={colors.muted} />
      <span style={{ color: colors.textStrong, fontWeight: 600, fontSize: 15 }}>ops</span>
      <span style={{ color: colors.muted, fontSize: 12, fontFamily: fonts.mono }}>
        Slack - 1 assistant - 3 teammates
      </span>
    </div>
  );
}

function TypingIndicator({
  appearAtFrame,
  disappearAtFrame,
}: {
  appearAtFrame: number;
  disappearAtFrame: number;
}) {
  const frame = useCurrentFrame();
  if (frame < appearAtFrame || frame >= disappearAtFrame) return null;
  const opacity = interpolate(
    frame,
    [appearAtFrame, appearAtFrame + 6, disappearAtFrame - 6, disappearAtFrame],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: agdiEaseOut },
  );
  return (
    <div
      style={{
        display: "flex",
        gap: 6,
        marginLeft: 44,
        marginBottom: 14,
        opacity,
        alignItems: "center",
        height: 24,
      }}
    >
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: colors.muted,
            opacity:
              0.3 + 0.7 * Math.abs(Math.sin((frame + i * 6) / 6)),
          }}
        />
      ))}
      <span style={{ color: colors.muted, fontSize: 12, marginLeft: 6 }}>
        ops-agent is thinking...
      </span>
    </div>
  );
}
