import { Command } from "commander";
import { expect, test } from "vitest";
import { registerLearningCli } from "./learning-cli.js";

test("registerLearningCli registers learn and instincts commands", () => {
  const root = new Command();
  registerLearningCli(root);

  const learnCmd = root.commands.find((command) => command.name().startsWith("learn"));
  expect(learnCmd).toBeDefined();

  const instinctCmd = root.commands.find((command) => command.name() === "instincts");
  expect(instinctCmd).toBeDefined();
  expect(instinctCmd?.aliases()).toContain("instinct");
  expect(instinctCmd?.commands.map((command) => command.name())).toEqual(
    expect.arrayContaining(["list", "export"]),
  );
});
