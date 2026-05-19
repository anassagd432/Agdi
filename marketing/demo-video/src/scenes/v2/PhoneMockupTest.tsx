import { AbsoluteFill, useVideoConfig } from "remotion";
import { PhoneMockup } from "../../components/phone/PhoneMockup";
import { colors } from "../../theme/tokens";

export function PhoneMockupTest() {
  const { width, height } = useVideoConfig();

  // Center the phone
  const phoneWidth = 390;
  const phoneHeight = 844;
  const centerX = (width - phoneWidth) / 2;
  const centerY = (height - phoneHeight) / 2;

  return (
    <AbsoluteFill
      style={{
        background: colors.bg,
      }}
    >
      <PhoneMockup appearAtFrame={0} x={centerX} y={centerY} scale={1}>
        {/* Test content - simple gradient background */}
        <div
          style={{
            width: "100%",
            height: "100%",
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            fontSize: 24,
            fontWeight: 600,
            fontFamily: colors.text,
          }}
        >
          Phone Mockup Test
        </div>
      </PhoneMockup>
    </AbsoluteFill>
  );
}
