import { interpolate, useCurrentFrame } from "remotion";
import { colors, fonts, shadows } from "../theme/tokens";
import { agdiEaseOut } from "../lib/easing";
import { revealedText } from "../lib/typewriter";

const TAGLINE = "Your agent workspace for real automation.";

export function HookScene() {
  const frame = useCurrentFrame();
  const wordmarkOpacity = interpolate(frame, [4, 18], [0, 1], {
    extrapolateRight: "clamp",
    easing: agdiEaseOut,
  });
  const wordmarkY = interpolate(frame, [4, 18], [16, 0], {
    extrapolateRight: "clamp",
    easing: agdiEaseOut,
  });
  const slashWidth = interpolate(frame, [18, 32], [0, 64], {
    extrapolateRight: "clamp",
    easing: agdiEaseOut,
  });
  const tagline = revealedText({
    text: TAGLINE,
    frame,
    startFrame: 36,
    charsPerFrame: 1.6,
  });

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
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
          display: "flex",
          alignItems: "center",
          gap: 20,
          opacity: wordmarkOpacity,
          transform: `translateY(${wordmarkY}px)`,
        }}
      >
        <div
          style={{
            width: 104,
            height: 104,
            borderRadius: 24,
            background: colors.accent,
            boxShadow: shadows.glow,
            display: "grid",
            placeItems: "center",
            color: "#061016",
            fontFamily: fonts.mono,
            fontSize: 56,
            fontWeight: 700,
            letterSpacing: 0,
            textTransform: "uppercase",
          }}
        >
          A
        </div>
        <div
          style={{
            fontFamily: fonts.body,
            fontSize: 96,
            fontWeight: 700,
            letterSpacing: 0,
            color: colors.textStrong,
          }}
        >
          Agdi
        </div>
        <div
          style={{
            width: slashWidth,
            height: 8,
            background: colors.accent,
            borderRadius: 999,
            boxShadow: shadows.glow,
            transform: "skewX(-20deg)",
          }}
        />
      </div>
      <div
        style={{
          fontFamily: fonts.mono,
          fontSize: 24,
          color: colors.text,
          minHeight: 32,
          letterSpacing: 0,
        }}
      >
        {tagline}
        {tagline.length < TAGLINE.length && tagline.length > 0 && (
          <span
            style={{
              display: "inline-block",
              width: 12,
              height: 22,
              background: colors.accent,
              verticalAlign: "text-bottom",
              marginLeft: 4,
              opacity: Math.floor(frame / 8) % 2 === 0 ? 1 : 0,
            }}
          />
        )}
      </div>
    </div>
  );
}
