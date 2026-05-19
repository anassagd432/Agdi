import { useCurrentFrame } from "remotion";
import { colors, fonts, radii, shadows } from "../theme/tokens";
import { revealedText } from "../lib/typewriter";

export interface TerminalLine {
  /** Frame at which this line begins typing. */
  startFrame: number;
  prompt?: string;
  text: string;
  /** If true, this is non-typed output rendered all at once. */
  output?: boolean;
  /** Optional color override, for example green for success. */
  color?: string;
  charsPerFrame?: number;
}

interface TerminalPaneProps {
  title?: string;
  lines: TerminalLine[];
  width?: number | string;
  height?: number | string;
}

export function TerminalPane({
  title = "~ - bash",
  lines,
  width = 720,
  height = 320,
}: TerminalPaneProps) {
  const frame = useCurrentFrame();

  return (
    <div
      style={{
        width,
        height,
        background: colors.bgAccent,
        border: `1px solid ${colors.border}`,
        borderRadius: radii.md,
        boxShadow: shadows.lg,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        fontFamily: fonts.mono,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 12px",
          borderBottom: `1px solid ${colors.border}`,
          background: colors.bg,
        }}
      >
        <Dot color="#ff5f57" />
        <Dot color="#febc2e" />
        <Dot color="#28c840" />
        <span
          style={{
            marginLeft: 12,
            color: colors.muted,
            fontSize: 12,
            fontFamily: fonts.mono,
          }}
        >
          {title}
        </span>
      </div>
      <div
        style={{
          padding: 18,
          fontSize: 16,
          lineHeight: 1.55,
          color: colors.text,
          flex: 1,
          overflow: "hidden",
        }}
      >
        {lines.map((line, i) => (
          <Line key={i} line={line} frame={frame} />
        ))}
      </div>
    </div>
  );
}

function Dot({ color }: { color: string }) {
  return <span style={{ width: 12, height: 12, borderRadius: "50%", background: color }} />;
}

function Line({ line, frame }: { line: TerminalLine; frame: number }) {
  if (frame < line.startFrame) return null;

  const text = line.output
    ? line.text
    : revealedText({
        text: line.text,
        frame,
        startFrame: line.startFrame,
        charsPerFrame: line.charsPerFrame ?? 1.4,
      });

  const showCaret = !line.output && text.length < line.text.length;

  return (
    <div style={{ whiteSpace: "pre-wrap", color: line.color ?? colors.text }}>
      {line.prompt !== undefined && (
        <span style={{ color: colors.muted }}>{line.prompt}</span>
      )}
      {text}
      {showCaret && (
        <span
          style={{
            display: "inline-block",
            width: 9,
            height: 18,
            background: colors.accent,
            verticalAlign: "text-bottom",
            marginLeft: 2,
            opacity: Math.floor(frame / 8) % 2 === 0 ? 1 : 0,
          }}
        />
      )}
    </div>
  );
}
