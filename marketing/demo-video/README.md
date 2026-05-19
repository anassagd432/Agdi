# Agdi Demo Video

39-second cold-outbound demo of Agdi, built with Remotion. It presents Agdi as an agent workspace: setup, connections, automation, traceability, and a clear install path.

## Run

```bash
pnpm install
pnpm dev             # Remotion Studio at http://localhost:3000
pnpm render          # out/agdi-demo-39s.mp4 (1920x1080)
pnpm render:square   # out/agdi-demo-square.mp4 (1080x1080)
pnpm render:vertical # out/agdi-demo-vertical.mp4 (1080x1920)
pnpm render:thumb    # out/agdi-demo-poster.png
pnpm check:still     # out/agdi-demo-check.png at the trace frame
```

## Voiceover

Drop the founder-recorded WAV at `public/audio/voiceover.wav` and re-render. Caption timing is anchored to absolute frames; if the recording drifts more than +/-15 frames, adjust the `from`/`durationInFrames` on each `<Sequence>` in `src/compositions/DemoVideo.tsx`.

## Brand fidelity

Tokens in `src/theme/tokens.ts` are ported from the Agdi workspace theme. Update tokens there first, then re-render. Every component reads from this single source.
