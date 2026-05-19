// Pure frame-driven typewriter: given a target string, the current frame, and
// the frame at which typing starts, returns the substring revealed so far.
// Deterministic: identical input always yields identical output.

interface TypewriterArgs {
  text: string;
  frame: number;
  startFrame: number;
  charsPerFrame?: number;
}

export function revealedText({
  text,
  frame,
  startFrame,
  charsPerFrame = 1.5,
}: TypewriterArgs): string {
  if (frame < startFrame) {
    return "";
  }
  const elapsed = frame - startFrame;
  const chars = Math.min(text.length, Math.floor(elapsed * charsPerFrame));
  return text.slice(0, chars);
}
