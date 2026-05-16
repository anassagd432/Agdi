export type ScanSeverity = 'pass' | 'warning' | 'critical';

export interface ScanResult {
	check: string;
	severity: ScanSeverity;
	message: string;
	duration: number; // milliseconds
	repairCommand?: string;
}

export interface ScanSummary {
	totalChecks: number;
	passed: number;
	warnings: number;
	critical: number;
	duration: number;
	timestamp: string;
	results: ScanResult[];
}
