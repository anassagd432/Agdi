import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { colors, fonts, radii, shadows } from "../theme/tokens";
import { agdiEaseOut } from "../lib/easing";

export function CtaScene() {
  const frame = useCurrentFrame();
  const fade = interpolate(frame, [0, 14], [0, 1], {
    extrapolateRight: "clamp",
    easing: agdiEaseOut,
  });
  const lift = interpolate(frame, [0, 14], [16, 0], {
    extrapolateRight: "clamp",
    easing: agdiEaseOut,
  });
  const pulse = 1 + 0.02 * Math.sin(frame / 6);

  return (
    <AbsoluteFill
      style={{
        background: colors.bg,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 28,
      }}
    >
      <div
        style={{
          width: 72,
          height: 72,
          borderRadius: 18,
          background: colors.accent,
          boxShadow: shadows.glow,
          display: "grid",
          placeItems: "center",
          color: "#061016",
          fontFamily: fonts.mono,
          fontSize: 38,
          fontWeight: 700,
          opacity: fade,
          transform: `translateY(${lift}px)`,
        }}
      >
        A
      </div>

      <div
        style={{
          fontFamily: fonts.body,
          fontSize: 56,
          fontWeight: 600,
          letterSpacing: 0,
          color: colors.textStrong,
          opacity: fade,
          transform: `translateY(${lift}px)`,
        }}
      >
        AI that actually does things.
      </div>

      <div
        style={{
          fontFamily: fonts.mono,
          fontSize: 36,
          color: colors.textStrong,
          background: colors.bgAccent,
          border: `1px solid ${colors.borderStrong}`,
          borderRadius: radii.md,
          padding: "18px 32px",
          boxShadow: `${shadows.lg}, ${shadows.glow}`,
          opacity: fade,
          transform: `translateY(${lift}px) scale(${pulse})`,
          letterSpacing: 0,
        }}
      >
        <span style={{ color: colors.muted }}>$ </span>
        npm i -g agdi
      </div>

      <div
        style={{
          fontFamily: fonts.mono,
          fontSize: 20,
          color: colors.text,
          opacity: fade,
        }}
      >
        then run: agdi setup
      </div>

      <div
        style={{
          fontFamily: fonts.mono,
          fontSize: 16,
          color: colors.muted,
          opacity: fade,
        }}
      >
        github.com/agdi-dev/agdi
      </div>
    </AbsoluteFill>
  );
}
