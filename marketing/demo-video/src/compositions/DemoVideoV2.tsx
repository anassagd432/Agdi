import { AbsoluteFill, Sequence, Audio, staticFile } from "remotion";
import { HookSceneV2 } from "../scenes/v2/HookSceneV2";
import { SolutionIntroScene } from "../scenes/v2/SolutionIntroScene";
import { DemoMessageScene } from "../scenes/v2/DemoMessageScene";
import { AutonomousWorkScene } from "../scenes/v2/AutonomousWorkScene";
import { ResultScene } from "../scenes/v2/ResultScene";
import { CtaSceneV2 } from "../scenes/v2/CtaSceneV2";
import { FadeWrapper } from "../components/shared/FadeWrapper";
import { Caption } from "../components/Caption";
import { colors } from "../theme/tokens";

export const TIMINGS_V2 = {
  hook: { from: 0, dur: 105 },       // Extended +15 for overlap
  intro: { from: 90, dur: 165 },     // Starts at 90 (overlaps hook), +15 for next
  demo: { from: 240, dur: 315 },     // Starts at 240 (overlaps intro), +15 for next
  work: { from: 540, dur: 255 },     // Starts at 540 (overlaps demo), +15 for next
  result: { from: 780, dur: 225 },   // Starts at 780 (overlaps work), +15 for next
  cta: { from: 990, dur: 210 },      // Starts at 990 (overlaps result), no overlap after
} as const;

export function DemoVideoV2() {
  return (
    <AbsoluteFill style={{ background: colors.bg }}>
      <Sequence from={TIMINGS_V2.hook.from} durationInFrames={TIMINGS_V2.hook.dur}>
        <FadeWrapper fadeOutStart={90} fadeOutFrames={15}>
          <HookSceneV2 />
        </FadeWrapper>
      </Sequence>

      <Sequence from={TIMINGS_V2.intro.from} durationInFrames={TIMINGS_V2.intro.dur}>
        <FadeWrapper fadeInFrames={15} fadeOutStart={150} fadeOutFrames={15}>
          <SolutionIntroScene />
        </FadeWrapper>
      </Sequence>

      <Sequence from={TIMINGS_V2.demo.from} durationInFrames={TIMINGS_V2.demo.dur}>
        <FadeWrapper fadeInFrames={15} fadeOutStart={300} fadeOutFrames={15}>
          <DemoMessageScene />
        </FadeWrapper>
      </Sequence>

      <Sequence from={TIMINGS_V2.work.from} durationInFrames={TIMINGS_V2.work.dur}>
        <FadeWrapper fadeInFrames={15} fadeOutStart={240} fadeOutFrames={15}>
          <AutonomousWorkScene />
        </FadeWrapper>
      </Sequence>

      <Sequence from={TIMINGS_V2.result.from} durationInFrames={TIMINGS_V2.result.dur}>
        <FadeWrapper fadeInFrames={15} fadeOutStart={210} fadeOutFrames={15}>
          <ResultScene />
        </FadeWrapper>
      </Sequence>

      <Sequence from={TIMINGS_V2.cta.from} durationInFrames={TIMINGS_V2.cta.dur}>
        <FadeWrapper fadeInFrames={15}>
          <CtaSceneV2 />
        </FadeWrapper>
      </Sequence>

      {/* Voiceover audio */}
      <Audio src={staticFile("audio/voiceover.wav")} />

      {/* Captions synced to voiceover */}
      <Caption
        text="Your AI should work FOR you, not just WITH you."
        appearAtFrame={15}
        disappearAtFrame={85}
      />
      <Caption
        text="Meet Agdi — your AI assistant that lives right in WhatsApp."
        appearAtFrame={100}
        disappearAtFrame={200}
      />
      <Caption
        text="Message it like a colleague, and watch it work."
        appearAtFrame={205}
        disappearAtFrame={250}
      />
      <Caption
        text="Ask it to check your calendar and email the team."
        appearAtFrame={260}
        disappearAtFrame={380}
      />
      <Caption
        text="Agdi handles it all — autonomously, on your own machine."
        appearAtFrame={390}
        disappearAtFrame={530}
      />
      <Caption
        text="It reads your calendar, composes emails, checks deployments."
        appearAtFrame={550}
        disappearAtFrame={700}
      />
      <Caption
        text="And keeps you updated every step of the way."
        appearAtFrame={710}
        disappearAtFrame={775}
      />
      <Caption
        text="Real work, real tools, real automation — all from your phone."
        appearAtFrame={790}
        disappearAtFrame={980}
      />
      <Caption
        text="Install Agdi. Your AI assistant is waiting."
        appearAtFrame={1020}
        disappearAtFrame={1180}
      />
    </AbsoluteFill>
  );
}
