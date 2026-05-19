import { Composition, registerRoot } from "remotion";
import { DemoVideo } from "./compositions/DemoVideo";
import { DemoVideoV2 } from "./compositions/DemoVideoV2";
import { PhoneMockupTest } from "./scenes/v2/PhoneMockupTest";

const FPS = 30;
const DURATION_FRAMES = 1170; // 39 seconds (38s VO + 1s tail)
const DURATION_V2 = 1200; // 40 seconds

function RemotionRoot() {
  return (
    <>
      <Composition
        id="DemoVideo"
        component={DemoVideo}
        durationInFrames={DURATION_FRAMES}
        fps={FPS}
        width={1920}
        height={1080}
      />
      <Composition
        id="DemoVideoSquare"
        component={DemoVideo}
        durationInFrames={DURATION_FRAMES}
        fps={FPS}
        width={1080}
        height={1080}
      />
      <Composition
        id="DemoVideoVertical"
        component={DemoVideo}
        durationInFrames={DURATION_FRAMES}
        fps={FPS}
        width={1080}
        height={1920}
      />
      <Composition
        id="DemoVideoV2"
        component={DemoVideoV2}
        durationInFrames={DURATION_V2}
        fps={FPS}
        width={1920}
        height={1080}
      />
      <Composition
        id="DemoVideoV2Square"
        component={DemoVideoV2}
        durationInFrames={DURATION_V2}
        fps={FPS}
        width={1080}
        height={1080}
      />
      <Composition
        id="DemoVideoV2Vertical"
        component={DemoVideoV2}
        durationInFrames={DURATION_V2}
        fps={FPS}
        width={1080}
        height={1920}
      />
      <Composition
        id="PhoneMockupTest"
        component={PhoneMockupTest}
        durationInFrames={90}
        fps={FPS}
        width={1920}
        height={1080}
      />
    </>
  );
}

registerRoot(RemotionRoot);
