import { interpolate, useCurrentFrame } from "remotion";
import { colors, fonts, radii, shadows } from "../theme/tokens";
import { agdiEaseOut } from "../lib/easing";

interface TraceField {
  key: string;
  value: string;
  mono?: boolean;
  color?: string;
}

interface TracePanelProps {
  appearAtFrame: number;
  fields: TraceField[];
}

/**
 * Slides up from below to reveal a structured execution trace.
 */
export function TracePanel({ appearAtFrame, fields }: TracePanelProps) {
  const frame = useCurrentFrame();
  if (frame < appearAtFrame) return null;

  const translateY = interpolate(frame, [appearAtFrame, appearAtFrame + 12], [40, 0], {
    extrapolateRight: "clamp",
    easing: agdiEaseOut,
  });
  const opacity = interpolate(frame, [appearAtFrame, appearAtFrame + 12], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        background: colors.card,
        border: `1px solid ${colors.borderStrong}`,
        borderRadius: radii.md,
        padding: "16px 18px",
        boxShadow: shadows.lg,
        transform: `translateY(${translateY}px)`,
        opacity,
        width: 540,
        marginTop: 12,
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: colors.muted,
          marginBottom: 12,
        }}
      >
        Execution trace
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "100px 1fr", rowGap: 8, columnGap: 16 }}>
        {fields.map((f) => (
          <FieldRow key={f.key} field={f} />
        ))}
      </div>
    </div>
  );
}

function FieldRow({ field }: { field: TraceField }) {
  return (
    <>
      <span style={{ color: colors.muted, fontSize: 12, fontFamily: fonts.mono }}>{field.key}</span>
      <span
        style={{
          color: field.color ?? colors.textStrong,
          fontSize: 13,
          fontFamily: field.mono ? fonts.mono : fonts.body,
          wordBreak: "break-word",
        }}
      >
        {field.value}
      </span>
    </>
  );
}
