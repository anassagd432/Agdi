import type { Command } from "commander";
import { configureCommandFromSectionsArg } from "../../commands/configure.js";
import { defaultRuntime } from "../../runtime.js";
import { formatDocsLink } from "../../terminal/links.js";
import { theme } from "../../terminal/theme.js";
import { runTui } from "../../tui/tui.js";
import { runCommandWithRuntime } from "../cli-utils.js";
import { parseTimeoutMs } from "../parse-timeout.js";

export function registerWorkspaceCommands(program: Command) {
  program
    .command("connect")
    .description("Connect chat apps and integrations")
    .addHelpText(
      "after",
      () =>
        `\n${theme.muted("Docs:")} ${formatDocsLink("/cli/configure", "docs.agdi.ai/cli/configure")}\n`,
    )
    .action(async () => {
      await runCommandWithRuntime(defaultRuntime, async () => {
        await configureCommandFromSectionsArg(["channels"], defaultRuntime);
      });
    });

  program
    .command("chat")
    .description("Open the agent workspace in the terminal")
    .option("--url <url>", "Runtime WebSocket URL (defaults to gateway.remote.url when configured)")
    .option("--token <token>", "Runtime token (if required)")
    .option("--password <password>", "Runtime password (if required)")
    .option("--session <key>", 'Session key (default: "main", or "global" when scope is global)')
    .option("--deliver", "Deliver assistant replies", false)
    .option("--thinking <level>", "Thinking level override")
    .option("--message <text>", "Send an initial message after connecting")
    .option("--timeout-ms <ms>", "Agent timeout in ms (defaults to agents.defaults.timeoutSeconds)")
    .option("--history-limit <n>", "History entries to load", "200")
    .addHelpText(
      "after",
      () => `\n${theme.muted("Docs:")} ${formatDocsLink("/cli/tui", "docs.agdi.ai/cli/tui")}\n`,
    )
    .action(async (opts) => {
      try {
        const timeoutMs = parseTimeoutMs(opts.timeoutMs);
        if (opts.timeoutMs !== undefined && timeoutMs === undefined) {
          defaultRuntime.error(
            `warning: invalid --timeout-ms "${String(opts.timeoutMs)}"; ignoring`,
          );
        }
        const historyLimit = Number.parseInt(String(opts.historyLimit ?? "200"), 10);
        await runTui({
          url: opts.url as string | undefined,
          token: opts.token as string | undefined,
          password: opts.password as string | undefined,
          session: opts.session as string | undefined,
          deliver: Boolean(opts.deliver),
          thinking: opts.thinking as string | undefined,
          message: opts.message as string | undefined,
          timeoutMs,
          historyLimit: Number.isNaN(historyLimit) ? undefined : historyLimit,
        });
      } catch (err) {
        defaultRuntime.error(String(err));
        defaultRuntime.exit(1);
      }
    });

  program
    .command("automate")
    .description("Create and inspect scheduled automations")
    .addHelpText(
      "after",
      () => `\n${theme.muted("Docs:")} ${formatDocsLink("/cli/cron", "docs.agdi.ai/cli/cron")}\n`,
    )
    .action(() => {
      defaultRuntime.writeStdout("Automation commands:");
      defaultRuntime.writeStdout(`  ${theme.command("agdi cron add --help")}    create a schedule`);
      defaultRuntime.writeStdout(`  ${theme.command("agdi cron list")}          list schedules`);
      defaultRuntime.writeStdout(
        `  ${theme.command("agdi hooks --help")}       manage agent hooks`,
      );
    });
}
