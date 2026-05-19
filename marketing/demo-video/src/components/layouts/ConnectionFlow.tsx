import { useCurrentFrame, interpolate } from "remotion";
import { colors } from "../../theme/tokens";
import { agdiEaseOut } from "../../lib/easing";

interface ConnectionFlowProps {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  appearAtFrame: number;
  pulseAtFrame?: number;
  width?: number;
  height?: number;
}

export function ConnectionFlow({
  startX,
  startY,
  endX,
  endY,
  appearAtFrame,
  pulseAtFrame,
  width = 1920,
  height = 1080,
}: ConnectionFlowProps) {
  const frame = useCurrentFrame();
  if (frame < appearAtFrame) return null;

  const drawDuration = 15;
  const progress = interpolate(
    frame,
    [appearAtFrame, appearAtFrame + drawDuration],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: agdiEaseOut }
  );

  const cpOffset = Math.abs(endX - startX) * 0.4;
  const path = `M ${startX} ${startY} C ${startX + cpOffset} ${startY}, ${endX - cpOffset} ${endY}, ${endX} ${endY}`;

  const pathLength = 600;
  const dashOffset = pathLength * (1 - progress);

  const pulseStart = pulseAtFrame ?? appearAtFrame + drawDuration;
  const showPulses = frame >= pulseStart;

  return (
    <svg
      width={width}
      height={height}
      style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 50 }}
    >
      <defs>
        <linearGradient id="connectionGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={colors.accent} />
          <stop offset="100%" stopColor={colors.accent2} />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Path background glow */}
      <path
        d={path}
        fill="none"
        stroke={colors.accent}
        strokeWidth={4}
        strokeDasharray={pathLength}
        strokeDashoffset={dashOffset}
        opacity={0.2}
        filter="url(#glow)"
      />

      {/* Main path */}
      <path
        d={path}
        fill="none"
        stroke="url(#connectionGrad)"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeDasharray={pathLength}
        strokeDashoffset={dashOffset}
      />

      {/* Traveling pulses */}
      {showPulses &&
        [0, 10, 20].map((delay, i) => {
          const pulseFrame = frame - pulseStart - delay;
          if (pulseFrame < 0) return null;
          const t = (pulseFrame % 40) / 40;
          const px = interpolatePath(startX, startX + cpOffset, endX - cpOffset, endX, t);
          const py = interpolatePath(startY, startY, endY, endY, t);
          const pulseOpacity = Math.sin(t * Math.PI) * 0.8;

          return (
            <circle
              key={i}
              cx={px}
              cy={py}
              r={5}
              fill={colors.accent}
              opacity={pulseOpacity}
              filter="url(#glow)"
            />
          );
        })}
    </svg>
  );
}

function interpolatePath(
  p0: number,
  p1: number,
  p2: number,
  p3: number,
  t: number
): number {
  const mt = 1 - t;
  return mt * mt * mt * p0 + 3 * mt * mt * t * p1 + 3 * mt * t * t * p2 + t * t * t * p3;
}
