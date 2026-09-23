import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { normalizeConfigDocBaselineHelpPath } from "./doc-baseline.js";
import { FIELD_HELP } from "./schema.help.js";
import {
  describeTalkSilenceTimeoutDefaults,
  TALK_SILENCE_TIMEOUT_MS_BY_PLATFORM,
} from "./talk-defaults.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function readRepoFile(relativePath: string): string {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

describe("talk silence timeout defaults", () => {
  it("keeps help text and docs aligned with the policy", () => {
    const defaultsDescription = describeTalkSilenceTimeoutDefaults();
    const baselineLines = readRepoFile("docs/.generated/config-baseline.jsonl")
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line) as { recordType: string; path?: string; help?: string });
    const talkEntry = baselineLines.find(
      (entry) =>
        entry.recordType === "path" &&
        entry.path === normalizeConfigDocBaselineHelpPath("talk.silenceTimeoutMs"),
    );

    expect(FIELD_HELP["talk.silenceTimeoutMs"]).toContain(defaultsDescription);
    expect(talkEntry?.help).toContain(defaultsDescription);
    expect(readRepoFile("docs/gateway/configuration-reference.md")).toContain(defaultsDescription);
    expect(readRepoFile("docs/nodes/talk.md")).toContain(defaultsDescription);
  });

  it("keeps platform defaults stable in this repository", () => {
    // Native app sources are not part of Agdi; their parity cannot be tested here.
    expect(TALK_SILENCE_TIMEOUT_MS_BY_PLATFORM).toEqual({ macos: 700, android: 700, ios: 900 });
  });
});
