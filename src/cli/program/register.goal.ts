import type { Command } from "commander";
import { GoalEngine } from "../../goals/engine.js";

export function registerGoalCommands(program: Command): void {
  const goalCmd = program
    .command("goal")
    .description("Autonomous goal engine: define, track, and execute objectives until completion");

  goalCmd
    .command("create <title>")
    .description("Create a new autonomous goal")
    .option("-d, --description <desc>", "Goal description", "")
    .action(async (title: string, opts: { description: string }) => {
      const engine = new GoalEngine();
      const goal = await engine.getStore().createGoal(title, opts.description);
      console.log(`[Agdi Goal] Created goal: ${goal.id}`);
      console.log(`  Title: ${goal.title}`);
      console.log(`  Status: ${goal.status}`);
    });

  goalCmd
    .command("list")
    .description("List all active and completed goals")
    .action(async () => {
      const engine = new GoalEngine();
      const goals = await engine.getStore().listGoals();
      if (goals.length === 0) {
        console.log("No goals found. Create one with `agdi goal create <title>`.");
        return;
      }
      console.log("Agdi Goals:");
      for (const g of goals) {
        console.log(`- [${g.status.toUpperCase()}] ${g.title} (${g.progressPercent}%) - ID: ${g.id}`);
      }
    });

  goalCmd
    .command("add-task <goalId> <taskTitle>")
    .description("Add a task/step to an existing goal")
    .option("-c, --command <cmd>", "Shell command to execute for this task")
    .action(async (goalId: string, taskTitle: string, opts: { command?: string }) => {
      const engine = new GoalEngine();
      const task = await engine.getStore().addTask(goalId, taskTitle, opts.command);
      if (!task) {
        console.error(`Goal ${goalId} not found.`);
        process.exitCode = 1;
        return;
      }
      console.log(`[Agdi Goal] Added task ${task.id} to goal ${goalId}: "${taskTitle}"`);
    });

  goalCmd
    .command("run <goalId>")
    .description("Execute all pending tasks for a goal until finished")
    .action(async (goalId: string) => {
      const engine = new GoalEngine();
      engine.onEvent((event, data) => {
        if (event === "task_started") {
          console.log(`  ⏳ Starting: ${data.title}`);
        } else if (event === "task_completed") {
          console.log(`  ✓ Completed task ${data.taskId}`);
        } else if (event === "task_failed") {
          console.log(`  ✖ Failed task ${data.taskId}: ${data.error}`);
        }
      });
      console.log(`[Agdi Goal] Executing goal ${goalId}...`);
      const finished = await engine.executeGoal(goalId);
      console.log(`[Agdi Goal] Finished with status: ${finished.status} (${finished.progressPercent}%)`);
    });
}
