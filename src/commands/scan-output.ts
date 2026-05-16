import chalk from 'chalk';
import type { ScanSummary } from './scan-types.js';

export function formatConsole(summary: ScanSummary): string {
	// Header
	let output = '\n' + chalk.bold('Agdi Debugging Scan') + '\n';
	output += chalk.gray(`Started: ${summary.timestamp}`) + '\n\n';

	// Results
	for (const result of summary.results) {
		const icon =
			result.severity === 'pass'
				? chalk.green('✓')
				: result.severity === 'warning'
					? chalk.yellow('⚠')
					: chalk.red('✗');

		output += `${icon} ${result.check}: ${result.message}\n`;

		if (result.repairCommand) {
			output += chalk.gray(`  → Run: ${result.repairCommand}\n`);
		}
	}

	// Summary
	output += '\n' + '─'.repeat(60) + '\n';
	output += `Summary: ${chalk.green(summary.passed + ' passed')}`;
	if (summary.warnings > 0) {
		output += `, ${chalk.yellow(summary.warnings + ' warnings')}`;
	}
	if (summary.critical > 0) {
		output += `, ${chalk.red(summary.critical + ' critical')}`;
	}
	output += `\nDuration: ${(summary.duration / 1000).toFixed(1)}s\n`;

	return output;
}

export function formatJSON(summary: ScanSummary): string {
	return JSON.stringify(summary, null, 2);
}
