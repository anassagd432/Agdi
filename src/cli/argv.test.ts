import { describe, expect, it } from "vitest";
import {
  buildParseArgv,
  getFlagValue,
  getCommandPath,
  getPrimaryCommand,
  getPositiveIntFlagValue,
  getVerboseFlag,
  hasHelpOrVersion,
  hasFlag,
  shouldMigrateState,
  shouldMigrateStateFromPath,
} from "./argv.js";

describe("argv helpers", () => {
  it("detects help/version flags", () => {
    expect(hasHelpOrVersion(["node", "agdi", "--help"])).toBe(true);
    expect(hasHelpOrVersion(["node", "agdi", "-V"])).toBe(true);
    expect(hasHelpOrVersion(["node", "agdi", "status"])).toBe(false);
  });

  it("extracts command path ignoring flags and terminator", () => {
    expect(getCommandPath(["node", "agdi", "status", "--json"], 2)).toEqual(["status"]);
    expect(getCommandPath(["node", "agdi", "agents", "list"], 2)).toEqual(["agents", "list"]);
    expect(getCommandPath(["node", "agdi", "status", "--", "ignored"], 2)).toEqual(["status"]);
  });

  it("returns primary command", () => {
    expect(getPrimaryCommand(["node", "agdi", "agents", "list"])).toBe("agents");
    expect(getPrimaryCommand(["node", "agdi"])).toBeNull();
  });

  it("parses boolean flags and ignores terminator", () => {
    expect(hasFlag(["node", "agdi", "status", "--json"], "--json")).toBe(true);
    expect(hasFlag(["node", "agdi", "--", "--json"], "--json")).toBe(false);
  });

  it("extracts flag values with equals and missing values", () => {
    expect(getFlagValue(["node", "agdi", "status", "--timeout", "5000"], "--timeout")).toBe("5000");
    expect(getFlagValue(["node", "agdi", "status", "--timeout=2500"], "--timeout")).toBe("2500");
    expect(getFlagValue(["node", "agdi", "status", "--timeout"], "--timeout")).toBeNull();
    expect(getFlagValue(["node", "agdi", "status", "--timeout", "--json"], "--timeout")).toBe(null);
    expect(getFlagValue(["node", "agdi", "--", "--timeout=99"], "--timeout")).toBeUndefined();
  });

  it("parses verbose flags", () => {
    expect(getVerboseFlag(["node", "agdi", "status", "--verbose"])).toBe(true);
    expect(getVerboseFlag(["node", "agdi", "status", "--debug"])).toBe(false);
    expect(getVerboseFlag(["node", "agdi", "status", "--debug"], { includeDebug: true })).toBe(
      true,
    );
  });

  it("parses positive integer flag values", () => {
    expect(getPositiveIntFlagValue(["node", "agdi", "status"], "--timeout")).toBeUndefined();
    expect(
      getPositiveIntFlagValue(["node", "agdi", "status", "--timeout"], "--timeout"),
    ).toBeNull();
    expect(
      getPositiveIntFlagValue(["node", "agdi", "status", "--timeout", "5000"], "--timeout"),
    ).toBe(5000);
    expect(
      getPositiveIntFlagValue(["node", "agdi", "status", "--timeout", "nope"], "--timeout"),
    ).toBeUndefined();
  });

  it("builds parse argv from raw args", () => {
    const nodeArgv = buildParseArgv({
      programName: "agdi",
      rawArgs: ["node", "agdi", "status"],
    });
    expect(nodeArgv).toEqual(["node", "agdi", "status"]);

    const versionedNodeArgv = buildParseArgv({
      programName: "agdi",
      rawArgs: ["node-22", "agdi", "status"],
    });
    expect(versionedNodeArgv).toEqual(["node-22", "agdi", "status"]);

    const versionedNodeWindowsArgv = buildParseArgv({
      programName: "agdi",
      rawArgs: ["node-22.2.0.exe", "agdi", "status"],
    });
    expect(versionedNodeWindowsArgv).toEqual(["node-22.2.0.exe", "agdi", "status"]);

    const versionedNodePatchlessArgv = buildParseArgv({
      programName: "agdi",
      rawArgs: ["node-22.2", "agdi", "status"],
    });
    expect(versionedNodePatchlessArgv).toEqual(["node-22.2", "agdi", "status"]);

    const versionedNodeWindowsPatchlessArgv = buildParseArgv({
      programName: "agdi",
      rawArgs: ["node-22.2.exe", "agdi", "status"],
    });
    expect(versionedNodeWindowsPatchlessArgv).toEqual(["node-22.2.exe", "agdi", "status"]);

    const versionedNodeWithPathArgv = buildParseArgv({
      programName: "agdi",
      rawArgs: ["/usr/bin/node-22.2.0", "agdi", "status"],
    });
    expect(versionedNodeWithPathArgv).toEqual(["/usr/bin/node-22.2.0", "agdi", "status"]);

    const nodejsArgv = buildParseArgv({
      programName: "agdi",
      rawArgs: ["nodejs", "agdi", "status"],
    });
    expect(nodejsArgv).toEqual(["nodejs", "agdi", "status"]);

    const nonVersionedNodeArgv = buildParseArgv({
      programName: "agdi",
      rawArgs: ["node-dev", "agdi", "status"],
    });
    expect(nonVersionedNodeArgv).toEqual(["node", "agdi", "node-dev", "agdi", "status"]);

    const directArgv = buildParseArgv({
      programName: "agdi",
      rawArgs: ["agdi", "status"],
    });
    expect(directArgv).toEqual(["node", "agdi", "status"]);

    const bunArgv = buildParseArgv({
      programName: "agdi",
      rawArgs: ["bun", "src/entry.ts", "status"],
    });
    expect(bunArgv).toEqual(["bun", "src/entry.ts", "status"]);
  });

  it("builds parse argv from fallback args", () => {
    const fallbackArgv = buildParseArgv({
      programName: "agdi",
      fallbackArgv: ["status"],
    });
    expect(fallbackArgv).toEqual(["node", "agdi", "status"]);
  });

  it("decides when to migrate state", () => {
    expect(shouldMigrateState(["node", "agdi", "status"])).toBe(false);
    expect(shouldMigrateState(["node", "agdi", "health"])).toBe(false);
    expect(shouldMigrateState(["node", "agdi", "sessions"])).toBe(false);
    expect(shouldMigrateState(["node", "agdi", "config", "get", "update"])).toBe(false);
    expect(shouldMigrateState(["node", "agdi", "config", "unset", "update"])).toBe(false);
    expect(shouldMigrateState(["node", "agdi", "models", "list"])).toBe(false);
    expect(shouldMigrateState(["node", "agdi", "models", "status"])).toBe(false);
    expect(shouldMigrateState(["node", "agdi", "memory", "status"])).toBe(false);
    expect(shouldMigrateState(["node", "agdi", "agent", "--message", "hi"])).toBe(false);
    expect(shouldMigrateState(["node", "agdi", "agents", "list"])).toBe(true);
    expect(shouldMigrateState(["node", "agdi", "message", "send"])).toBe(true);
  });

  it("reuses command path for migrate state decisions", () => {
    expect(shouldMigrateStateFromPath(["status"])).toBe(false);
    expect(shouldMigrateStateFromPath(["config", "get"])).toBe(false);
    expect(shouldMigrateStateFromPath(["models", "status"])).toBe(false);
    expect(shouldMigrateStateFromPath(["agents", "list"])).toBe(true);
  });
});
