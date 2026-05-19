import { ReactNode } from "react";
import { whatsapp } from "../../theme/tokens";

interface WhatsAppUIProps {
  contactName?: string;
  children: ReactNode;
  showInputField?: boolean;
}

export function WhatsAppUI({
  contactName = "Agdi",
  children,
  showInputField = true,
}: WhatsAppUIProps) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: whatsapp.chatBg,
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      {/* iOS Status Bar */}
      <div
        style={{
          height: 54,
          background: whatsapp.green,
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          padding: "0 24px 6px",
          color: "white",
          fontSize: 12,
          fontWeight: 500,
        }}
      >
        <span>9:41</span>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <SignalIcon />
          <WifiIcon />
          <BatteryIcon />
        </div>
      </div>

      {/* WhatsApp Header */}
      <div
        style={{
          height: 60,
          background: whatsapp.green,
          display: "flex",
          alignItems: "center",
          padding: "0 12px",
          gap: 12,
          borderBottom: "1px solid rgba(0,0,0,0.1)",
        }}
      >
        <BackArrow />
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            background: "linear-gradient(135deg, #1ee0ff 0%, #14b8a6 100%)",
            display: "grid",
            placeItems: "center",
            color: "white",
            fontSize: 16,
            fontWeight: 700,
          }}
        >
          A
        </div>
        <div style={{ flex: 1 }}>
          <div
            style={{ color: "white", fontSize: 16, fontWeight: 600 }}
          >
            {contactName}
          </div>
          <div
            style={{ color: "rgba(255,255,255,0.7)", fontSize: 12 }}
          >
            online
          </div>
        </div>
        <VideoIcon />
        <CallIcon />
      </div>

      {/* Chat Area */}
      <div
        style={{
          flex: 1,
          overflow: "hidden",
          position: "relative",
          padding: "12px 10px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
        }}
      >
        {children}
      </div>

      {/* Input Field */}
      {showInputField && (
        <div
          style={{
            height: 52,
            padding: "6px 8px",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <div
            style={{
              flex: 1,
              height: 40,
              background: "white",
              borderRadius: 20,
              display: "flex",
              alignItems: "center",
              padding: "0 12px",
              gap: 8,
            }}
          >
            <EmojiIcon />
            <span style={{ flex: 1, color: "#8e8e93", fontSize: 14 }}>
              Message
            </span>
            <AttachIcon />
            <CameraIcon />
          </div>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              background: whatsapp.green,
              display: "grid",
              placeItems: "center",
            }}
          >
            <MicIcon />
          </div>
        </div>
      )}
    </div>
  );
}

function SignalIcon() {
  return (
    <svg width="16" height="12" viewBox="0 0 16 12" fill="white">
      <rect x="0" y="8" width="3" height="4" rx="1" />
      <rect x="4.5" y="5" width="3" height="7" rx="1" />
      <rect x="9" y="2" width="3" height="10" rx="1" />
      <rect x="13.5" y="0" width="3" height="12" rx="1" opacity="0.4" />
    </svg>
  );
}

function WifiIcon() {
  return (
    <svg width="14" height="12" viewBox="0 0 14 12" fill="white">
      <path d="M7 10.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z" />
      <path
        d="M3.5 8.5C4.5 7.5 5.7 7 7 7s2.5.5 3.5 1.5"
        fill="none"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M1 5.5C2.8 3.8 4.8 3 7 3s4.2.8 6 2.5"
        fill="none"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function BatteryIcon() {
  return (
    <svg width="24" height="12" viewBox="0 0 24 12" fill="none">
      <rect
        x="0.5"
        y="0.5"
        width="21"
        height="11"
        rx="2.5"
        stroke="white"
        strokeOpacity="0.6"
      />
      <rect x="2" y="2" width="18" height="8" rx="1.5" fill="white" />
      <rect x="22.5" y="3.5" width="1.5" height="5" rx="0.75" fill="white" fillOpacity="0.5" />
    </svg>
  );
}

function BackArrow() {
  return (
    <svg width="12" height="20" viewBox="0 0 12 20" fill="none">
      <path
        d="M10 2L2 10L10 18"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function VideoIcon() {
  return (
    <svg width="24" height="16" viewBox="0 0 24 16" fill="white">
      <rect x="0" y="2" width="16" height="12" rx="2" />
      <path d="M17 5l5-2v10l-5-2V5z" />
    </svg>
  );
}

function CallIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="white">
      <path d="M3.6 1.2c.5-.5 1.3-.5 1.7 0l2.4 2.4c.5.5.5 1.2 0 1.7l-1.2 1.2c.8 1.6 2 2.8 3.6 3.6l1.2-1.2c.5-.5 1.2-.5 1.7 0l2.4 2.4c.5.5.5 1.3 0 1.7l-1.5 1.5c-1 1-2.6 1.2-3.8.5C7 13.3 4.7 11 3.1 7.9c-.7-1.2-.5-2.8.5-3.8l1.5-1.5-.5-.4z" />
    </svg>
  );
}

function EmojiIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <circle cx="11" cy="11" r="10" stroke="#8e8e93" strokeWidth="1.5" />
      <circle cx="8" cy="9" r="1.2" fill="#8e8e93" />
      <circle cx="14" cy="9" r="1.2" fill="#8e8e93" />
      <path
        d="M7.5 13.5c1 1.5 2.5 2 3.5 2s2.5-.5 3.5-2"
        stroke="#8e8e93"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function AttachIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path
        d="M15 10.5l-5.5 5.5a3.5 3.5 0 0 1-5-5l7-7a2 2 0 0 1 3 3l-6.5 6.5"
        stroke="#8e8e93"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CameraIcon() {
  return (
    <svg width="20" height="18" viewBox="0 0 20 18" fill="none">
      <rect x="1" y="4" width="18" height="13" rx="2" stroke="#8e8e93" strokeWidth="1.5" />
      <circle cx="10" cy="10.5" r="3.5" stroke="#8e8e93" strokeWidth="1.5" />
      <path d="M7 4l1-2.5h4l1 2.5" stroke="#8e8e93" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function MicIcon() {
  return (
    <svg width="14" height="20" viewBox="0 0 14 20" fill="white">
      <rect x="4" y="0" width="6" height="12" rx="3" />
      <path
        d="M1 9a6 6 0 0 0 12 0"
        fill="none"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path d="M7 16v3" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
