import { interpolate, useCurrentFrame } from "remotion";
import { colors, fonts } from "../theme/tokens";
import { agdiEaseOut } from "../lib/easing";

interface CaptionProps {
  text: string;
  /** Absolute frame the caption appears (in composition time, not Sequence-relative). */
  appearAtFrame: number;
  /** Absolute frame the caption disappears. */
  disappearAtFrame: number;
}

/**
 * Low-third VO subtitle. Inter 500 on a blurred dark backing.
 */
export function Caption({ text, appearAtFrame, disappearAtFrame }: CaptionProps) {
  const frame = useCurrentFrame();
  if (frame < appearAtFrame || frame > disappearAtFrame) return null;

  const fadeIn = interpolate(frame, [appearAtFrame, appearAtFrame + 6], [0, 1], {
    extrapolateRight: "clamp",
    easing: agdiEaseOut,
  });
  const fadeOut = interpolate(frame, [disappearAtFrame - 6, disappearAtFrame], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const opacity = Math.min(fadeIn, fadeOut);

  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 72,
        display: "flex",
        justifyContent: "center",
        pointerEvents: "none",
        zIndex: 100,
        opacity,
      }}
    >
      <div
        style={{
          maxWidth: "70%",
          padding: "10px 18px",
          background: "rgba(14, 16, 21, 0.85)",
          backdropFilter: "blur(8px)",
          border: `1px solid ${colors.border}`,
          borderRadius: 8,
          color: colors.textStrong,
          fontFamily: fonts.body,
          fontWeight: 500,
          fontSize: 22,
          textAlign: "center",
          letterSpacing: "-0.01em",
          lineHeight: 1.4,
        }}
      >
        {text}
      </div>
    </div>
  );
}
