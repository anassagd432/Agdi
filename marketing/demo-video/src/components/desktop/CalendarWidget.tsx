import { useCurrentFrame, interpolate } from "remotion";
import { colors, fonts, radii, shadows } from "../../theme/tokens";
import { agdiEaseOut } from "../../lib/easing";

interface CalendarEvent {
  time: string;
  title: string;
  color?: string;
}

interface CalendarWidgetProps {
  events: CalendarEvent[];
  appearAtFrame: number;
}

export function CalendarWidget({ events, appearAtFrame }: CalendarWidgetProps) {
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

  return (
    <div
      style={{
        opacity,
        transform: `translateY(${translateY}px)`,
        width: "100%",
        maxWidth: 320,
        borderRadius: radii.lg,
        overflow: "hidden",
        boxShadow: shadows.lg,
        fontFamily: fonts.body,
      }}
    >
      {/* Window title bar */}
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
        <span style={{ flex: 1, textAlign: "center", fontSize: 12, color: "#666", fontWeight: 500 }}>
          Calendar — Today
        </span>
      </div>

      {/* Events list */}
      <div style={{ background: "white", padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
        {events.map((event, i) => {
          const eventDelay = appearAtFrame + 10 + i * 6;
          const eventOpacity = interpolate(frame, [eventDelay, eventDelay + 6], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });

          return (
            <div
              key={i}
              style={{
                opacity: eventOpacity,
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 10px",
                borderRadius: 6,
                background: "#f8f9fa",
              }}
            >
              <div
                style={{
                  width: 4,
                  height: 32,
                  borderRadius: 2,
                  background: event.color ?? "#4285f4",
                }}
              />
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <span style={{ fontSize: 11, color: "#5f6368", fontWeight: 500 }}>
                  {event.time}
                </span>
                <span style={{ fontSize: 13, color: "#202124", fontWeight: 500 }}>
                  {event.title}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
