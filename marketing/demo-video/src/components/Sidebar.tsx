import {
  Activity,
  Bot,
  GitBranch,
  Home,
  Link as LinkIcon,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { colors, shadows } from "../theme/tokens";

export type ActiveNavId =
  | "workspace"
  | "assistants"
  | "connections"
  | "automations"
  | "activity"
  | "settings";

interface NavItem {
  id: ActiveNavId;
  label: string;
  icon: LucideIcon;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const GROUPS: NavGroup[] = [
  {
    label: "Workspace",
    items: [{ id: "workspace", label: "Dashboard", icon: Home }],
  },
  {
    label: "Run",
    items: [
      { id: "assistants", label: "Assistants", icon: Bot },
      { id: "connections", label: "Connections", icon: LinkIcon },
      { id: "automations", label: "Automations", icon: GitBranch },
      { id: "activity", label: "Activity", icon: Activity },
    ],
  },
  {
    label: "Configure",
    items: [{ id: "settings", label: "Settings", icon: Settings }],
  },
];

interface SidebarProps {
  active: ActiveNavId;
}

export function Sidebar({ active }: SidebarProps) {
  return (
    <nav
      style={{
        height: "100%",
        padding: "20px 12px",
        display: "flex",
        flexDirection: "column",
        gap: 22,
      }}
    >
      <Brand />
      {GROUPS.map((g) => (
        <div key={g.label}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: colors.muted,
              padding: "0 10px 8px",
            }}
          >
            {g.label}
          </div>
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 2 }}>
            {g.items.map((it) => (
              <NavRow key={it.id} item={it} active={it.id === active} />
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function Brand() {
  return (
    <div style={{ padding: "0 10px 4px", display: "flex", alignItems: "center", gap: 10 }}>
      <div
        style={{
          width: 26,
          height: 26,
          borderRadius: 6,
          background: colors.accent,
          boxShadow: shadows.glow,
          display: "grid",
          placeItems: "center",
          color: "#061016",
          fontWeight: 700,
          fontSize: 14,
          fontFamily: "JetBrains Mono, monospace",
        }}
      >
        A
      </div>
      <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.1 }}>
        <span style={{ color: colors.textStrong, fontWeight: 600, fontSize: 14 }}>Agdi</span>
        <span style={{ color: colors.muted, fontSize: 11 }}>Workspace</span>
      </div>
    </div>
  );
}

function NavRow({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <li
      style={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 10px",
        borderRadius: 8,
        background: active ? colors.bgElevated : "transparent",
        color: active ? colors.textStrong : colors.text,
        fontSize: 13,
        fontWeight: active ? 500 : 400,
        boxShadow: active ? shadows.glow : "none",
      }}
    >
      {active && (
        <span
          style={{
            position: "absolute",
            left: 0,
            top: 6,
            bottom: 6,
            width: 2,
            background: colors.accent,
            borderRadius: 2,
          }}
        />
      )}
      <Icon size={16} strokeWidth={1.75} color={active ? colors.accent : colors.muted} />
      {item.label}
    </li>
  );
}
