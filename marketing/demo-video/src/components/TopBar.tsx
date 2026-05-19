import { Search, Bell, CircleUser } from "lucide-react";
import { colors } from "../theme/tokens";

interface TopBarProps {
  title: string;
}

export function TopBar({ title }: TopBarProps) {
  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 20px",
        background: colors.chrome,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ color: colors.textStrong, fontSize: 14, fontWeight: 600 }}>{title}</span>
        <span
          style={{
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: colors.ok,
            border: `1px solid ${colors.border}`,
            padding: "3px 8px",
            borderRadius: 999,
            background: "rgba(34,197,94,0.08)",
          }}
        >
          Online
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <Search size={16} color={colors.muted} />
        <Bell size={16} color={colors.muted} />
        <CircleUser size={20} color={colors.muted} />
      </div>
    </div>
  );
}
