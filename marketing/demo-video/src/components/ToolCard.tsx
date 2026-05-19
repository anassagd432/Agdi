import { interpolate, useCurrentFrame } from "remotion";
import { Terminal, CheckCircle2, Loader2 } from "lucide-react";
import { colors, fonts, radii, shadows } from "../theme/tokens";
import { agdiEaseOut } from "../lib/easing";
import { revealedText } from "../lib/typewriter";

interface ToolCardProps {
  appearAtFrame: number;
  /** Frame at which the running -> ok status flips. */
  completeAtFrame: number;
  command: string;
  output?: string;
  outputAtFrame?: number;
  /** Visual width override; defaults to flexible. */
  width?: number | string;
}

export function ToolCard({
  appearAtFrame,
  completeAtFrame,
  command,
  output,
  outputAtFrame,
  width = 540,
}: ToolCardProps) {
  const frame = useCurrentFrame();
  if (frame < appearAtFrame) return null;

  const opacity = interpolate(frame, [appearAtFrame, appearAtFrame + 6], [0, 1], {
    extrapolateRight: "clamp",
    easing: agdiEaseOut,
  });
  const translateY = interpolate(frame, [appearAtFrame, appearAtFrame + 6], [8, 0], {
    extrapolateRight: "clamp",
    easing: agdiEaseOut,
  });

  const running = frame < completeAtFrame;
  const cmdText = revealedText({
    text: command,
    frame,
    startFrame: appearAtFrame + 4,
    charsPerFrame: 1.8,
  });
  const outText = output && outputAtFrame !== undefined && frame >= outputAtFrame ? output : "";

  return (
    <div
      style={{
        width,
        background: colors.bgAccent,
        border: `1px solid ${colors.border}`,
        borderRadius: radii.md,
        boxShadow: shadows.md,
        overflow: "hidden",
        opacity,
        transform: `translateY(${translateY}px)`,
        marginTop: 8,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 12px",
          borderBottom: `1px solid ${colors.border}`,
          background: colors.bg,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Terminal size={14} color={colors.muted} />
          <span
            style={{
              fontFamily: fonts.mono,
              fontSize: 12,
              color: colors.muted,
            }}
          >
            shell.exec
          </span>
        </div>
        <StatusPill running={running} />
      </div>
      <div
        style={{
          padding: "12px 14px",
          fontFamily: fonts.mono,
          fontSize: 13,
          color: colors.text,
          lineHeight: 1.55,
        }}
      >
        <div>
          <span style={{ color: colors.muted }}>$ </span>
          {cmdText}
        </div>
        {outText && (
          <div style={{ color: colors.ok, marginTop: 4 }}>{outText}</div>
        )}
      </div>
    </div>
  );
}

function StatusPill({ running }: { running: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "3px 10px",
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        background: running ? "rgba(245,158,11,0.08)" : "rgba(34,197,94,0.08)",
        color: running ? colors.warn : colors.ok,
        border: `1px solid ${running ? colors.warn : colors.ok}`,
      }}
    >
      {running ? <Loader2 size={12} /> : <CheckCircle2 size={12} />}
      {running ? "Running" : "OK"}
    </div>
  );
}
