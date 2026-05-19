import { interpolate, useCurrentFrame } from "remotion";
import { colors } from "../theme/tokens";
import { agdiEaseInOut } from "../lib/easing";

export interface CursorPoint {
  /** Frame at which the cursor reaches (x, y). */
  frame: number;
  x: number;
  y: number;
  click?: boolean;
}

interface CursorProps {
  /** Sequence of waypoints, ordered by frame ascending. */
  path: CursorPoint[];
  startFrame?: number;
}

/**
 * Animated macOS-style cursor. Interpolates linearly between waypoints with the
 * Agdi ease-in-out curve. A `click: true` waypoint emits a 200ms ripple.
 */
export function Cursor({ path, startFrame = 0 }: CursorProps) {
  const frame = useCurrentFrame();
  if (path.length === 0 || frame < startFrame) {
    return null;
  }

  const { x, y, clickAge } = positionAt(path, frame);

  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        transform: `translate(${x}px, ${y}px)`,
        pointerEvents: "none",
        zIndex: 50,
      }}
    >
      {clickAge !== null && clickAge < 6 && <ClickRipple age={clickAge} />}
      <CursorArrow />
    </div>
  );
}

function positionAt(path: CursorPoint[], frame: number) {
  let clickAge: number | null = null;

  if (frame <= path[0]!.frame) {
    return { x: path[0]!.x, y: path[0]!.y, clickAge };
  }
  if (frame >= path[path.length - 1]!.frame) {
    const last = path[path.length - 1]!;
    if (last.click) clickAge = frame - last.frame;
    return { x: last.x, y: last.y, clickAge };
  }

  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i]!;
    const b = path[i + 1]!;
    if (frame >= a.frame && frame <= b.frame) {
      const x = interpolate(frame, [a.frame, b.frame], [a.x, b.x], {
        easing: agdiEaseInOut,
      });
      const y = interpolate(frame, [a.frame, b.frame], [a.y, b.y], {
        easing: agdiEaseInOut,
      });
      if (b.click && frame >= b.frame - 1) clickAge = Math.max(0, frame - b.frame);
      return { x, y, clickAge };
    }
  }

  return { x: path[0]!.x, y: path[0]!.y, clickAge };
}

function CursorArrow() {
  return (
    <svg width={22} height={22} viewBox="0 0 22 22" style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.5))" }}>
      <path
        d="M3 2 L3 18 L7.5 14 L10 19 L13 17.5 L10.5 13 L16 13 Z"
        fill="#ffffff"
        stroke="#000000"
        strokeWidth={1}
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ClickRipple({ age }: { age: number }) {
  // 6-frame ripple = 200ms at 30fps
  const scale = interpolate(age, [0, 6], [0.6, 1.6], { extrapolateRight: "clamp" });
  const opacity = interpolate(age, [0, 6], [0.6, 0], { extrapolateRight: "clamp" });
  return (
    <div
      style={{
        position: "absolute",
        left: -10,
        top: -10,
        width: 28,
        height: 28,
        borderRadius: "50%",
        border: `2px solid ${colors.accent}`,
        transform: `scale(${scale})`,
        opacity,
      }}
    />
  );
}
