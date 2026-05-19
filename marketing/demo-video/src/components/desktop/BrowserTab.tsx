import { useCurrentFrame, interpolate } from "remotion";
import { colors, fonts, radii, shadows } from "../../theme/tokens";
import { agdiEaseOut } from "../../lib/easing";

interface StatusItem {
  label: string;
  status: "ok" | "warn" | "error";
}

interface BrowserTabProps {
  title: string;
  url?: string;
  items: StatusItem[];
  appearAtFrame: number;
}

export function BrowserTab({ title, url, items, appearAtFrame }: BrowserTabProps) {
  const frame = useCurrentFrame();
  if (frame < appearAtFrame) return null;

  const opacity = interpolate(frame, [appearAtFrame, appearAtFrame + 8], [0, 1], {
    extrapolateRight: "clamp",
    easing: agdiEaseOut,
  });

  const translateY = interpolate(frame, [appearAtFrame, appearAtFrame + 8], [12, 0], {
    extrapolateRight: "clamp",
    easing: agdiEaseOut,
  });

  const statusColors = {
    ok: colors.ok,
    warn: colors.warn,
    error: colors.danger,
  };

  return (
    <div
      style={{
        opacity,
        transform: `translateY(${translateY}px)`,
        width: "100%",
        maxWidth: 400,
        borderRadius: radii.lg,
        overflow: "hidden",
        boxShadow: shadows.lg,
        fontFamily: fonts.body,
      }}
    >
      {/* Browser chrome */}
      <div
        style={{
          height: 36,
          background: "#f2f2f2",
          display: "flex",
          alignItems: "center",
          padding: "0 12px",
          gap: 8,
        }}
      >
        <div style={{ width: 12, height: 12, borderRadius: 6, background: "#ff5f57" }} />
        <div style={{ width: 12, height: 12, borderRadius: 6, background: "#febc2e" }} />
        <div style={{ width: 12, height: 12, borderRadius: 6, background: "#28c840" }} />
      </div>

      {/* Tab bar */}
      <div
        style={{
          height: 32,
          background: "#e8eaed",
          display: "flex",
          alignItems: "flex-end",
          padding: "0 8px",
        }}
      >
        <div
          style={{
            height: 28,
            background: "white",
            borderRadius: "8px 8px 0 0",
            display: "flex",
            alignItems: "center",
            padding: "0 14px",
            gap: 8,
            maxWidth: 220,
          }}
        >
          <div style={{ width: 14, height: 14, borderRadius: 3, background: "#4285f4" }} />
          <span style={{ fontSize: 11, color: "#5f6368", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {title}
          </span>
          <span style={{ fontSize: 11, color: "#aaa", marginLeft: "auto" }}>×</span>
        </div>
      </div>

      {/* URL bar */}
      <div
        style={{
          height: 34,
          background: "white",
          display: "flex",
          alignItems: "center",
          padding: "0 16px",
          borderBottom: "1px solid #e8e8e8",
        }}
      >
        <div
          style={{
            flex: 1,
            height: 24,
            background: "#f1f3f4",
            borderRadius: 12,
            display: "flex",
            alignItems: "center",
            padding: "0 12px",
          }}
        >
          <span style={{ fontSize: 12, color: "#5f6368" }}>
            {url ?? "deploy.agdi.dev/dashboard"}
          </span>
        </div>
      </div>

      {/* Dashboard content */}
      <div style={{ background: "white", padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#202124", marginBottom: 4 }}>
          Deployment Status
        </div>
        {items.map((item, i) => {
          const itemDelay = appearAtFrame + 10 + i * 5;
          const itemOpacity = interpolate(frame, [itemDelay, itemDelay + 5], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });

          return (
            <div
              key={i}
              style={{
                opacity: itemOpacity,
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "6px 10px",
                borderRadius: 6,
                background: "#f8f9fa",
              }}
            >
              <StatusDot color={statusColors[item.status]} />
              <span style={{ fontSize: 13, color: "#333" }}>{item.label}</span>
              <span style={{ fontSize: 11, color: statusColors[item.status], marginLeft: "auto", fontWeight: 500 }}>
                {item.status === "ok" ? "Healthy" : item.status === "warn" ? "Warning" : "Error"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatusDot({ color }: { color: string }) {
  return (
    <div style={{ position: "relative", width: 10, height: 10 }}>
      <div
        style={{
          width: 10,
          height: 10,
          borderRadius: 5,
          background: color,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: -2,
          borderRadius: 7,
          background: color,
          opacity: 0.25,
        }}
      />
    </div>
  );
}
