# Visual Polish & Transitions: Agdi Demo Video V2

## Context
Tune animation timings and add cross-fade transitions to DemoVideoV2. All structural components are built, now refining timing consistency and adding smooth scene transitions.

## Changes

### Timing Adjustments

**src/scenes/v2/HookSceneV2.tsx:14**
- Change `charsPerFrame: 1.8` to `1.5` (slower, more deliberate)
- Change cursor blink `frame / 4` to `frame / 6` (667ms cycle, less distracting)

**src/scenes/v2/CtaSceneV2.tsx:28,37**
- Keep `charsPerFrame: 1.2` (already slower, terminal-appropriate)
- Change cursor blink `frame / 4` to `frame / 6` in Cursor component

**src/scenes/v2/DemoMessageScene.tsx:99-125**
- Stagger ToolCard appearances: 
  - Card 1: `appearAtFrame: 110` (was 100, +10 delay)
  - Card 2: `appearAtFrame: 150` (was 140, +10 delay)
  - Card 3: `appearAtFrame: 180` (was 170, +10 delay)
- Better visual rhythm, less rushed

### Cross-Fade Transitions

**src/compositions/DemoVideoV2.tsx:10-17**
- Extend each scene duration by 15 frames for overlap window
- Add fadeOut logic to each scene's wrapper
- Add fadeIn logic to each scene's wrapper
- Pattern: Last 15 frames fade out (1→0), first 15 frames fade in (0→1)

```typescript
// New TIMINGS_V2 with overlap
export const TIMINGS_V2 = {
  hook: { from: 0, dur: 105 },       // was 90, +15 for overlap
  intro: { from: 90, dur: 165 },     // was 150, starts 0 (overlaps hook), +15 for next
  demo: { from: 240, dur: 315 },     // was 300, starts -15, +15 for next
  work: { from: 540, dur: 255 },     // was 240, starts -15, +15 for next
  result: { from: 780, dur: 225 },   // was 210, starts -15, +15 for next
  cta: { from: 990, dur: 210 },      // was 210, starts -15, no overlap after
} as const;

// Wrap each Sequence with fade logic
<Sequence from={TIMINGS_V2.hook.from} durationInFrames={TIMINGS_V2.hook.dur}>
  <FadeWrapper fadeInFrames={0} fadeOutStart={90} fadeOutFrames={15}>
    <HookSceneV2 />
  </FadeWrapper>
</Sequence>
```

**src/components/shared/FadeWrapper.tsx** (new component)
- Accepts: `fadeInFrames`, `fadeOutStart`, `fadeOutFrames`, `children`
- Uses `useCurrentFrame()` and `interpolate()` for opacity
- Easing: `agdiEaseInOut` for smooth transitions

## Implementation Sequence

1. **Create FadeWrapper component** (`src/components/shared/FadeWrapper.tsx`)
   - Utility component for opacity interpolation
   - Props: `fadeInFrames`, `fadeOutStart`, `fadeOutFrames`, `children`
   - Uses `useCurrentFrame()`, `interpolate()`, `agdiEaseInOut`

2. **Update TIMINGS_V2** in `src/compositions/DemoVideoV2.tsx`
   - Extend each scene by 15 frames for overlap window
   - Start times create -15 offset for incoming scenes

3. **Wrap each Sequence** in `src/compositions/DemoVideoV2.tsx`
   - Apply FadeWrapper with calculated fade ranges
   - hook: fadeOut 90-105
   - intro: fadeIn 0-15, fadeOut 240-255
   - demo: fadeIn 0-15, fadeOut 540-555
   - work: fadeIn 0-15, fadeOut 780-795
   - result: fadeIn 0-15, fadeOut 990-1005
   - cta: fadeIn 0-15

4. **Adjust HookSceneV2** timing
   - Line 14: `charsPerFrame: 1.8` → `1.5`
   - Line 47: `frame / 4` → `frame / 6`

5. **Adjust CtaSceneV2** timing
   - Line 173: Cursor component `frame / 4` → `frame / 6`

6. **Stagger DemoMessageScene** ToolCards
   - Line 100: `appearAtFrame: 100` → `110`
   - Line 109: `appearAtFrame: 140` → `150`
   - Line 118: `appearAtFrame: 170` → `180`

## Edge Cases & Risks

- **Risk**: Cross-fade timing feels too fast or too slow
  - **Mitigation**: 15-frame overlap (500ms) is standard; can adjust fadeInFrames/fadeOutFrames if needed
- **Risk**: Cursor blink at 6 frames (200ms) too slow
  - **Mitigation**: Test in Remotion Studio; may need frame/5 (167ms) instead
- **Risk**: Staggered ToolCards delay Scene 3 completion
  - **Mitigation**: Scene 3 duration already accounts for 200-frame completion; stagger keeps within bounds

## Verification

```bash
cd c:/Users/anass/Documents/GitHub/Agdi/marketing/demo-video
npx tsc --noEmit
npx remotion studio src/Root.tsx
# Scrub through DemoVideoV2, verify:
# - Smooth cross-fades at 90, 240, 540, 780, 990
# - HookSceneV2 typing feels deliberate
# - CtaSceneV2 cursor blink not distracting
# - DemoMessageScene ToolCards stagger naturally
```
