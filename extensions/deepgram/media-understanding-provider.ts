import type { MediaUnderstandingProvider } from "agdi/plugin-sdk/media-understanding";
import { transcribeDeepgramAudio } from "./audio.js";

export const deepgramMediaUnderstandingProvider: MediaUnderstandingProvider = {
  id: "deepgram",
  capabilities: ["audio"],
  transcribeAudio: transcribeDeepgramAudio,
};
