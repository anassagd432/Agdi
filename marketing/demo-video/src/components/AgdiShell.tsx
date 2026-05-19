import { ReactNode } from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { colors, layout } from "../theme/tokens";
import { agdiEaseOut } from "../lib/easing";
import { Sidebar, type ActiveNavId } from "./Sidebar";
import { TopBar } from "./TopBar";

interface AgdiShellProps {
  active: ActiveNavId;
  title: string;
  children: ReactNode;
  /** Frame at which the dashboard-enter animation begins. Defaults to 0. */
  enterAtFrame?: number;
}

/**
 * Replicates the Agdi workspace shell:
 *   258px sidebar | 1fr main
 *   52px topbar | 1fr content
 */
export function AgdiShell({ active, title, children, enterAtFrame = 0 }: AgdiShellProps) {
  const frame = useCurrentFrame();
  // dashboard-enter: 12px translateY, 300ms (= 9 frames at 30fps), opacity 0 -> 1
  const enterEnd = enterAtFrame + 9;
  const translateY = interpolate(frame, [enterAtFrame, enterEnd], [12, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: agdiEaseOut,
  });
  const opacity = interpolate(frame, [enterAtFrame, enterEnd], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: colors.bg,
        display: "grid",
        gridTemplateColumns: `${layout.sidebarWidth}px 1fr`,
        gridTemplateRows: `${layout.topbarHeight}px 1fr`,
        fontFamily: "Inter, sans-serif",
        color: colors.text,
        transform: `translateY(${translateY}px)`,
        opacity,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          gridRow: "1 / span 2",
          gridColumn: "1",
          background: colors.bg,
          borderRight: `1px solid ${colors.border}`,
        }}
      >
        <Sidebar active={active} />
      </div>
      <div
        style={{
          gridRow: "1",
          gridColumn: "2",
          background: colors.bg,
          borderBottom: `1px solid ${colors.border}`,
        }}
      >
        <TopBar title={title} />
      </div>
      <div
        style={{
          gridRow: "2",
          gridColumn: "2",
          overflow: "hidden",
          position: "relative",
        }}
      >
        {children}
      </div>
    </div>
  );
}
