import { ReactNode } from "react";
import { useCurrentFrame, interpolate } from "remotion";
import { agdiEaseInOut } from "../../lib/easing";

interface FadeWrapperProps {
  children: ReactNode;
  fadeInFrames?: number;
  fadeOutStart?: number;
  fadeOutFrames?: number;
}

export function FadeWrapper({
  children,
  fadeInFrames = 0,
  fadeOutStart,
  fadeOutFrames = 0,
}: FadeWrapperProps) {
  const frame = useCurrentFrame();

  let opacity = 1;

  // Fade in at the start
  if (fadeInFrames > 0 && frame < fadeInFrames) {
    opacity = interpolate(frame, [0, fadeInFrames], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: agdiEaseInOut,
    });
  }

  // Fade out at the end
  if (fadeOutStart !== undefined && fadeOutFrames > 0 && frame >= fadeOutStart) {
    opacity = interpolate(frame, [fadeOutStart, fadeOutStart + fadeOutFrames], [1, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: agdiEaseInOut,
    });
  }

  return <div style={{ opacity }}>{children}</div>;
}
