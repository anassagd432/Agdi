import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { colors, fonts, radii } from "../../theme/tokens";
import { revealedText } from "../../lib/typewriter";
import { agdiEaseOut } from "../../lib/easing";

export function CtaSceneV2() {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const isPortrait = height > width;

  const fadeIn = interpolate(frame, [0, 15], [0, 1], {
    extrapolateRight: "clamp",
    easing: agdiEaseOut,
  });

  const headlineText = "AI that actually works for you.";
  const headline = revealedText({
    text: headlineText,
    frame,
    startFrame: 15,
    charsPerFrame: 1.5,
  });

  const commandAppear = 60;
  const command = "npm install -g agdi";
  const typedCommand = revealedText({
    text: command,
    frame,
    startFrame: commandAppear + 5,
    charsPerFrame: 1.2,
  });

  const onboardAppear = 110;
  const onboardText = "agdi onboard";
  const typedOnboard = revealedText({
    text: onboardText,
    frame,
    startFrame: onboardAppear + 5,
    charsPerFrame: 1.2,
  });

  const commandOpacity = interpolate(frame, [commandAppear, commandAppear + 8], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: agdiEaseOut,
  });

  const onboardOpacity = interpolate(frame, [onboardAppear, onboardAppear + 8], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: agdiEaseOut,
  });

  // Logo glow pulse
  const glowIntensity = 0.25 + Math.sin(frame / 10) * 0.15;

  // Fade to black at end
  const fadeOut = interpolate(frame, [180, 210], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background: colors.bg,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 40,
        opacity: fadeIn * fadeOut,
      }}
    >
      {/* Agdi logo/name */}
      <div
        style={{
          fontSize: isPortrait ? 52 : 64,
          fontWeight: 800,
          color: colors.accent,
          fontFamily: fonts.body,
          textShadow: `0 0 ${24 * glowIntensity}px ${colors.accentGlow}`,
          letterSpacing: -1,
        }}
      >
        Agdi
      </div>

      {/* Headline */}
      <div
        style={{
          fontSize: isPortrait ? 26 : 32,
          fontWeight: 600,
          color: colors.textStrong,
          fontFamily: fonts.body,
          textAlign: "center",
          padding: "0 40px",
        }}
      >
        {headline}
      </div>

      {/* Install terminal */}
      <div
        style={{
          opacity: commandOpacity,
          background: colors.bgAccent,
          border: `1px solid ${colors.border}`,
          borderRadius: radii.md,
          padding: isPortrait ? "16px 24px" : "20px 32px",
          display: "flex",
          flexDirection: "column",
          gap: 12,
          minWidth: isPortrait ? 300 : 380,
          maxWidth: width - 80,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: colors.muted, fontFamily: fonts.mono, fontSize: 16 }}>
            $
          </span>
          <span style={{ color: colors.accent, fontFamily: fonts.mono, fontSize: 16 }}>
            {typedCommand}
          </span>
          {frame >= commandAppear + 5 && typedCommand.length < command.length && (
            <Cursor frame={frame} />
          )}
        </div>

        {frame >= onboardAppear && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              opacity: onboardOpacity,
            }}
          >
            <span style={{ color: colors.muted, fontFamily: fonts.mono, fontSize: 16 }}>
              $
            </span>
            <span style={{ color: colors.accent, fontFamily: fonts.mono, fontSize: 16 }}>
              {typedOnboard}
            </span>
            {typedOnboard.length < onboardText.length && <Cursor frame={frame} />}
          </div>
        )}
      </div>

      {/* Subtitle */}
      {frame >= 140 && (
        <div
          style={{
            fontSize: 18,
            color: colors.muted,
            fontFamily: fonts.body,
            opacity: interpolate(frame, [140, 150], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
        >
          Your AI assistant is waiting.
        </div>
      )}
    </AbsoluteFill>
  );
}

function Cursor({ frame }: { frame: number }) {
  return (
    <span
      style={{
        display: "inline-block",
        width: 2,
        height: 18,
        background: colors.accent,
        opacity: Math.sin(frame / 6) > 0 ? 1 : 0,
      }}
    />
  );
}
