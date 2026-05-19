import { AbsoluteFill, useVideoConfig, useCurrentFrame, interpolate } from "remotion";
import { PhoneMockup } from "../../components/phone/PhoneMockup";
import { WhatsAppUI } from "../../components/phone/WhatsAppUI";
import { colors, fonts } from "../../theme/tokens";
import { revealedText } from "../../lib/typewriter";
import { agdiEaseOut } from "../../lib/easing";

export function SolutionIntroScene() {
  const { width, height } = useVideoConfig();
  const frame = useCurrentFrame();
  const isPortrait = height > width;
  const isSquare = Math.abs(height - width) < 100;

  const phoneScale = isPortrait ? 0.55 : isSquare ? 0.6 : 0.7;
  const phoneX = (width - 390 * phoneScale) / 2;
  const phoneY = isPortrait
    ? height * 0.08
    : (height - 844 * phoneScale) / 2 - 20;

  const tagline = "Your AI assistant, right in your pocket.";
  const taglineStart = 40;
  const revealed = revealedText({
    text: tagline,
    frame,
    startFrame: taglineStart,
    charsPerFrame: 1.5,
  });

  const taglineOpacity = interpolate(frame, [taglineStart, taglineStart + 6], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ background: colors.bg }}>
      <PhoneMockup appearAtFrame={0} x={phoneX} y={phoneY} scale={phoneScale}>
        <WhatsAppUI contactName="Agdi">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              padding: 40,
            }}
          >
            {frame >= 20 && (
              <div
                style={{
                  background: "white",
                  borderRadius: 12,
                  padding: "16px 20px",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                  fontSize: 15,
                  color: "#333",
                  textAlign: "center",
                  lineHeight: 1.5,
                }}
              >
                Hi! I'm Agdi, your AI assistant. Ask me anything or give me a task.
              </div>
            )}
          </div>
        </WhatsAppUI>
      </PhoneMockup>

      {/* Tagline below phone */}
      <div
        style={{
          position: "absolute",
          bottom: isPortrait ? 120 : 60,
          left: 40,
          right: 40,
          textAlign: "center",
          opacity: taglineOpacity,
        }}
      >
        <span
          style={{
            fontSize: isPortrait ? 24 : isSquare ? 26 : 28,
            fontWeight: 600,
            color: colors.textStrong,
            fontFamily: fonts.body,
          }}
        >
          {revealed}
        </span>
      </div>
    </AbsoluteFill>
  );
}
