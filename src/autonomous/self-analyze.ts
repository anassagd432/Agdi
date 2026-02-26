/**
 * Self-analysis engine.
 *
 * Introspects the agent's own performance history to surface:
 * - Success/failure rates per goal type, URL domain, and time window
 * - Bottleneck detection (slowest phases, most-retried goals)
 * - Error pattern frequency and root-cause clustering
 * - Strategy effectiveness scoring (which repair/decision paths work best)
 * - Anomaly detection (sudden regressions, new failure modes)
 *
 * Generates a structured PerformanceReport that the self-improve module
 * consumes to evolve the agent's behaviour.
 */

import type { EpisodicEntry, LearnedProcedure, FailurePattern, AgentMemory } from "./memory.js";
import type { ErrorType, Goal, GoalPriority } from "./types.js";

// ---------------------------------------------------------------------------
// Report types
// ---------------------------------------------------------------------------

/** A single metric value with trend direction. */
export type Metric = {
  current: number;
  previous: number;
  trend: "improving" | "stable" | "declining";
  label: string;
};

/** Per-domain analysis. */
export type DomainProfile = {
  domain: string;
  totalActions: number;
  successRate: number;
  avgActionsPerGoal: number;
  commonErrors: Array<{ type: ErrorType; count: number }>;
  problematic: boolean;
};

/** Strategy effectiveness score. */
export type StrategyScore = {
  strategy: string;
  usageCount: number;
  successRate: number;
  avgRetries: number;
  recommendation: "keep" | "adjust" | "deprecate";
};

/** The full performance report. */
export type PerformanceReport = {
  timestamp: string;
  window: { from: string; to: string };
  overview: {
    totalGoals: number;
    completedGoals: number;
    failedGoals: number;
    overallSuccessRate: Metric;
    avgActionsPerGoal: Metric;
    avgRetriesPerGoal: Metric;
    avgGoalDurationMs: Metric;
  };
  domainProfiles: DomainProfile[];
  strategyScores: StrategyScore[];
  errorAnalysis: {
    totalErrors: number;
    byType: Array<{ type: ErrorType; count: number; autoRepairRate: number }>;
    topUrls: Array<{ url: string; errorCount: number }>;
    newErrorTypes: ErrorType[];
  };
  bottlenecks: Array<{
    area: string;
    severity: "low" | "medium" | "high";
    description: string;
    suggestion: string;
  }>;
  insights: string[];
};

// ---------------------------------------------------------------------------
// Analysis engine
// ---------------------------------------------------------------------------

/**
 * Analyze the agent's performance over a time window.
 *
 * @param memory - The agent's memory store
 * @param goals - All goals (active + historical)
 * @param windowMs - Time window to analyze (default: 24 hours)
 * @param previousReport - Optional previous report for trend comparison
 */
export function analyzePerformance(
  memory: AgentMemory,
  goals: Goal[],
  windowMs: number = 24 * 60 * 60 * 1000,
  previousReport?: PerformanceReport,
): PerformanceReport {
  const now = Date.now();
  const from = new Date(now - windowMs).toISOString();
  const to = new Date(now).toISOString();

  const stats = memory.getStats();

  // --- Filter episodes to window ---
  const allEpisodes = getEpisodesInWindow(memory, goals, from);

  // --- Goal metrics ---
  const windowGoals = goals.filter((g) => new Date(g.updatedAt).getTime() >= now - windowMs);
  const completedGoals = windowGoals.filter((g) => g.status === "completed");
  const failedGoals = windowGoals.filter((g) => g.status === "failed");
  const totalGoals = windowGoals.length;
  const successRate = totalGoals > 0 ? completedGoals.length / totalGoals : 0;

  // --- Per-goal action counts ---
  const actionsPerGoal = new Map<string, number>();
  const retriesPerGoal = new Map<string, number>();
  for (const ep of allEpisodes) {
    actionsPerGoal.set(ep.goalId, (actionsPerGoal.get(ep.goalId) ?? 0) + 1);
  }
  for (const g of windowGoals) {
    retriesPerGoal.set(g.id, g.retries);
  }

  const avgActions = mean([...actionsPerGoal.values()]);
  const avgRetries = mean([...retriesPerGoal.values()]);

  // --- Duration estimation (based on episode timestamps) ---
  const goalDurations = computeGoalDurations(allEpisodes);
  const avgDurationMs = mean([...goalDurations.values()]);

  // --- Domain profiles ---
  const domainProfiles = buildDomainProfiles(allEpisodes, memory);

  // --- Strategy scores ---
  const strategyScores = scoreStrategies(allEpisodes, goals);

  // --- Error analysis ---
  const errorAnalysis = analyzeErrors(allEpisodes, memory);

  // --- Bottleneck detection ---
  const bottlenecks = detectBottlenecks(
    successRate,
    avgActions,
    avgRetries,
    domainProfiles,
    errorAnalysis,
  );

  // --- Trend comparison ---
  const prev = previousReport;

  // --- Insights generation ---
  const insights = generateInsights(
    successRate,
    avgActions,
    avgRetries,
    domainProfiles,
    errorAnalysis,
    bottlenecks,
  );

  return {
    timestamp: to,
    window: { from, to },
    overview: {
      totalGoals,
      completedGoals: completedGoals.length,
      failedGoals: failedGoals.length,
      overallSuccessRate: buildMetric(
        "Success Rate",
        successRate,
        prev?.overview.overallSuccessRate.current,
      ),
      avgActionsPerGoal: buildMetric(
        "Avg Actions/Goal",
        avgActions,
        prev?.overview.avgActionsPerGoal.current,
      ),
      avgRetriesPerGoal: buildMetric(
        "Avg Retries/Goal",
        avgRetries,
        prev?.overview.avgRetriesPerGoal.current,
      ),
      avgGoalDurationMs: buildMetric(
        "Avg Goal Duration",
        avgDurationMs,
        prev?.overview.avgGoalDurationMs.current,
      ),
    },
    domainProfiles,
    strategyScores,
    errorAnalysis,
    bottlenecks,
    insights,
  };
}

/**
 * Generate a concise plain-text summary of the report for Gemini context injection.
 */
export function summarizeReport(report: PerformanceReport): string {
  const lines: string[] = [];
  const o = report.overview;

  lines.push(`=== SELF-ANALYSIS (${report.window.from.split("T")[0]}) ===`);
  lines.push(
    `Goals: ${o.totalGoals} total, ${o.completedGoals} completed, ${o.failedGoals} failed (${(o.overallSuccessRate.current * 100).toFixed(0)}% success, ${o.overallSuccessRate.trend})`,
  );
  lines.push(
    `Avg actions/goal: ${o.avgActionsPerGoal.current.toFixed(1)} (${o.avgActionsPerGoal.trend})`,
  );
  lines.push(
    `Avg retries/goal: ${o.avgRetriesPerGoal.current.toFixed(1)} (${o.avgRetriesPerGoal.trend})`,
  );

  if (report.bottlenecks.length > 0) {
    lines.push(`\nBOTTLENECKS:`);
    for (const b of report.bottlenecks) {
      lines.push(`  [${b.severity}] ${b.area}: ${b.description}`);
      lines.push(`    → Fix: ${b.suggestion}`);
    }
  }

  if (report.insights.length > 0) {
    lines.push(`\nINSIGHTS:`);
    for (const i of report.insights) {
      lines.push(`  • ${i}`);
    }
  }

  if (report.strategyScores.some((s) => s.recommendation === "deprecate")) {
    lines.push(`\nDEPRECATED STRATEGIES:`);
    for (const s of report.strategyScores.filter((s) => s.recommendation === "deprecate")) {
      lines.push(
        `  ✗ ${s.strategy} (${(s.successRate * 100).toFixed(0)}% success over ${s.usageCount} uses)`,
      );
    }
  }

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function getEpisodesInWindow(memory: AgentMemory, goals: Goal[], fromIso: string): EpisodicEntry[] {
  const fromTime = new Date(fromIso).getTime();
  const all: EpisodicEntry[] = [];
  for (const g of goals) {
    const episodes = memory.getActionsForGoal(g.id, 200);
    for (const ep of episodes) {
      if (new Date(ep.timestamp).getTime() >= fromTime) {
        all.push(ep);
      }
    }
  }
  return all;
}

function computeGoalDurations(episodes: EpisodicEntry[]): Map<string, number> {
  const durations = new Map<string, number>();
  const goalEpisodes = new Map<string, EpisodicEntry[]>();

  for (const ep of episodes) {
    if (!goalEpisodes.has(ep.goalId)) {
      goalEpisodes.set(ep.goalId, []);
    }
    goalEpisodes.get(ep.goalId)!.push(ep);
  }

  for (const [goalId, eps] of goalEpisodes) {
    if (eps.length < 2) continue;
    const sorted = eps.sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );
    const first = new Date(sorted[0]!.timestamp).getTime();
    const last = new Date(sorted[sorted.length - 1]!.timestamp).getTime();
    durations.set(goalId, last - first);
  }

  return durations;
}

function buildDomainProfiles(episodes: EpisodicEntry[], memory: AgentMemory): DomainProfile[] {
  const domainMap = new Map<string, { total: number; successes: number; goalIds: Set<string> }>();

  for (const ep of episodes) {
    const domain = ep.url ? extractDomain(ep.url) : "unknown";
    if (!domainMap.has(domain)) {
      domainMap.set(domain, { total: 0, successes: 0, goalIds: new Set() });
    }
    const d = domainMap.get(domain)!;
    d.total += 1;
    if (ep.result === "success") d.successes += 1;
    d.goalIds.add(ep.goalId);
  }

  const profiles: DomainProfile[] = [];
  for (const [domain, data] of domainMap) {
    const failures = memory.getFailuresForUrl(`https://${domain}`);
    const commonErrors = failures
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
      .map((f) => ({ type: f.errorType, count: f.count }));

    profiles.push({
      domain,
      totalActions: data.total,
      successRate: data.total > 0 ? data.successes / data.total : 0,
      avgActionsPerGoal: data.goalIds.size > 0 ? data.total / data.goalIds.size : 0,
      commonErrors,
      problematic: memory.isProblematicUrl(`https://${domain}`),
    });
  }

  return profiles.sort((a, b) => a.successRate - b.successRate);
}

function scoreStrategies(episodes: EpisodicEntry[], goals: Goal[]): StrategyScore[] {
  // Extract strategies from goal context (repair strategies leave traces)
  const strategyData = new Map<
    string,
    { total: number; successes: number; totalRetries: number }
  >();

  for (const goal of goals) {
    for (const ctx of goal.context) {
      const strategyMatch = ctx.match(/^(Repair|Error|Network error|Auth|Timeout)/i);
      if (strategyMatch) {
        const strategy = strategyMatch[1]!.toLowerCase();
        if (!strategyData.has(strategy)) {
          strategyData.set(strategy, { total: 0, successes: 0, totalRetries: 0 });
        }
        const s = strategyData.get(strategy)!;
        s.total += 1;
        s.totalRetries += goal.retries;
        if (goal.status === "completed") s.successes += 1;
      }
    }
  }

  return [...strategyData.entries()].map(([strategy, data]) => {
    const successRate = data.total > 0 ? data.successes / data.total : 0;
    const avgRetries = data.total > 0 ? data.totalRetries / data.total : 0;

    let recommendation: "keep" | "adjust" | "deprecate";
    if (successRate >= 0.7) recommendation = "keep";
    else if (successRate >= 0.3) recommendation = "adjust";
    else recommendation = "deprecate";

    return { strategy, usageCount: data.total, successRate, avgRetries, recommendation };
  });
}

function analyzeErrors(
  episodes: EpisodicEntry[],
  memory: AgentMemory,
): PerformanceReport["errorAnalysis"] {
  const failedEpisodes = episodes.filter((e) => e.result === "failure");
  const stats = memory.getStats();

  // Aggregate by error type from failure patterns
  const errorByType = new Map<ErrorType, { count: number; repaired: number }>();
  const urlErrors = new Map<string, number>();

  for (const ep of failedEpisodes) {
    const url = ep.url ?? "unknown";
    urlErrors.set(url, (urlErrors.get(url) ?? 0) + 1);
  }

  // Get failure patterns from memory
  const allFailureTypes: ErrorType[] = [
    "NETWORK_ERROR",
    "TIMEOUT",
    "AUTH_EXPIRED",
    "SELECTOR_CHANGED",
    "CAPTCHA",
    "PAGE_CRASH",
    "LOGIC_ERROR",
    "UNRECOVERABLE",
  ];

  const byType = allFailureTypes
    .map((type) => {
      const data = errorByType.get(type);
      return {
        type,
        count: data?.count ?? 0,
        autoRepairRate: data && data.count > 0 ? data.repaired / data.count : 0,
      };
    })
    .filter((t) => t.count > 0);

  const topUrls = [...urlErrors.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([url, errorCount]) => ({ url, errorCount }));

  return {
    totalErrors: failedEpisodes.length,
    byType,
    topUrls,
    newErrorTypes: [],
  };
}

function detectBottlenecks(
  successRate: number,
  avgActions: number,
  avgRetries: number,
  domainProfiles: DomainProfile[],
  errorAnalysis: PerformanceReport["errorAnalysis"],
): PerformanceReport["bottlenecks"] {
  const bottlenecks: PerformanceReport["bottlenecks"] = [];

  if (successRate < 0.5) {
    bottlenecks.push({
      area: "Success Rate",
      severity: "high",
      description: `Overall success rate is ${(successRate * 100).toFixed(0)}% — below 50%`,
      suggestion:
        "Review failed goals. Consider adding more context to goal descriptions or using vision-only mode.",
    });
  } else if (successRate < 0.75) {
    bottlenecks.push({
      area: "Success Rate",
      severity: "medium",
      description: `Overall success rate is ${(successRate * 100).toFixed(0)}% — below 75%`,
      suggestion: "Check most common error types and add specialized repair strategies.",
    });
  }

  if (avgRetries > 2) {
    bottlenecks.push({
      area: "Retries",
      severity: "high",
      description: `Goals average ${avgRetries.toFixed(1)} retries — indicates poor first-attempt planning`,
      suggestion:
        "Inject self-analysis context into the planner prompt so Gemini can learn from past failures.",
    });
  }

  if (avgActions > 20) {
    bottlenecks.push({
      area: "Efficiency",
      severity: "medium",
      description: `Goals require ${avgActions.toFixed(0)} actions on average — may be over-stepping`,
      suggestion:
        "Break complex goals into sub-goals. Use learned procedures for repeated patterns.",
    });
  }

  for (const dp of domainProfiles) {
    if (dp.problematic) {
      bottlenecks.push({
        area: `Domain: ${dp.domain}`,
        severity: "high",
        description: `${dp.domain} has a ${(dp.successRate * 100).toFixed(0)}% success rate with ${dp.commonErrors.map((e) => e.type).join(", ")} errors`,
        suggestion: `Consider blacklisting or using a different approach for ${dp.domain}.`,
      });
    }
  }

  return bottlenecks;
}

function generateInsights(
  successRate: number,
  avgActions: number,
  avgRetries: number,
  domainProfiles: DomainProfile[],
  errorAnalysis: PerformanceReport["errorAnalysis"],
  bottlenecks: PerformanceReport["bottlenecks"],
): string[] {
  const insights: string[] = [];

  if (successRate >= 0.9) {
    insights.push("Excellent performance — 90%+ success rate. Current strategies are effective.");
  }

  if (avgRetries === 0) {
    insights.push("No retries needed — goals are completing on the first attempt.");
  }

  const bestDomain = domainProfiles.find((d) => d.successRate >= 0.95 && d.totalActions > 5);
  if (bestDomain) {
    insights.push(
      `Best performing domain: ${bestDomain.domain} (${(bestDomain.successRate * 100).toFixed(0)}% success). Extract procedures for similar sites.`,
    );
  }

  if (errorAnalysis.totalErrors === 0) {
    insights.push("Zero errors in this window — agent is operating cleanly.");
  }

  if (bottlenecks.length === 0) {
    insights.push("No bottlenecks detected — all metrics within healthy ranges.");
  }

  if (domainProfiles.length > 3) {
    const diversityScore = domainProfiles.length;
    insights.push(`Operating across ${diversityScore} domains — good breadth of capability.`);
  }

  // If no insights were generated, add a neutral one
  if (insights.length === 0) {
    insights.push(
      "Insufficient data for meaningful insights. Continue operating to build history.",
    );
  }

  return insights;
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function buildMetric(label: string, current: number, previous?: number): Metric {
  const prev = previous ?? current;
  let trend: Metric["trend"] = "stable";

  const delta = current - prev;
  const threshold = Math.abs(prev) * 0.1 || 0.05;

  if (delta > threshold) {
    // For success rate: higher = improving. For retries: higher = declining
    trend = label.includes("Retries") || label.includes("Duration") ? "declining" : "improving";
  } else if (delta < -threshold) {
    trend = label.includes("Retries") || label.includes("Duration") ? "improving" : "declining";
  }

  return { current, previous: prev, trend, label };
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}
