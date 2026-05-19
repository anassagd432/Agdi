import { Easing } from "remotion";
import { easeOut, easeInOut } from "../theme/tokens";

export const agdiEaseOut = Easing.bezier(easeOut[0], easeOut[1], easeOut[2], easeOut[3]);
export const agdiEaseInOut = Easing.bezier(
  easeInOut[0],
  easeInOut[1],
  easeInOut[2],
  easeInOut[3],
);
