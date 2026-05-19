import { AbsoluteFill, useVideoConfig, useCurrentFrame, interpolate } from "remotion";
import { PhoneMockup } from "../../components/phone/PhoneMockup";
import { PhoneWhatsAppView } from "../../components/phone/PhoneWhatsAppView";
import { ConnectionFlow } from "../../components/layouts/ConnectionFlow";
import { ToolCard } from "../../components/ToolCard";
import { colors } from "../../theme/tokens";
import { agdiEaseOut } from "../../lib/easing";

export function DemoMessageScene() {
  const { width, height } = useVideoConfig();
  const frame = useCurrentFrame();
  const isPortrait = height > width;
  const isSquare = Math.abs(height - width) < 100;

  const phoneScale = isPortrait ? 0.5 : isSquare ? 0.55 : 0.65;
  const phoneX = isPortrait
    ? (width - 390 * phoneScale) / 2
    : isSquare
      ? width * 0.04
      : width * 0.08;
  const phoneY = isPortrait ? 30 : (height - 844 * phoneScale) / 2;

  const desktopX = isPortrait ? width * 0.05 : isSquare ? width * 0.45 : width * 0.48;
  const desktopY = isPortrait ? height * 0.52 : isSquare ? height * 0.08 : height * 0.12;

  const messages = [
    {
      text: "Check my calendar and email the team about tomorrow's standup",
      isSelf: true,
      appearAtFrame: 0,
      typed: true,
      charsPerFrame: 2.5,
    },
    {
      text: "On it. Checking your calendar now...",
      isSelf: false,
      appearAtFrame: 60,
      typed: true,
      charsPerFrame: 2.0,
    },
    {
      text: "Done! Emailed the team: standup moved to 11am. Calendar updated.",
      isSelf: false,
      appearAtFrame: 200,
      typed: true,
      charsPerFrame: 2.0,
    },
  ];

  // Desktop workspace entrance
  const desktopOpacity = interpolate(frame, [90, 100], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: agdiEaseOut,
  });

  const desktopScale = interpolate(frame, [90, 105], [0.95, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: agdiEaseOut,
  });

  return (
    <AbsoluteFill style={{ background: colors.bg }}>
      {/* Phone with WhatsApp */}
      <PhoneMockup
        appearAtFrame={0}
        x={phoneX}
        y={phoneY}
        scale={phoneScale}
      >
        <PhoneWhatsAppView
          messages={messages}
          typingIndicator={{ start: 40, end: 60 }}
        />
      </PhoneMockup>

      {/* Connection flow from phone to desktop */}
      <ConnectionFlow
        startX={phoneX + 390 * phoneScale}
        startY={phoneY + 422 * phoneScale}
        endX={desktopX}
        endY={desktopY + 100}
        appearAtFrame={70}
        width={width}
        height={height}
      />

      {/* Desktop workspace */}
      <div
        style={{
          position: "absolute",
          left: desktopX,
          top: desktopY,
          opacity: desktopOpacity,
          transform: `scale(${desktopScale})`,
          transformOrigin: "top left",
          display: "flex",
          flexDirection: "column",
          gap: 16,
          width: isPortrait ? width * 0.9 : isSquare ? width * 0.48 : width * 0.44,
        }}
      >
        <ToolCard
          appearAtFrame={110}
          completeAtFrame={160}
          command="calendar.check --today"
          output="3 events found: 9am Design Review, 11am Standup, 2pm Sprint Planning"
          outputAtFrame={140}
          width={isPortrait ? width * 0.8 : undefined}
        />

        <ToolCard
          appearAtFrame={150}
          completeAtFrame={205}
          command="gmail.compose --to team@company.com"
          output="Email sent: 'Standup moved to 11am tomorrow'"
          outputAtFrame={185}
          width={isPortrait ? width * 0.8 : undefined}
        />

        <ToolCard
          appearAtFrame={180}
          completeAtFrame={210}
          command="calendar.update --event standup --time 11:00"
          output="Event updated successfully"
          outputAtFrame={205}
          width={isPortrait ? width * 0.8 : undefined}
        />
      </div>
    </AbsoluteFill>
  );
}
