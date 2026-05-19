import { AbsoluteFill, useVideoConfig, useCurrentFrame, interpolate } from "remotion";
import { GmailWindow } from "../../components/desktop/GmailWindow";
import { CalendarWidget } from "../../components/desktop/CalendarWidget";
import { BrowserTab } from "../../components/desktop/BrowserTab";
import { ToolCard } from "../../components/ToolCard";
import { TracePanel } from "../../components/TracePanel";
import { colors, fonts, whatsapp } from "../../theme/tokens";
import { agdiEaseOut } from "../../lib/easing";

export function AutonomousWorkScene() {
  const { width, height } = useVideoConfig();
  const frame = useCurrentFrame();
  const isPortrait = height > width;
  const isSquare = Math.abs(height - width) < 100;

  return (
    <AbsoluteFill style={{ background: colors.bg }}>
      {/* Gmail compose window */}
      <div
        style={{
          position: "absolute",
          left: isPortrait ? 40 : isSquare ? 30 : 60,
          top: isPortrait ? 40 : isSquare ? 50 : 80,
          maxWidth: isSquare ? width * 0.48 : undefined,
        }}
      >
        <GmailWindow
          to="team@company.com"
          subject="Standup moved to 11am tomorrow"
          body="Hi team,\n\nJust a heads up - tomorrow's standup is moved to 11am to avoid the conflict with the design review.\n\nSee you there!\nBest"
          appearAtFrame={0}
          typingStartFrame={10}
        />
      </div>

      {/* Right column: Calendar + Browser + ToolCards */}
      <div
        style={{
          position: "absolute",
          right: isPortrait ? 40 : isSquare ? 30 : 60,
          top: isPortrait ? height * 0.48 : isSquare ? 50 : 60,
          display: "flex",
          flexDirection: "column",
          gap: isSquare ? 10 : 14,
          width: isPortrait ? width - 80 : isSquare ? width * 0.44 : width * 0.38,
        }}
      >
        <CalendarWidget
          appearAtFrame={30}
          events={[
            { time: "9:00 AM", title: "Design Review", color: "#4285f4" },
            { time: "11:00 AM", title: "Standup (moved)", color: "#34a853" },
            { time: "2:00 PM", title: "Sprint Planning", color: "#ea4335" },
          ]}
        />

        <BrowserTab
          title="Agdi Deploy"
          url="deploy.agdi.dev/status"
          appearAtFrame={80}
          items={[
            { label: "API Gateway", status: "ok" },
            { label: "Worker Pool", status: "ok" },
            { label: "Database", status: "ok" },
          ]}
        />

        <ToolCard
          appearAtFrame={120}
          completeAtFrame={150}
          command="git status"
          output="On branch main — nothing to commit"
          outputAtFrame={138}
        />
      </div>

      {/* Trace panel slides up from bottom */}
      <div
        style={{
          position: "absolute",
          bottom: 30,
          left: isPortrait ? 20 : width * 0.25,
          right: isPortrait ? 20 : width * 0.25,
        }}
      >
        <TracePanel
          appearAtFrame={140}
          fields={[
            { key: "Model", value: "claude-sonnet-4-5" },
            { key: "Tools", value: "calendar, gmail, git, deploy" },
            { key: "Duration", value: "4.2s" },
            { key: "Tokens", value: "1,847" },
          ]}
        />
      </div>

      {/* Phone corner showing update */}
      {frame >= 100 && (
        <PhoneCornerNotification frame={frame} width={width} height={height} isPortrait={isPortrait} />
      )}
    </AbsoluteFill>
  );
}

function PhoneCornerNotification({
  frame,
  width,
  height,
  isPortrait,
}: {
  frame: number;
  width: number;
  height: number;
  isPortrait: boolean;
}) {
  const opacity = interpolate(frame, [100, 108], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: agdiEaseOut,
  });

  const translateY = interpolate(frame, [100, 112], [20, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: agdiEaseOut,
  });

  return (
    <div
      style={{
        position: "absolute",
        left: isPortrait ? 40 : undefined,
        right: isPortrait ? 40 : 40,
        bottom: isPortrait ? 40 : 160,
        opacity,
        transform: `translateY(${translateY}px)`,
        background: colors.bgElevated,
        border: `1px solid ${colors.border}`,
        borderRadius: 12,
        padding: "12px 16px",
        maxWidth: isPortrait ? width - 80 : 280,
        display: "flex",
        gap: 10,
        alignItems: "flex-start",
      }}
    >
      {/* WhatsApp icon */}
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: 7,
          background: whatsapp.greenLight,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
          <path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.832-1.438A9.955 9.955 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18a8 8 0 01-4.243-1.214l-.257-.154-2.87.853.853-2.87-.154-.257A8 8 0 1112 20z" />
        </svg>
      </div>

      <div style={{ flex: 1 }}>
        <div
          style={{
            fontSize: 11,
            color: whatsapp.greenDark,
            marginBottom: 3,
            fontFamily: fonts.body,
            fontWeight: 600,
          }}
        >
          Agdi
        </div>
        <div style={{ fontSize: 13, color: colors.text, lineHeight: 1.4 }}>
          Done! Emailed the team, calendar updated. Deployment is healthy.
        </div>
      </div>
    </div>
  );
}
