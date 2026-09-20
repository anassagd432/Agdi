import test from "node:test";
import assert from "node:assert/strict";
import { registerGoalsCli } from "./goals-cli.js";

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

test("registerGoalsCli: registers goal and goals commands with expected subcommands", () => {
  const root = new MockCommand("root");
  registerGoalsCli(root as any);

  const goalCmd = root.commands.find((c) => c.name() === "goals");
  assert.ok(goalCmd, "goals command should be registered");
  assert.ok(goalCmd.aliases().includes("goal"), "goal alias should be registered");

  const subcommands = goalCmd.commands.map((c) => c.name());
  assert.ok(subcommands.includes("list"), "list subcommand should exist");
  assert.ok(subcommands.includes("new"), "new subcommand should exist");
  assert.ok(subcommands.includes("run"), "run subcommand should exist");
  assert.ok(subcommands.includes("verify"), "verify subcommand should exist");
  assert.ok(subcommands.includes("proofs"), "proofs subcommand should exist");
});
