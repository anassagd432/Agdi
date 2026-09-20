import type { Command } from "commander";
import { GoalEngine, GoalStore, VerificationLedger } from "../goals/index.js";
import type { Goal, GoalTask } from "../goals/types.js";
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

export function registerGoalsCli(program: Command): void {
  const goalsCmd = program
    .command("goals")
    .alias("goal")
    .description("Autonomous goal planning, invariant verification, and execution");

  goalsCmd
    .command("list")
    .description("List all tracked goals and current progress")
    .action(async () => {
      try {
        const store = new GoalStore();
        const goals = await store.listGoals();

        if (goals.length === 0) {
          defaultRuntime.log(theme.muted("No goals currently tracked. Create one with 'agdi goal new <title>'."));
          return;
        }

        defaultRuntime.log(`\n${theme.bold("Tracked Goals:")} (${goals.length})\n`);
        for (const g of goals) {
          const statusColor =
            g.status === "completed"
              ? theme.success(g.status)
              : g.status === "failed"
                ? theme.error(g.status)
                : theme.warn(g.status);

          const criteria = g.validationCriteria?.length ? ` | verify: [${g.validationCriteria.join(", ")}]` : "";
          defaultRuntime.log(`  ${theme.bold(g.id)} - ${g.title} [${statusColor}] (${g.progressPercent}%)${criteria}`);
          for (const t of g.tasks) {
            const taskStatus = t.status === "completed" ? "✓" : t.status === "failed" ? "✗" : "○";
            defaultRuntime.log(`     ${taskStatus} ${t.title}${t.command ? ` (${theme.muted(t.command)})` : ""}`);
          }
        }
        defaultRuntime.log("");
      } catch (err) {
        defaultRuntime.error(`Failed to list goals: ${String(err)}`);
      }
    });

  goalsCmd
    .command("new <title>")
    .description("Create a new autonomous goal with optional invariant verification")
    .option("-d, --desc <description>", "Detailed description of the goal", "")
    .option("-v, --verify <criteria>", "Comma-separated verification criteria (e.g. test,typecheck,lint)", "")
    .option("-t, --tasks <tasks>", "Comma-separated list of initial tasks/commands", "")
    .action(async (title: string, options: { desc: string; verify: string; tasks: string }) => {
      try {
        const store = new GoalStore();
        const criteria = options.verify
          ? options.verify
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          : [];

        const initialTasks: GoalTask[] = options.tasks
          ? options.tasks
              .split(",")
              .map((t, idx) => ({
                id: `task-${idx + 1}`,
                title: t.trim(),
                command: t.trim(),
                status: "pending" as const,
                attempts: 0,
                maxAttempts: 3,
              }))
          : [];

        const goal: Goal = {
          id: `goal-${Date.now()}`,
          title,
          description: options.desc || title,
          status: "pending",
          progressPercent: 0,
          tasks: initialTasks,
          validationCriteria: criteria,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        store.recalculateProgress(goal);
        await store.saveGoal(goal);

        defaultRuntime.log(
          `\n${theme.success("✓ Goal created successfully:")} ${theme.bold(goal.id)} - ${goal.title}`,
        );
        if (criteria.length) {
          defaultRuntime.log(`  Validation criteria: [${criteria.join(", ")}]`);
        }
        if (initialTasks.length) {
          defaultRuntime.log(`  Tasks: ${initialTasks.length} queued`);
        }
        defaultRuntime.log(`\nRun execution with: ${theme.bold(`agdi goal run ${goal.id}`)}\n`);
      } catch (err) {
        defaultRuntime.error(`Failed to create goal: ${String(err)}`);
      }
    });

  goalsCmd
    .command("run [goalId]")
    .description("Execute an autonomous goal or resume all active goals")
    .action(async (goalId?: string) => {
      try {
        const engine = new GoalEngine();

        engine.onEvent((event, data) => {
          if (event === "goal_started") {
            defaultRuntime.log(`\n${theme.bold("▶ Starting Goal:")} ${data.title} (${data.goalId})`);
          } else if (event === "task_started") {
            defaultRuntime.log(`  • Running task: ${data.title}`);
          } else if (event === "task_completed") {
            defaultRuntime.log(`  ${theme.success("✓ Completed:")} ${data.taskId}`);
          } else if (event === "task_failed") {
            defaultRuntime.log(`  ${theme.error("✗ Failed:")} ${data.taskId} - ${data.error}`);
          } else if (event === "goal_verification_missing") {
            defaultRuntime.log(
              `  ${theme.warn("⚠ Invariants missing:")} [${(data.missingProofs as string[]).join(", ")}]`,
            );
          } else if (event === "goal_completed") {
            defaultRuntime.log(`\n${theme.success("✓ Goal Completed:")} ${data.title}\n`);
          }
        });

        if (goalId) {
          await engine.executeGoal(goalId);
        } else {
          const executed = await engine.resumeActiveGoals();
          defaultRuntime.log(`Resumed and completed ${executed.length} goal(s).`);
        }
      } catch (err) {
        defaultRuntime.error(`Execution error: ${String(err)}`);
      }
    });

  goalsCmd
    .command("verify <goalId>")
    .description("Check active invariant proofs against the verification ledger")
    .action(async (goalId: string) => {
      try {
        const store = new GoalStore();
        const ledger = new VerificationLedger();
        const goal = await store.getGoal(goalId);

        if (!goal) {
          defaultRuntime.error(`Goal ${goalId} not found.`);
          return;
        }

        const result = ledger.verifyGoalInvariants(goal);
        defaultRuntime.log(`\n${theme.bold("Verification Gate for Goal:")} ${goal.title} (${goalId})\n`);

        if (result.verified) {
          defaultRuntime.log(`  Status: ${theme.success("VERIFIED (All invariants satisfied)")}`);
          defaultRuntime.log(`  Passed Proofs: ${result.passedProofs.length}`);
          for (const p of result.passedProofs) {
            defaultRuntime.log(`    ✓ [${p.kind}] ${p.command} (exit 0) - hash: ${p.evidenceHash.slice(0, 16)}...`);
          }
        } else {
          defaultRuntime.log(`  Status: ${theme.warn("UNVERIFIED")}`);
          defaultRuntime.log(`  Missing Proofs: [${theme.error(result.missingProofs.join(", "))}]`);
        }
        defaultRuntime.log("");
      } catch (err) {
        defaultRuntime.error(`Verification error: ${String(err)}`);
      }
    });

  goalsCmd
    .command("proofs [goalId]")
    .description("Display recorded verifiable proof tokens from the ledger")
    .action((goalId?: string) => {
      try {
        const ledger = new VerificationLedger();
        const proofs = goalId ? ledger.getProofsForGoal(goalId) : ledger.getProofs();

        if (proofs.length === 0) {
          defaultRuntime.log(theme.muted("No verification proof tokens recorded yet."));
          return;
        }

        defaultRuntime.log(`\n${theme.bold("Verifiable Proof Tokens:")} (${proofs.length})\n`);
        for (const p of proofs) {
          const statusStr = p.status === "passed" ? theme.success("PASSED") : theme.error("FAILED");
          defaultRuntime.log(`  [${statusStr}] ${theme.bold(p.kind.toUpperCase())}: ${p.command}`);
          defaultRuntime.log(`    Scope: ${p.scope} | Exit: ${p.exitCode} | Time: ${new Date(p.timestamp).toLocaleTimeString()}`);
          defaultRuntime.log(`    Evidence SHA-256: ${theme.muted(p.evidenceHash)}`);
          if (p.metrics?.passedCount !== undefined || p.metrics?.failedCount !== undefined) {
            defaultRuntime.log(`    Metrics: ${p.metrics.passedCount ?? 0} passed, ${p.metrics.failedCount ?? 0} failed`);
          }
        }
        defaultRuntime.log("");
      } catch (err) {
        defaultRuntime.error(`Failed to retrieve proofs: ${String(err)}`);
      }
    });
}
