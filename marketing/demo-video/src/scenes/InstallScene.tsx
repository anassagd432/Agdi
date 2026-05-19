import { interpolate, useCurrentFrame, AbsoluteFill } from "remotion";
import { colors } from "../theme/tokens";
import { TerminalPane, type TerminalLine } from "../components/TerminalPane";
import { agdiEaseOut } from "../lib/easing";

// Scene runs 0..240 frames (8s at 30fps). Tightened so the workspace reveal
// lands before the VO line "every surface in one place" at 0:11.
const LINES: TerminalLine[] = [
  { startFrame: 6, prompt: "$ ", text: "npm install -g agdi", charsPerFrame: 1.8 },
  {
    startFrame: 50,
    text: "added 1 package in 4.2s",
    output: true,
    color: colors.muted,
  },
  { startFrame: 70, prompt: "$ ", text: "agdi setup", charsPerFrame: 1.8 },
  {
    startFrame: 110,
    text: "[ok] workspace initialized",
    output: true,
    color: colors.ok,
  },
  {
    startFrame: 124,
    text: "[ok] local runtime listening on :7878",
    output: true,
    color: colors.ok,
  },
  {
    startFrame: 138,
    text: "-> opening workspace...",
    output: true,
    color: colors.accent,
  },
];

export function InstallScene() {
  const frame = useCurrentFrame();

  const enterX = interpolate(frame, [0, 14], [-160, 0], {
    extrapolateRight: "clamp",
    easing: agdiEaseOut,
  });
  const exitOpacity = interpolate(frame, [200, 230], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const exitScale = interpolate(frame, [200, 230], [1, 0.96], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background: colors.bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          transform: `translateX(${enterX}px) scale(${exitScale})`,
          opacity: exitOpacity,
        }}
      >
        <TerminalPane title="~ - bash" lines={LINES} width={760} height={340} />
      </div>
    </AbsoluteFill>
  );
}
