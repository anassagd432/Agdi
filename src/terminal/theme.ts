import chalk, { Chalk } from "chalk";
import { AGDI_PALETTE } from "./palette.js";

const hasForceColor =
  typeof process.env.FORCE_COLOR === "string" &&
  process.env.FORCE_COLOR.trim().length > 0 &&
  process.env.FORCE_COLOR.trim() !== "0";

const baseChalk = process.env.NO_COLOR && !hasForceColor ? new Chalk({ level: 0 }) : chalk;

const hex = (value: string) => baseChalk.hex(value);

export const theme = {
  accent: hex(AGDI_PALETTE.accent),
  accentBright: hex(AGDI_PALETTE.accentBright),
  accentDim: hex(AGDI_PALETTE.accentDim),
  info: hex(AGDI_PALETTE.info),
  success: hex(AGDI_PALETTE.success),
  warn: hex(AGDI_PALETTE.warn),
  error: hex(AGDI_PALETTE.error),
  muted: hex(AGDI_PALETTE.muted),
  heading: baseChalk.bold.hex(AGDI_PALETTE.accent),
  command: hex(AGDI_PALETTE.accentBright),
  option: hex(AGDI_PALETTE.warn),
} as const;

export const isRich = () => Boolean(baseChalk.level > 0);

export const colorize = (rich: boolean, color: (value: string) => string, value: string) =>
  rich ? color(value) : value;
