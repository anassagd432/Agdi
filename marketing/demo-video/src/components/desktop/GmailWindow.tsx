import { useCurrentFrame, interpolate } from "remotion";
import { colors, fonts, radii, shadows } from "../../theme/tokens";
import { revealedText } from "../../lib/typewriter";
import { agdiEaseOut } from "../../lib/easing";

interface GmailWindowProps {
  to: string;
  subject: string;
  body: string;
  appearAtFrame: number;
  typingStartFrame?: number;
}

export function GmailWindow({
  to,
  subject,
  body,
  appearAtFrame,
  typingStartFrame,
}: GmailWindowProps) {
  const frame = useCurrentFrame();
  if (frame < appearAtFrame) return null;

  const opacity = interpolate(
    frame,
    [appearAtFrame, appearAtFrame + 8],
    [0, 1],
    { extrapolateRight: "clamp", easing: agdiEaseOut }
  );

  const translateY = interpolate(
    frame,
    [appearAtFrame, appearAtFrame + 8],
    [12, 0],
    { extrapolateRight: "clamp", easing: agdiEaseOut }
  );

  const typeStart = typingStartFrame ?? appearAtFrame + 10;
  const typedBody = revealedText({
    text: body,
    frame,
    startFrame: typeStart,
    charsPerFrame: 1.8,
  });

  return (
    <div
      style={{
        opacity,
        transform: `translateY(${translateY}px)`,
        width: "100%",
        maxWidth: 560,
        borderRadius: radii.lg,
        overflow: "hidden",
        boxShadow: shadows.lg,
        fontFamily: fonts.body,
      }}
    >
      {/* Window title bar */}
      <div
        style={{
          height: 36,
          background: "#f2f2f2",
          display: "flex",
          alignItems: "center",
          padding: "0 12px",
          gap: 8,
        }}
      >
        <div style={{ width: 12, height: 12, borderRadius: 6, background: "#ff5f57" }} />
        <div style={{ width: 12, height: 12, borderRadius: 6, background: "#febc2e" }} />
        <div style={{ width: 12, height: 12, borderRadius: 6, background: "#28c840" }} />
        <span
          style={{
            flex: 1,
            textAlign: "center",
            fontSize: 12,
            color: "#666",
            fontWeight: 500,
          }}
        >
          New Message
        </span>
      </div>

      {/* Compose area */}
      <div style={{ background: "white", padding: 20 }}>
        <Field label="To" value={to} />
        <Field label="Subject" value={subject} />
        <div
          style={{
            borderTop: "1px solid #e8e8e8",
            paddingTop: 16,
            marginTop: 8,
            minHeight: 120,
            fontSize: 14,
            lineHeight: 1.6,
            color: "#333",
            whiteSpace: "pre-wrap",
          }}
        >
          {typedBody}
          {frame >= typeStart && typedBody.length < body.length && (
            <span
              style={{
                display: "inline-block",
                width: 2,
                height: 16,
                background: "#333",
                marginLeft: 1,
                opacity: Math.sin(frame / 4) > 0 ? 1 : 0,
              }}
            />
          )}
        </div>

        {/* Send button */}
        <div style={{ marginTop: 16, display: "flex", gap: 12 }}>
          <div
            style={{
              padding: "8px 24px",
              background: "#1a73e8",
              color: "white",
              borderRadius: 4,
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            Send
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        borderBottom: "1px solid #e8e8e8",
        padding: "10px 0",
        gap: 8,
      }}
    >
      <span style={{ fontSize: 13, color: "#5f6368", width: 60 }}>{label}</span>
      <span style={{ fontSize: 14, color: "#333" }}>{value}</span>
    </div>
  );
}
