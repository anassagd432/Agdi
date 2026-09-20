import type { Command } from "commander";
import * as fs from "node:fs";
import * as path from "node:path";
import { LearningEngine } from "../learning/index.js";
const theme = {
  bold: (s: string) => `\x1b[1m${s}\x1b[22m`,
  muted: (s: string) => `\x1b[90m${s}\x1b[39m`,
  success: (s: string) => `\x1b[32m${s}\x1b[39m`,
  warn: (s: string) => `\x1b[33m${s}\x1b[39m`,
  error: (s: string) => `\x1b[31m${s}\x1b[39m`,
};
const defaultRuntime = {
  log: (...args: unknown[]) => console.log(...args),
  error: (...args: unknown[]) => console.error(...args),
};

export function registerLearningCli(program: Command): void {
  program
    .command("learn <trigger>")
    .description("Capture a verified execution pattern into an autonomous instinct and skill")
    .option("-a, --action <action>", "Concrete command or tool action to execute", "")
    .option("-p, --pattern <pattern>", "Diagnostic context or failure pattern matched", "")
    .option("-t, --tags <tags>", "Comma-separated tags (e.g. testing,windows,ssl)", "")
    .option("--save-skill", "Export and save synthesized SKILL.md into local skills folder", false)
    .action(
      async (
        trigger: string,
        options: { action: string; pattern: string; tags: string; saveSkill: boolean },
      ) => {
        try {
          const engine = new LearningEngine();
          const tags = options.tags
            ? options.tags
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean)
            : [];

          const instinct = engine.learnFromGoal({
            goalId: `cli-learned-${Date.now()}`,
            goalTitle: trigger,
            trigger,
            solutionPattern: options.pattern || trigger,
            concreteAction: options.action || trigger,
            tags,
            scope: "project",
          });

          defaultRuntime.log(`\n${theme.success("✓ Instinct recorded successfully:")} ${theme.bold(instinct.id)}`);
          defaultRuntime.log(`  Trigger: ${instinct.trigger}`);
          defaultRuntime.log(`  Confidence: ${(instinct.confidence * 100).toFixed(0)}%`);

          const synthesized = engine.synthesizeSkill(instinct);

          if (options.saveSkill) {
            const targetDir = path.join(process.cwd(), "skills", synthesized.skillName);
            if (!fs.existsSync(targetDir)) {
              fs.mkdirSync(targetDir, { recursive: true });
            }
            const filePath = path.join(targetDir, synthesized.fileName);
            fs.writeFileSync(filePath, synthesized.content, "utf-8");
            defaultRuntime.log(
              `  ${theme.success("✓ Skill exported per agentskills.io standard:")} ${theme.bold(filePath)}\n`,
            );
          } else {
            defaultRuntime.log(`  Skill Name: ${synthesized.skillName} (Pass --save-skill to write SKILL.md)\n`);
          }
        } catch (err) {
          defaultRuntime.error(`Failed to record instinct: ${String(err)}`);
        }
      },
    );

  const instinctCmd = program
    .command("instincts")
    .alias("instinct")
    .description("Inspect and manage learned autonomous instincts");

  instinctCmd
    .command("list")
    .description("List all recorded instincts and confidence metrics")
    .action(() => {
      try {
        const engine = new LearningEngine();
        const instincts = engine.getInstincts();

        if (instincts.length === 0) {
          defaultRuntime.log(theme.muted("No instincts recorded yet. Train one with 'agdi learn <trigger>'."));
          return;
        }

        defaultRuntime.log(`\n${theme.bold("Active Autonomous Instincts:")} (${instincts.length})\n`);
        for (const inst of instincts) {
          const confidenceColor =
            inst.confidence >= 0.8
              ? theme.success(`${(inst.confidence * 100).toFixed(0)}%`)
              : inst.confidence >= 0.5
                ? theme.warn(`${(inst.confidence * 100).toFixed(0)}%`)
                : theme.error(`${(inst.confidence * 100).toFixed(0)}%`);

          defaultRuntime.log(`  ${theme.bold(inst.id)} [${confidenceColor}] - "${inst.trigger}"`);
          defaultRuntime.log(`    Pattern: ${inst.pattern}`);
          defaultRuntime.log(`    Action: ${theme.muted(inst.action)}`);
          defaultRuntime.log(`    History: ${inst.successes} successes, ${inst.failures} failures | Scope: ${inst.scope}`);
          if (inst.tags.length) {
            defaultRuntime.log(`    Tags: [${inst.tags.join(", ")}]`);
          }
        }
        defaultRuntime.log("");
      } catch (err) {
        defaultRuntime.error(`Failed to list instincts: ${String(err)}`);
      }
    });

  instinctCmd
    .command("export <id>")
    .description("Synthesize and view an agentskills.io SKILL.md from an instinct")
    .action((id: string) => {
      try {
        const engine = new LearningEngine();
        const instinct = engine.getInstincts().find((i) => i.id === id);

        if (!instinct) {
          defaultRuntime.error(`Instinct with ID '${id}' not found.`);
          return;
        }

        const skill = engine.synthesizeSkill(instinct);
        defaultRuntime.log(`\n${theme.bold(`--- Synthesized Skill: ${skill.skillName} ---`)}\n`);
        defaultRuntime.log(skill.content);
        defaultRuntime.log("");
      } catch (err) {
        defaultRuntime.error(`Failed to export skill: ${String(err)}`);
      }
    });
}
