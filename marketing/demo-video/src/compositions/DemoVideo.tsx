import { AbsoluteFill, Sequence, Audio, staticFile } from "remotion";
import { HookScene } from "../scenes/HookScene";
import { InstallScene } from "../scenes/InstallScene";
import { DashboardTourScene } from "../scenes/DashboardTourScene";
import { ChannelToolScene } from "../scenes/ChannelToolScene";
import { TraceScene } from "../scenes/TraceScene";
import { CtaScene } from "../scenes/CtaScene";
import { Caption } from "../components/Caption";
import { colors } from "../theme/tokens";

const FPS = 30;

// 39s @ 30fps = 1170 frames. Scene boundaries are locked to the VO timestamps.
export const TIMINGS = {
  hook: { from: 0, dur: 90 },
  install: { from: 90, dur: 240 },
  dashboardTour: { from: 330, dur: 210 },
  channelTool: { from: 540, dur: 270 },
  trace: { from: 810, dur: 120 },
  cta: { from: 930, dur: 240 },
} as const;

const frameToMs = (frame: number) => Math.round((frame / FPS) * 1000);

type CaptionData = {
  text: string;
  startMs: number;
  endMs: number;
  timestampMs: number | null;
  confidence: number | null;
};

const captionFromFrames = (
  text: string,
  startFrame: number,
  endFrame: number,
): CaptionData => ({
  text,
  startMs: frameToMs(startFrame),
  endMs: frameToMs(endFrame),
  timestampMs: frameToMs(startFrame),
  confidence: null,
});

const CAPTIONS: CaptionData[] = [
  captionFromFrames("Most AI tools live in someone else's cloud.", 0, 90),
  captionFromFrames("Agdi runs on yours.", 90, 150),
  captionFromFrames("One command, then your agent workspace is live.", 150, 330),
  captionFromFrames(
    "Workspace, assistants, connections, automations, and activity in one place.",
    330,
    540,
  ),
  captionFromFrames("Connect Slack. Ask for a production check.", 540, 660),
  captionFromFrames("The assistant chooses a tool and runs it for real.", 660, 750),
  captionFromFrames("And tells you exactly what it did.", 750, 810),
  captionFromFrames("Every action traced. Nothing hidden.", 810, 930),
  captionFromFrames("AI that actually does things, on your machine.", 930, 1050),
  captionFromFrames("Install Agdi. Then run agdi setup.", 1050, 1170),
];

const msToFrame = (ms: number) => Math.round((ms / 1000) * FPS);

export function DemoVideo() {
  return (
    <AbsoluteFill style={{ background: colors.bg }}>
      <Sequence from={TIMINGS.hook.from} durationInFrames={TIMINGS.hook.dur}>
        <HookScene />
      </Sequence>

      <Sequence from={TIMINGS.install.from} durationInFrames={TIMINGS.install.dur}>
        <InstallScene />
      </Sequence>

      <Sequence from={TIMINGS.dashboardTour.from} durationInFrames={TIMINGS.dashboardTour.dur}>
        <DashboardTourScene />
      </Sequence>

      <Sequence from={TIMINGS.channelTool.from} durationInFrames={TIMINGS.channelTool.dur}>
        <ChannelToolScene />
      </Sequence>

      <Sequence from={TIMINGS.trace.from} durationInFrames={TIMINGS.trace.dur}>
        <TraceScene />
      </Sequence>

      <Sequence from={TIMINGS.cta.from} durationInFrames={TIMINGS.cta.dur}>
        <CtaScene />
      </Sequence>

      {CAPTIONS.map((c) => (
        <Caption
          key={`${c.startMs}-${c.text}`}
          text={c.text}
          appearAtFrame={msToFrame(c.startMs)}
          disappearAtFrame={msToFrame(c.endMs)}
        />
      ))}

      <VoiceoverIfPresent />
    </AbsoluteFill>
  );
}

/**
 * Renders the founder VO if `public/audio/voiceover.wav` exists. Wrapped in a
 * try/catch because Remotion treats a missing static file as a fatal error
 * otherwise, which would block previewing the silent cut.
 */
function VoiceoverIfPresent() {
  try {
    const src = staticFile("audio/voiceover.wav");
    return <Audio src={src} />;
  } catch {
    return null;
  }
}
