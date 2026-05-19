import { useCurrentFrame, interpolate } from "remotion";
import { whatsapp } from "../../theme/tokens";
import { revealedText } from "../../lib/typewriter";
import { agdiEaseOut } from "../../lib/easing";
import { WhatsAppUI } from "./WhatsAppUI";

interface Message {
  text: string;
  isSelf: boolean;
  appearAtFrame: number;
  typed?: boolean;
  charsPerFrame?: number;
}

interface PhoneWhatsAppViewProps {
  messages: Message[];
  typingIndicator?: { start: number; end: number };
}

export function PhoneWhatsAppView({
  messages,
  typingIndicator,
}: PhoneWhatsAppViewProps) {
  const frame = useCurrentFrame();

  return (
    <WhatsAppUI contactName="Agdi">
      {messages.map((msg, i) => (
        <WhatsAppBubble key={i} message={msg} frame={frame} />
      ))}
      {typingIndicator &&
        frame >= typingIndicator.start &&
        frame < typingIndicator.end && (
          <TypingIndicator frame={frame} startFrame={typingIndicator.start} />
        )}
    </WhatsAppUI>
  );
}

function WhatsAppBubble({
  message,
  frame,
}: {
  message: Message;
  frame: number;
}) {
  if (frame < message.appearAtFrame) return null;

  const opacity = interpolate(
    frame,
    [message.appearAtFrame, message.appearAtFrame + 4],
    [0, 1],
    { extrapolateRight: "clamp", easing: agdiEaseOut }
  );

  const translateY = interpolate(
    frame,
    [message.appearAtFrame, message.appearAtFrame + 4],
    [8, 0],
    { extrapolateRight: "clamp", easing: agdiEaseOut }
  );

  const body = message.typed
    ? revealedText({
        text: message.text,
        frame,
        startFrame: message.appearAtFrame + 3,
        charsPerFrame: message.charsPerFrame ?? 2.0,
      })
    : message.text;

  const isSelf = message.isSelf;

  return (
    <div
      style={{
        display: "flex",
        justifyContent: isSelf ? "flex-end" : "flex-start",
        marginBottom: 6,
        opacity,
        transform: `translateY(${translateY}px)`,
      }}
    >
      <div
        style={{
          maxWidth: "78%",
          padding: "8px 12px",
          borderRadius: 8,
          borderTopLeftRadius: isSelf ? 8 : 0,
          borderTopRightRadius: isSelf ? 0 : 8,
          background: isSelf ? whatsapp.bubbleSelf : whatsapp.bubbleOther,
          boxShadow: "0 1px 1px rgba(0,0,0,0.08)",
          position: "relative",
        }}
      >
        <div
          style={{
            fontSize: 14.5,
            lineHeight: 1.4,
            color: "#111",
            whiteSpace: "pre-wrap",
          }}
        >
          {body}
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            marginTop: 2,
          }}
        >
          <span
            style={{
              fontSize: 11,
              color: whatsapp.timestamp,
            }}
          >
            {isSelf ? "9:42 ✓✓" : "9:42"}
          </span>
        </div>
      </div>
    </div>
  );
}

function TypingIndicator({
  frame,
  startFrame,
}: {
  frame: number;
  startFrame: number;
}) {
  const elapsed = frame - startFrame;

  const opacity = interpolate(frame, [startFrame, startFrame + 4], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "flex-start",
        marginBottom: 6,
        opacity,
      }}
    >
      <div
        style={{
          padding: "10px 14px",
          borderRadius: 8,
          borderTopLeftRadius: 0,
          background: whatsapp.bubbleOther,
          boxShadow: "0 1px 1px rgba(0,0,0,0.08)",
          display: "flex",
          gap: 4,
          alignItems: "center",
        }}
      >
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              background: "#8e8e93",
              opacity: 0.6,
              transform: `translateY(${Math.sin((elapsed + i * 4) / 4) * 3}px)`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
