/**
 * Autonomous Agent CLI — `agdi autonomous <subcommand>`
 *
 * Lightweight operational commands for the gateway-integrated autonomous agent.
 * The autonomous agent starts/stops automatically with the gateway when
 * `autonomous.enabled: true` is set in config.
 *
 * Subcommands:
 *   status      Show whether autonomous mode is active and current state
 *   goal add    Add a new goal to the queue
 *   goal list   List all active/pending goals
 *   goal cancel Cancel a specific goal by ID
 *   say         Send a message to the agent
 */

import type { Command } from "commander";

export function registerAutonomousCli(program: Command): void {
  const auto = program
    .command("autonomous")
    .alias("auto")
    .description("Autonomous browser agent — starts automatically with the gateway when enabled in config");

  // ---------------------------------------------------------------------------
  // status
  // ---------------------------------------------------------------------------

  auto
    .command("status")
    .description("Show whether autonomous mode is active and current agent state")
    .option("--json", "Output as JSON")
    .action(async (opts) => {
      const { isAutonomousActive } = await import("../autonomous/autonomous-gateway-hook.js");

      if (!isAutonomousActive()) {
        if (opts.json) {
          console.log(JSON.stringify({ active: false }, null, 2));
        } else {
          console.log("😴 Autonomous mode is not active.");
          console.log("");
          console.log("   To enable, set in your config:");
          console.log("   { autonomous: { enabled: true } }");
          console.log("");
          console.log("   Or start the gateway with:");
          console.log("   agdi gateway --autonomous");
        }
        return;
      }

      const { getDaemon } = await import("../autonomous/index.js");
      const daemon = getDaemon();
      if (!daemon) {
        console.log("⚠️  Autonomous mode is flagged active but daemon is not running.");
        return;
      }

      const agent = daemon.getAgent()!;
      const state = agent.currentState;
      const goal = agent.activeGoal;
      const goals = agent.goals;

      if (opts.json) {
        console.log(JSON.stringify({
          active: true,
          state,
          activeGoal: goal,
          activeCount: goals.activeCount,
          totalCount: goals.totalCount,
        }, null, 2));
        return;
      }

      const stateIcons: Record<string, string> = {
        idle: "😴", planning: "🧠", executing: "⚡", observing: "👁️", repairing: "🔧",
      };

      console.log(`🤖 Autonomous mode: ACTIVE`);
      console.log(`${stateIcons[state] ?? "❓"} Agent: ${state.toUpperCase()}`);
      if (goal) {
        console.log(`  📋 Current: ${goal.description}`);
        console.log(`  🔄 Retries: ${goal.retries}/${goal.maxRetries}`);
      }
      console.log(`  📊 Queue: ${goals.activeCount} active, ${goals.totalCount} total`);
    });

  // ---------------------------------------------------------------------------
  // goal
  // ---------------------------------------------------------------------------

  const goal = auto.command("goal").description("Manage agent goals");

  goal
    .command("add")
    .description("Add a new goal to the agent's queue")
    .argument("<description...>", "Goal description (can be multiple words)")
    .option("-p, --priority <priority>", "Priority: critical, high, normal, low", "normal")
    .action(async (descriptionParts: string[], opts) => {
      const { getDaemon } = await import("../autonomous/index.js");
      const daemon = getDaemon();
      if (!daemon) {
        console.log("⚠️  Autonomous mode is not active. Enable it in config or with `--autonomous`.");
        return;
      }
      const description = descriptionParts.join(" ");
      const agent = daemon.getAgent()!;
      const newGoal = agent.goals.add({
        description,
        priority: opts.priority,
      });
      console.log(`🎯 Goal added: "${description}"`);
      console.log(`   ID:       ${newGoal.id}`);
      console.log(`   Priority: ${opts.priority}`);
    });

  goal
    .command("list")
    .description("List all goals in the queue")
    .option("--all", "Include completed and failed goals")
    .option("--json", "Output as JSON")
    .action(async (opts) => {
      const { getDaemon } = await import("../autonomous/index.js");
      const daemon = getDaemon();
      if (!daemon) {
        console.log("⚠️  Autonomous mode is not active.");
        return;
      }
      const agent = daemon.getAgent()!;
      const all = agent.goals.list();
      const display = opts.all ? all : all.filter((g: any) =>
        g.status === "pending" || g.status === "in-progress" || g.status === "paused"
      );

      if (opts.json) {
        console.log(JSON.stringify(display, null, 2));
        return;
      }

      if (display.length === 0) {
        console.log("📭 No goals in queue.");
        return;
      }

      const statusIcons: Record<string, string> = {
        pending: "⏳", "in-progress": "⚡", completed: "✅", failed: "❌", paused: "⏸️",
      };

      for (const g of display) {
        console.log(`  ${statusIcons[g.status] ?? "❓"} [${g.priority}] ${g.description}`);
        console.log(`     ID: ${g.id} | Status: ${g.status} | Retries: ${g.retries}/${g.maxRetries}`);
      }
    });

  goal
    .command("cancel")
    .description("Cancel a goal by ID")
    .argument("<id>", "Goal ID to cancel")
    .action(async (id: string) => {
      const { getDaemon } = await import("../autonomous/index.js");
      const daemon = getDaemon();
      if (!daemon) {
        console.log("⚠️  Autonomous mode is not active.");
        return;
      }
      const agent = daemon.getAgent()!;
      agent.goals.fail(id, "Cancelled by user");
      console.log(`🚫 Goal ${id} cancelled.`);
    });

  // ---------------------------------------------------------------------------
  // say — send a message to the agent
  // ---------------------------------------------------------------------------

  auto
    .command("say")
    .description("Send a message to the running agent")
    .argument("<message...>", "Message to send")
    .option("-p, --priority <priority>", "Priority: CRITICAL, HIGH, NORMAL, LOW", "NORMAL")
    .action(async (messageParts: string[], opts) => {
      const { getDaemon } = await import("../autonomous/index.js");
      const daemon = getDaemon();
      if (!daemon) {
        console.log("⚠️  Autonomous mode is not active.");
        return;
      }
      const agent = daemon.getAgent()!;
      const content = messageParts.join(" ");
      agent.messages.enqueue(content, opts.priority);
      console.log(`💬 Message sent: "${content}" [${opts.priority}]`);
    });
}
