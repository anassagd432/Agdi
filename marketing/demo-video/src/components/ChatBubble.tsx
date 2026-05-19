import { ReactNode } from "react";
import { useCurrentFrame, interpolate } from "remotion";
import { colors, fonts, radii } from "../theme/tokens";
import { revealedText } from "../lib/typewriter";
import { agdiEaseOut } from "../lib/easing";

interface ChatBubbleProps {
  author: string;
  avatarColor?: string;
  text: string;
  appearAtFrame: number;
  /** If set, types text out from appearAtFrame at this rate. Otherwise shows full text. */
  typed?: boolean;
  charsPerFrame?: number;
  side?: "left" | "right";
  children?: ReactNode;
}

export function ChatBubble({
  author,
  avatarColor,
  text,
  appearAtFrame,
  typed = false,
  charsPerFrame = 1.6,
  side = "left",
  children,
}: ChatBubbleProps) {
  const frame = useCurrentFrame();
  if (frame < appearAtFrame) return null;

  const opacity = interpolate(
    frame,
    [appearAtFrame, appearAtFrame + 6],
    [0, 1],
    { extrapolateRight: "clamp", easing: agdiEaseOut },
  );
  const translateY = interpolate(
    frame,
    [appearAtFrame, appearAtFrame + 6],
    [6, 0],
    { extrapolateRight: "clamp", easing: agdiEaseOut },
  );

  const body = typed
    ? revealedText({ text, frame, startFrame: appearAtFrame + 4, charsPerFrame })
    : text;

  return (
    <div
      style={{
        display: "flex",
        gap: 12,
        marginBottom: 14,
        opacity,
        transform: `translateY(${translateY}px)`,
        flexDirection: side === "right" ? "row-reverse" : "row",
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: radii.sm,
          background: avatarColor ?? colors.bgElevated,
          display: "grid",
          placeItems: "center",
          color: colors.textStrong,
          fontWeight: 600,
          fontSize: 13,
          flexShrink: 0,
          border: `1px solid ${colors.border}`,
        }}
      >
        {author.slice(0, 1).toUpperCase()}
      </div>
      <div style={{ minWidth: 0, maxWidth: 540 }}>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 8,
            marginBottom: 4,
          }}
        >
          <span style={{ color: colors.textStrong, fontSize: 13, fontWeight: 600 }}>
            {author}
          </span>
          <span style={{ color: colors.muted, fontSize: 11, fontFamily: fonts.mono }}>
            now
          </span>
        </div>
        <div
          style={{
            color: colors.text,
            fontSize: 14,
            lineHeight: 1.55,
            whiteSpace: "pre-wrap",
          }}
        >
          {body}
        </div>
        {children}
      </div>
    </div>
  );
}
