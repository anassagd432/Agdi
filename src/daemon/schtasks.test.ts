import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseSchtasksQuery, readScheduledTaskCommand, resolveTaskScriptPath } from "./schtasks.js";

describe("schtasks runtime parsing", () => {
  it("parses status and last run info", () => {
    const output = [
      "TaskName: \\AGDI Gateway",
      "Status: Ready",
      "Last Run Time: 1/8/2026 1:23:45 AM",
      "Last Run Result: 0x0",
    ].join("\r\n");
    expect(parseSchtasksQuery(output)).toEqual({
      status: "Ready",
      lastRunTime: "1/8/2026 1:23:45 AM",
      lastRunResult: "0x0",
    });
  });

  it("parses running status", () => {
    const output = [
      "TaskName: \\AGDI Gateway",
      "Status: Running",
      "Last Run Time: 1/8/2026 1:23:45 AM",
      "Last Run Result: 0x0",
    ].join("\r\n");
    expect(parseSchtasksQuery(output)).toEqual({
      status: "Running",
      lastRunTime: "1/8/2026 1:23:45 AM",
      lastRunResult: "0x0",
    });
  });
});

describe("resolveTaskScriptPath", () => {
  it("uses default path when AGDI_PROFILE is unset", () => {
    const env = { USERPROFILE: "C:\\Users\\test" };
    expect(resolveTaskScriptPath(env)).toBe(path.join("C:\\Users\\test", ".agdi", "gateway.cmd"));
  });

  it("uses profile-specific path when AGDI_PROFILE is set to a custom value", () => {
    const env = { USERPROFILE: "C:\\Users\\test", AGDI_PROFILE: "jbphoenix" };
    expect(resolveTaskScriptPath(env)).toBe(
      path.join("C:\\Users\\test", ".agdi-jbphoenix", "gateway.cmd"),
    );
  });

  it("prefers AGDI_STATE_DIR over profile-derived defaults", () => {
    const env = {
      USERPROFILE: "C:\\Users\\test",
      AGDI_PROFILE: "rescue",
      AGDI_STATE_DIR: "C:\\State\\agdi",
    };
    expect(resolveTaskScriptPath(env)).toBe(path.join("C:\\State\\agdi", "gateway.cmd"));
  });

  it("falls back to HOME when USERPROFILE is not set", () => {
    const env = { HOME: "/home/test", AGDI_PROFILE: "default" };
    expect(resolveTaskScriptPath(env)).toBe(path.join("/home/test", ".agdi", "gateway.cmd"));
  });
});

describe("readScheduledTaskCommand", () => {
  it("parses script with quoted arguments containing spaces", async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "agdi-schtasks-test-"));
    try {
      const scriptPath = path.join(tmpDir, ".agdi", "gateway.cmd");
      await fs.mkdir(path.dirname(scriptPath), { recursive: true });
      // Use forward slashes which work in Windows cmd and avoid escape parsing issues
      await fs.writeFile(
        scriptPath,
        ["@echo off", '"C:/Program Files/Node/node.exe" gateway.js'].join("\r\n"),
        "utf8",
      );

      const env = { USERPROFILE: tmpDir, AGDI_PROFILE: "default" };
      const result = await readScheduledTaskCommand(env);
      expect(result).toEqual({
        programArguments: ["C:/Program Files/Node/node.exe", "gateway.js"],
      });
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });

  it("returns null when script does not exist", async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "agdi-schtasks-test-"));
    try {
      const env = { USERPROFILE: tmpDir, AGDI_PROFILE: "default" };
      const result = await readScheduledTaskCommand(env);
      expect(result).toBeNull();
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });

  it("returns null when script has no command", async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "agdi-schtasks-test-"));
    try {
      const scriptPath = path.join(tmpDir, ".agdi", "gateway.cmd");
      await fs.mkdir(path.dirname(scriptPath), { recursive: true });
      await fs.writeFile(
        scriptPath,
        ["@echo off", "rem This is just a comment"].join("\r\n"),
        "utf8",
      );

      const env = { USERPROFILE: tmpDir, AGDI_PROFILE: "default" };
      const result = await readScheduledTaskCommand(env);
      expect(result).toBeNull();
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });

  it("parses full script with all components", async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "agdi-schtasks-test-"));
    try {
      const scriptPath = path.join(tmpDir, ".agdi", "gateway.cmd");
      await fs.mkdir(path.dirname(scriptPath), { recursive: true });
      await fs.writeFile(
        scriptPath,
        [
          "@echo off",
          "rem AGDI Gateway",
          "cd /d C:\\Projects\\agdi",
          "set NODE_ENV=production",
          "set AGDI_PORT=18789",
          "node gateway.js --verbose",
        ].join("\r\n"),
        "utf8",
      );

      const env = { USERPROFILE: tmpDir, AGDI_PROFILE: "default" };
      const result = await readScheduledTaskCommand(env);
      expect(result).toEqual({
        programArguments: ["node", "gateway.js", "--verbose"],
        workingDirectory: "C:\\Projects\\agdi",
        environment: {
          NODE_ENV: "production",
          AGDI_PORT: "18789",
        },
      });
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });
  it("parses command with Windows backslash paths", async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "agdi-schtasks-test-"));
    try {
      const scriptPath = path.join(tmpDir, ".agdi", "gateway.cmd");
      await fs.mkdir(path.dirname(scriptPath), { recursive: true });
      await fs.writeFile(
        scriptPath,
        [
          "@echo off",
          '"C:\\Program Files\\nodejs\\node.exe" C:\\Users\\test\\AppData\\Roaming\\npm\\node_modules\\agdi\\dist\\index.js gateway --port 18789',
        ].join("\r\n"),
        "utf8",
      );

      const env = { USERPROFILE: tmpDir, AGDI_PROFILE: "default" };
      const result = await readScheduledTaskCommand(env);
      expect(result).toEqual({
        programArguments: [
          "C:\\Program Files\\nodejs\\node.exe",
          "C:\\Users\\test\\AppData\\Roaming\\npm\\node_modules\\agdi\\dist\\index.js",
          "gateway",
          "--port",
          "18789",
        ],
      });
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });

  it("preserves UNC paths in command arguments", async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "agdi-schtasks-test-"));
    try {
      const scriptPath = path.join(tmpDir, ".agdi", "gateway.cmd");
      await fs.mkdir(path.dirname(scriptPath), { recursive: true });
      await fs.writeFile(
        scriptPath,
        [
          "@echo off",
          '"\\\\fileserver\\AGDI Share\\node.exe" "\\\\fileserver\\AGDI Share\\dist\\index.js" gateway --port 18789',
        ].join("\r\n"),
        "utf8",
      );

      const env = { USERPROFILE: tmpDir, AGDI_PROFILE: "default" };
      const result = await readScheduledTaskCommand(env);
      expect(result).toEqual({
        programArguments: [
          "\\\\fileserver\\AGDI Share\\node.exe",
          "\\\\fileserver\\AGDI Share\\dist\\index.js",
          "gateway",
          "--port",
          "18789",
        ],
      });
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });
});
