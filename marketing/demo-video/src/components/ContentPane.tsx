import { ReactNode } from "react";
import { colors } from "../theme/tokens";

/**
 * Standard inner pane with the grid-line texture you see across the Agdi
 * dashboard panels.
 */
export function ContentPane({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: `linear-gradient(${colors.bg}, ${colors.bg}),
          linear-gradient(${colors.gridLine} 1px, transparent 1px),
          linear-gradient(90deg, ${colors.gridLine} 1px, transparent 1px)`,
        backgroundSize: "100% 100%, 32px 32px, 32px 32px",
        backgroundBlendMode: "normal, normal, normal",
        padding: 28,
        overflow: "hidden",
      }}
    >
      {children}
    </div>
  );
}
