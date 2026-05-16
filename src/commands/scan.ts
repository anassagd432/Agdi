import { Command } from 'commander';
import type { ScanResult, ScanSummary } from './scan-types.js';
import { formatConsole, formatJSON } from './scan-output.js';
import { loadConfig } from '../config/config.js';
import { callGateway } from '../gateway/call.js';
import type { HealthSummary } from './health.js';
import { defaultRuntime } from '../runtime.js';

async function runCheck(name: string, fn: () => Promise<ScanResult>): Promise<ScanResult> {
	const start = Date.now();
	try {
		const result = await fn();
		return { ...result, duration: Date.now() - start };
	} catch (error) {
		return {
			check: name,
			severity: 'critical',
			message: `Check failed: ${error instanceof Error ? error.message : String(error)}`,
			duration: Date.now() - start,
		};
	}
}

// Individual check functions
async function checkGatewayRunning(): Promise<ScanResult> {
	try {
		// Try to call the gateway health endpoint to see if it's running
		const cfg = await loadConfig();
		await callGateway<HealthSummary>({
			method: 'health',
			params: undefined,
			timeoutMs: 5000,
			config: cfg,
		});

		return {
			check: 'Gateway Running',
			severity: 'pass',
			message: 'Gateway service is running',
			duration: 0,
		};
	} catch (error) {
		return {
			check: 'Gateway Running',
			severity: 'critical',
			message: 'Gateway service is not running',
			duration: 0,
			repairCommand: 'agdi gateway start',
		};
	}
}

async function checkGatewayRPC(): Promise<ScanResult> {
	try {
		const cfg = await loadConfig();
		const health = await callGateway<HealthSummary>({
			method: 'health',
			params: undefined,
			timeoutMs: 5000,
			config: cfg,
		});

		if (health.ok) {
			return {
				check: 'Gateway RPC',
				severity: 'pass',
				message: 'Gateway RPC is responding',
				duration: 0,
			};
		}

		return {
			check: 'Gateway RPC',
			severity: 'warning',
			message: 'Gateway RPC not reachable',
			duration: 0,
			repairCommand: 'agdi gateway probe',
		};
	} catch {
		return {
			check: 'Gateway RPC',
			severity: 'warning',
			message: 'Gateway RPC not reachable',
			duration: 0,
			repairCommand: 'agdi gateway probe',
		};
	}
}

async function checkConfigValid(): Promise<ScanResult> {
	try {
		// This will throw if config is invalid
		await loadConfig();
		return {
			check: 'Configuration',
			severity: 'pass',
			message: 'Config loads successfully',
			duration: 0,
		};
	} catch (error) {
		return {
			check: 'Configuration',
			severity: 'critical',
			message: `Config validation failed: ${error instanceof Error ? error.message : String(error)}`,
			duration: 0,
			repairCommand: 'agdi doctor config-preflight',
		};
	}
}

async function checkChannels(): Promise<ScanResult> {
	try {
		const cfg = await loadConfig();
		const health = await callGateway<HealthSummary>({
			method: 'health',
			params: undefined,
			timeoutMs: 5000,
			config: cfg,
		});

		const channelCount = health.channelOrder?.length || 0;

		if (channelCount === 0) {
			return {
				check: 'Channels',
				severity: 'warning',
				message: 'No channels configured',
				duration: 0,
			};
		}

		return {
			check: 'Channels',
			severity: 'pass',
			message: `${channelCount} channel(s) configured`,
			duration: 0,
		};
	} catch {
		return {
			check: 'Channels',
			severity: 'warning',
			message: 'Could not check channel status',
			duration: 0,
		};
	}
}

async function checkAuth(): Promise<ScanResult> {
	try {
		const cfg = await loadConfig();

		// Basic check: if gateway auth is configured
		if (cfg.gateway?.auth?.token || cfg.gateway?.auth?.password) {
			return {
				check: 'Authentication',
				severity: 'pass',
				message: 'Gateway auth is configured',
				duration: 0,
			};
		}

		return {
			check: 'Authentication',
			severity: 'pass',
			message: 'No gateway auth configured (optional)',
			duration: 0,
		};
	} catch {
		return {
			check: 'Authentication',
			severity: 'warning',
			message: 'Auth validation issues detected',
			duration: 0,
			repairCommand: 'agdi doctor auth',
		};
	}
}

// Main scan function
export async function runScan(): Promise<ScanSummary> {
	const startTime = Date.now();
	const timestamp = new Date().toISOString();

	// Run all checks in sequence (can parallelize later)
	const results: ScanResult[] = [];

	results.push(await runCheck('Gateway Running', checkGatewayRunning));
	results.push(await runCheck('Gateway RPC', checkGatewayRPC));
	results.push(await runCheck('Configuration', checkConfigValid));
	results.push(await runCheck('Channels', checkChannels));
	results.push(await runCheck('Authentication', checkAuth));

	// Calculate summary
	const passed = results.filter((r) => r.severity === 'pass').length;
	const warnings = results.filter((r) => r.severity === 'warning').length;
	const critical = results.filter((r) => r.severity === 'critical').length;

	return {
		totalChecks: results.length,
		passed,
		warnings,
		critical,
		duration: Date.now() - startTime,
		timestamp,
		results,
	};
}

// Command definition
export const scanCommand = new Command('scan')
	.description('Run comprehensive diagnostic checks')
	.option('--json', 'Output in JSON format')
	.action(async (options) => {
		const summary = await runScan();

		if (options.json) {
			console.log(formatJSON(summary));
		} else {
			console.log(formatConsole(summary));
		}

		// Exit codes for CI/CD
		if (summary.critical > 0) {
			process.exit(2); // Critical issues
		} else if (summary.warnings > 0) {
			process.exit(1); // Warnings only
		} else {
			process.exit(0); // All good
		}
	});
