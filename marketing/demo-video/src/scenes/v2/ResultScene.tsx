import { AbsoluteFill, useVideoConfig, useCurrentFrame, interpolate } from "remotion";
import { PhoneMockup } from "../../components/phone/PhoneMockup";
import { PhoneWhatsAppView } from "../../components/phone/PhoneWhatsAppView";
import { colors, fonts } from "../../theme/tokens";
import { agdiEaseOut } from "../../lib/easing";

export function ResultScene() {
  const { width, height } = useVideoConfig();
  const frame = useCurrentFrame();
  const isPortrait = height > width;
  const isSquare = Math.abs(height - width) < 100;

  const phoneScale = isPortrait ? 0.55 : isSquare ? 0.6 : 0.7;
  const phoneX = (width - 390 * phoneScale) / 2;
  const phoneY = isPortrait
    ? height * 0.08
    : (height - 844 * phoneScale) / 2;

  const messages = [
    {
      text: "Done. Team notified, standup confirmed for 11am, deployment is healthy. Anything else?",
      isSelf: false,
      appearAtFrame: 0,
      typed: true,
      charsPerFrame: 2.2,
    },
    {
      text: "Perfect, thanks! 👍",
      isSelf: true,
      appearAtFrame: 80,
      typed: false,
    },
  ];

  // Checkmark animation
  const checkScale = interpolate(frame, [120, 135], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: agdiEaseOut,
  });

  const checkOpacity = interpolate(frame, [120, 128], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Pull-back camera
  const sceneScale = interpolate(frame, [160, 210], [1, 0.95], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: agdiEaseOut,
  });

  return (
    <AbsoluteFill style={{ background: colors.bg }}>
      <div
        style={{
          width: "100%",
          height: "100%",
          transform: `scale(${sceneScale})`,
          transformOrigin: "center center",
        }}
      >
        <PhoneMockup appearAtFrame={0} x={phoneX} y={phoneY} scale={phoneScale}>
          <PhoneWhatsAppView messages={messages} />
        </PhoneMockup>

        {/* Floating checkmark */}
        {frame >= 120 && (
          <div
            style={{
              position: "absolute",
              left: width / 2 - 30,
              top: 60,
              width: 60,
              height: 60,
              borderRadius: 30,
              background: colors.ok,
              display: "grid",
              placeItems: "center",
              opacity: checkOpacity,
              transform: `scale(${checkScale})`,
              boxShadow: `0 4px 20px rgba(34, 197, 94, 0.4)`,
            }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path
                d="M5 13l4 4L19 7"
                stroke="white"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        )}

        {/* Bottom text */}
        {frame >= 140 && (
          <div
            style={{
              position: "absolute",
              bottom: 50,
              left: 0,
              right: 0,
              textAlign: "center",
              opacity: interpolate(frame, [140, 150], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
            }}
          >
            <span
              style={{
                fontSize: 22,
                color: colors.text,
                fontFamily: fonts.body,
              }}
            >
              Real work, real tools, real automation.
            </span>
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
}
