import test from "node:test";
import assert from "node:assert/strict";
import { registerLearningCli } from "./learning-cli.js";

class MockCommand {
  public nameStr: string = "";
  public aliasList: string[] = [];
  public subcommands: MockCommand[] = [];

  constructor(name = "") {
    this.nameStr = name;
  }

  command(name: string) {
    const sub = new MockCommand(name);
    this.subcommands.push(sub);
    return sub;
  }

  alias(a: string) {
    this.aliasList.push(a);
    return this;
  }

  description(_desc: string) {
    return this;
  }

  option(_flags: string, _desc?: string, _default?: unknown) {
    return this;
  }

  action(_fn: (...args: any[]) => void) {
    return this;
  }

  name() {
    return this.nameStr.split(" ")[0];
  }

  aliases() {
    return this.aliasList;
  }

  get commands() {
    return this.subcommands;
  }
}

test("registerLearningCli: registers learn and instincts commands with subcommands", () => {
  const root = new MockCommand("root");
  registerLearningCli(root as any);

  const learnCmd = root.commands.find((c) => c.name().startsWith("learn"));
  assert.ok(learnCmd, "learn command should be registered");

  const instinctCmd = root.commands.find((c) => c.name() === "instincts");
  assert.ok(instinctCmd, "instincts command should be registered");
  assert.ok(instinctCmd.aliases().includes("instinct"), "instinct alias should be registered");

  const subcommands = instinctCmd.commands.map((c) => c.name());
  assert.ok(subcommands.includes("list"), "list subcommand should exist");
  assert.ok(subcommands.includes("export"), "export subcommand should exist");
});
