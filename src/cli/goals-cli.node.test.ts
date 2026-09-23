import { Command } from "commander";
import { expect, test } from "vitest";
import { registerGoalsCli } from "./goals-cli.js";

test("registerGoalsCli registers goal commands with expected subcommands", () => {
  const root = new Command();
  registerGoalsCli(root);

  const goalCmd = root.commands.find((command) => command.name() === "goals");
  expect(goalCmd).toBeDefined();
  expect(goalCmd?.aliases()).toContain("goal");
  expect(goalCmd?.commands.map((command) => command.name())).toEqual(
    expect.arrayContaining(["list", "new", "run", "verify", "proofs"]),
  );
});
