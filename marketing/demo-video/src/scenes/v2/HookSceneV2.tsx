import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { colors, fonts } from "../../theme/tokens";
import { revealedText } from "../../lib/typewriter";
import { agdiEaseOut } from "../../lib/easing";

export function HookSceneV2() {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const isPortrait = height > width;

  const bgOpacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateRight: "clamp",
  });

  const text = "Your AI should work FOR you,\nnot just WITH you.";
  const revealed = revealedText({ text, frame, startFrame: 15, charsPerFrame: 1.5 });

  return (
    <AbsoluteFill
      style={{
        background: colors.bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        opacity: bgOpacity,
      }}
    >
      <div
        style={{
          fontSize: isPortrait ? 36 : 48,
          fontWeight: 700,
          color: colors.textStrong,
          fontFamily: fonts.body,
          textAlign: "center",
          lineHeight: 1.3,
          maxWidth: isPortrait ? width - 80 : 800,
          padding: "0 40px",
          whiteSpace: "pre-wrap",
        }}
      >
        {revealed}
        {revealed.length < text.length && (
          <span
            style={{
              display: "inline-block",
              width: 3,
              height: 48,
              background: colors.accent,
              marginLeft: 2,
              opacity: Math.sin(frame / 6) > 0 ? 1 : 0,
            }}
          />
        )}
      </div>
    </AbsoluteFill>
  );
}
