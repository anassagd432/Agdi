import { ReactNode } from "react";
import { useVideoConfig, useCurrentFrame, interpolate } from "remotion";
import { agdiEaseOut } from "../../lib/easing";

interface SplitScreenLayoutProps {
  phoneContent: ReactNode;
  desktopContent: ReactNode;
  enterAtFrame?: number;
  phoneSize?: "small" | "medium" | "large";
}

export function SplitScreenLayout({
  phoneContent,
  desktopContent,
  enterAtFrame = 0,
  phoneSize = "medium",
}: SplitScreenLayoutProps) {
  const { width, height } = useVideoConfig();
  const frame = useCurrentFrame();
  const isPortrait = height > width;
  const isSquare = width === height;

  const opacity = interpolate(
    frame,
    [enterAtFrame, enterAtFrame + 12],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: agdiEaseOut }
  );

  const phoneFraction =
    phoneSize === "small" ? 0.3 : phoneSize === "large" ? 0.5 : 0.4;

  if (isPortrait) {
    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          opacity,
        }}
      >
        <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
          {phoneContent}
        </div>
        <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
          {desktopContent}
        </div>
      </div>
    );
  }

  if (isSquare) {
    return (
      <div style={{ width: "100%", height: "100%", position: "relative", opacity }}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1,
          }}
        >
          {phoneContent}
        </div>
        <div
          style={{
            position: "absolute",
            inset: 0,
            opacity: 0.85,
            zIndex: 0,
          }}
        >
          {desktopContent}
        </div>
      </div>
    );
  }

  // Landscape (16:9)
  const phoneWidth = Math.round(width * phoneFraction);
  const desktopWidth = width - phoneWidth;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        opacity,
      }}
    >
      <div
        style={{
          width: phoneWidth,
          height: "100%",
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {phoneContent}
      </div>
      <div
        style={{
          width: desktopWidth,
          height: "100%",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {desktopContent}
      </div>
    </div>
  );
}
