import chalk from "chalk";
import { formatErrorMessage } from "../infra/errors.js";

/**
 * Formats an error for CLI display with colors and actionable hints.
 */
export function formatError(error: unknown, context?: string): string {
    const msg = formatErrorMessage(error);

    // Classify by HTTP status or common error patterns
    if (msg.includes("429") || msg.includes("quota")) {
        return chalk.yellow("âš ï¸  Rate limit exceeded. Try: agdi model");
    }
    if (msg.includes("401") || msg.includes("403")) {
        return chalk.red("ðŸ”‘ Authentication failed. Run: agdi auth");
    }
    if (msg.includes("timeout")) {
        return chalk.red("â±ï¸  Request timed out. Retry or switch model.");
    }

    // Default with context
    return context
        ? chalk.red(`${context}: ${msg}`)
        : chalk.red(msg);
}
