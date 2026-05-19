import { ReactNode } from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { agdiEaseOut } from "../../lib/easing";

interface PhoneMockupProps {
  children: ReactNode;
  scale?: number;
  x?: number;
  y?: number;
  appearAtFrame?: number;
}

export function PhoneMockup({
  children,
  scale = 1,
  x = 0,
  y = 0,
  appearAtFrame = 0,
}: PhoneMockupProps) {
  const frame = useCurrentFrame();

  // Don't render before appearance frame
  if (frame < appearAtFrame) {
    return null;
  }

  // Entrance animation: slide from right + rotation (18 frames = 600ms)
  const entranceEnd = appearAtFrame + 18;
  const translateX = interpolate(
    frame,
    [appearAtFrame, entranceEnd],
    [100, 0],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: agdiEaseOut,
    }
  );

  const rotation = interpolate(
    frame,
    [appearAtFrame, entranceEnd],
    [-3, 0],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: agdiEaseOut,
    }
  );

  const opacity = interpolate(
    frame,
    [appearAtFrame, appearAtFrame + 9],
    [0, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }
  );

  // Floating animation: gentle vertical oscillation (after entrance completes)
  const floatOffset =
    frame > entranceEnd
      ? Math.sin((frame - entranceEnd) / 30) * 2
      : 0;

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        transform: `translateX(${translateX}%) rotate(${rotation}deg) translateY(${floatOffset}px) scale(${scale})`,
        opacity,
        transformOrigin: "center center",
      }}
    >
      {/* iPhone 15 Pro titanium frame */}
      <div
        style={{
          width: 390,
          height: 844,
          position: "relative",
          borderRadius: 55,
          background: "linear-gradient(135deg, #3a3a3c 0%, #1c1c1e 100%)",
          padding: 3,
          boxShadow: "0 30px 60px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.1)",
        }}
      >
        {/* Inner bezel */}
        <div
          style={{
            width: "100%",
            height: "100%",
            background: "#000",
            borderRadius: 52,
            overflow: "hidden",
            position: "relative",
          }}
        >
          {/* Dynamic Island */}
          <div
            style={{
              position: "absolute",
              top: 11,
              left: "50%",
              transform: "translateX(-50%)",
              width: 126,
              height: 37,
              background: "#000",
              borderRadius: 20,
              zIndex: 100,
              boxShadow: "inset 0 2px 8px rgba(0, 0, 0, 0.8)",
              border: "1px solid rgba(255, 255, 255, 0.05)",
            }}
          />

          {/* Screen content */}
          <div
            style={{
              width: "100%",
              height: "100%",
              position: "relative",
              background: "#000",
            }}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
