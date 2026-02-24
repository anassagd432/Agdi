/**
 * Self-improvement engine.
 *
 * Consumes PerformanceReports from the analysis module and applies
 * automatic improvements to the agent's behaviour:
 *
 * 1. **Prompt evolution** — Augments the Gemini planner prompt with
 *    lessons learned, domain-specific hints, and failure avoidance rules.
 *
 * 2. **Strategy mutation** — Adjusts repair strategies, confidence
 *    thresholds, and timing parameters based on measured effectiveness.
 *
 * 3. **Workflow optimisation** — Prunes failed procedures, reinforces
 *    successful ones, and discovers shortcuts from episodic memory.
 *
 * 4. **Goal decomposition** — Breaks down goals that consistently fail
 *    into smaller sub-goals with learned pre-conditions.
 *
 * All improvements are persisted to a JSON config file and auto-loaded
 * on restart, making the agent genuinely learn from its own history.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { AgentMemory } from "./memory.js";
import type { PerformanceReport, DomainProfile, StrategyScore } from "./self-analyze.js";
import type { AutonomousConfig, Goal, GoalPriority } from "./types.js";

// ---------------------------------------------------------------------------
// Learned adaptations (persisted)
// ---------------------------------------------------------------------------

/** A single learned rule (injected into the planner prompt). */
export type LearnedRule = {
  id: string;
  source: "analysis" | "feedback" | "self-discovered";
  rule: string;
  confidence: number;
  appliesTo?: string; // domain, goal pattern, or "*"
  createdAt: string;
  usageCount: number;
  effectivenessScore: number;
};

/** Configuration mutations (adjusting agent parameters). */
export type ConfigMutation = {
  parameter: keyof AutonomousConfig;
  originalValue: unknown;
  newValue: unknown;
  reason: string;
  appliedAt: string;
  revertible: boolean;
};

/** A goal decomposition template. */
export type GoalTemplate = {
  pattern: string;  // regex-like pattern matching goal descriptions
  subGoals: Array<{
    description: string;
    priority: GoalPriority;
    precondition?: string;
  }>;
  successRate: number;
  usageCount: number;
};

/** The full persisted improvement state. */
export type ImprovementState = {
  learnedRules: LearnedRule[];
  configMutations: ConfigMutation[];
  goalTemplates: GoalTemplate[];
  promptAdditions: string[];
  domainHints: Record<string, string[]>;
  blacklistedStrategies: string[];
  version: number;
  lastImprovedAt: string;
};

const EMPTY_STATE: ImprovementState = {
  learnedRules: [],
  configMutations: [],
  goalTemplates: [],
  promptAdditions: [],
  domainHints: {},
  blacklistedStrategies: [],
  version: 0,
  lastImprovedAt: new Date().toISOString(),
};

// ---------------------------------------------------------------------------
// Self-improvement engine
// ---------------------------------------------------------------------------

export class SelfImprover {
  private state: ImprovementState;
  private readonly filePath: string;

  constructor(dataDir: string) {
    this.filePath = join(dataDir, "improvements.json");
    this.state = this.load();
  }

  // ---------------------------------------------------------------------------
  // Main improvement cycle
  // ---------------------------------------------------------------------------

  /**
   * Run a full improvement cycle based on a performance report.
   *
   * This is called periodically (e.g., every N goals completed, or on idle).
   * Returns a summary of changes made.
   */
  improve(report: PerformanceReport, memory: AgentMemory): ImprovementSummary {
    const changes: string[] = [];

    // 1. Learn rules from bottlenecks
    const ruleChanges = this.learnFromBottlenecks(report);
    changes.push(...ruleChanges);

    // 2. Evolve strategies based on scores
    const strategyChanges = this.evolveStrategies(report.strategyScores);
    changes.push(...strategyChanges);

    // 3. Generate domain-specific hints
    const domainChanges = this.learnDomainHints(report.domainProfiles);
    changes.push(...domainChanges);

    // 4. Discover goal decomposition templates
    const templateChanges = this.discoverGoalTemplates(report, memory);
    changes.push(...templateChanges);

    // 5. Adjust config parameters
    const configChanges = this.tuneConfig(report);
    changes.push(...configChanges);

    // 6. Prune ineffective rules
    const pruneChanges = this.pruneIneffectiveRules();
    changes.push(...pruneChanges);

    // Update version and timestamp
    this.state.version += 1;
    this.state.lastImprovedAt = new Date().toISOString();
    this.persist();

    return {
      version: this.state.version,
      changesApplied: changes.length,
      changes,
      totalRules: this.state.learnedRules.length,
      totalTemplates: this.state.goalTemplates.length,
    };
  }

  // ---------------------------------------------------------------------------
  // Prompt augmentation
  // ---------------------------------------------------------------------------

  /**
   * Get additional prompt context to inject into the Gemini planner.
   * This is the primary mechanism through which the agent improves.
   */
  getPromptAugmentation(goal?: Goal): string {
    const lines: string[] = [];

    lines.push("=== LEARNED RULES (from self-analysis) ===");

    // Get applicable rules
    const applicableRules = this.state.learnedRules
      .filter((r) => {
        if (r.confidence < 0.3) return false;
        if (r.appliesTo === "*") return true;
        if (!goal) return r.appliesTo === "*";
        if (r.appliesTo && goal.description.toLowerCase().includes(r.appliesTo.toLowerCase()))
          return true;
        return false;
      })
      .sort((a, b) => b.effectivenessScore - a.effectivenessScore)
      .slice(0, 10);

    for (const rule of applicableRules) {
      lines.push(`• ${rule.rule}`);
    }

    // Domain-specific hints
    if (goal) {
      for (const [domain, hints] of Object.entries(this.state.domainHints)) {
        if (goal.description.toLowerCase().includes(domain) || goal.context.some(c => c.includes(domain))) {
          lines.push(`\nDOMAIN HINTS (${domain}):`);
          for (const hint of hints.slice(0, 5)) {
            lines.push(`  • ${hint}`);
          }
        }
      }
    }

    // Global prompt additions
    if (this.state.promptAdditions.length > 0) {
      lines.push("\nADDITIONAL INSTRUCTIONS:");
      for (const addition of this.state.promptAdditions.slice(0, 5)) {
        lines.push(`• ${addition}`);
      }
    }

    // Blacklisted strategies
    if (this.state.blacklistedStrategies.length > 0) {
      lines.push(
        `\nAVOID these approaches: ${this.state.blacklistedStrategies.join(", ")}`,
      );
    }

    return lines.join("\n");
  }

  /**
   * Check if a goal should be decomposed into sub-goals.
   * Returns the sub-goals if a matching template exists, or null.
   */
  getGoalDecomposition(
    goalDescription: string,
  ): GoalTemplate["subGoals"] | null {
    const descLower = goalDescription.toLowerCase();

    for (const template of this.state.goalTemplates) {
      try {
        const regex = new RegExp(template.pattern, "i");
        if (regex.test(descLower) && template.successRate >= 0.5) {
          template.usageCount += 1;
          this.persist();
          return template.subGoals;
        }
      } catch {
        // Bad regex — skip
      }
    }

    return null;
  }

  /**
   * Report the outcome of a rule application (for reinforcement).
   */
  reinforceRule(ruleId: string, success: boolean): void {
    const rule = this.state.learnedRules.find((r) => r.id === ruleId);
    if (rule) {
      rule.usageCount += 1;
      if (success) {
        rule.effectivenessScore = Math.min(1, rule.effectivenessScore + 0.1);
        rule.confidence = Math.min(1, rule.confidence + 0.05);
      } else {
        rule.effectivenessScore = Math.max(0, rule.effectivenessScore - 0.15);
        rule.confidence = Math.max(0, rule.confidence - 0.1);
      }
      this.persist();
    }
  }

  /**
   * Get the current improvement state (for debugging / UI).
   */
  getState(): Readonly<ImprovementState> {
    return this.state;
  }

  // ---------------------------------------------------------------------------
  // Learning from analysis
  // ---------------------------------------------------------------------------

  private learnFromBottlenecks(report: PerformanceReport): string[] {
    const changes: string[] = [];

    for (const bottleneck of report.bottlenecks) {
      // Don't learn the same rule twice
      if (this.state.learnedRules.some((r) => r.rule.includes(bottleneck.area))) {
        continue;
      }

      const rule: LearnedRule = {
        id: `rule-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        source: "analysis",
        rule: `${bottleneck.suggestion} (discovered: ${bottleneck.description})`,
        confidence: bottleneck.severity === "high" ? 0.9 : bottleneck.severity === "medium" ? 0.7 : 0.5,
        appliesTo: bottleneck.area.startsWith("Domain:") ? bottleneck.area.replace("Domain: ", "") : "*",
        createdAt: new Date().toISOString(),
        usageCount: 0,
        effectivenessScore: 0.5, // Neutral starting point
      };

      this.state.learnedRules.push(rule);
      changes.push(`New rule: "${rule.rule}"`);
    }

    // Learn from insights too
    for (const insight of report.insights) {
      if (
        insight.includes("Extract procedures") ||
        insight.includes("best performing")
      ) {
        const existing = this.state.promptAdditions.find((p) =>
          p.includes(insight.split(":")[0]!),
        );
        if (!existing) {
          this.state.promptAdditions.push(insight);
          changes.push(`New prompt addition from insight`);
        }
      }
    }

    return changes;
  }

  private evolveStrategies(strategyScores: StrategyScore[]): string[] {
    const changes: string[] = [];

    for (const score of strategyScores) {
      if (score.recommendation === "deprecate" && score.usageCount >= 3) {
        if (!this.state.blacklistedStrategies.includes(score.strategy)) {
          this.state.blacklistedStrategies.push(score.strategy);
          changes.push(
            `Blacklisted strategy "${score.strategy}" (${(score.successRate * 100).toFixed(0)}% success over ${score.usageCount} uses)`,
          );
        }
      }

      if (score.recommendation === "adjust" && score.usageCount >= 2) {
        const rule: LearnedRule = {
          id: `strat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          source: "analysis",
          rule: `Strategy "${score.strategy}" has ${(score.successRate * 100).toFixed(0)}% success — try alternative approaches when this strategy is the default.`,
          confidence: 0.6,
          appliesTo: "*",
          createdAt: new Date().toISOString(),
          usageCount: 0,
          effectivenessScore: 0.5,
        };

        if (!this.state.learnedRules.some((r) => r.rule.includes(score.strategy))) {
          this.state.learnedRules.push(rule);
          changes.push(`Strategy adjustment rule for "${score.strategy}"`);
        }
      }
    }

    return changes;
  }

  private learnDomainHints(domainProfiles: DomainProfile[]): string[] {
    const changes: string[] = [];

    for (const profile of domainProfiles) {
      if (!this.state.domainHints[profile.domain]) {
        this.state.domainHints[profile.domain] = [];
      }
      const hints = this.state.domainHints[profile.domain]!;

      if (profile.problematic && !hints.some((h) => h.includes("problematic"))) {
        hints.push(
          `This domain is problematic (${(profile.successRate * 100).toFixed(0)}% success). Use extra caution and prefer vision-only mode.`,
        );
        changes.push(`Domain hint for ${profile.domain}: problematic`);
      }

      if (profile.commonErrors.length > 0) {
        const errorHint = `Common errors: ${profile.commonErrors.map((e) => e.type).join(", ")}. Pre-emptively handle these.`;
        if (!hints.some((h) => h.includes("Common errors"))) {
          hints.push(errorHint);
          changes.push(`Domain hint for ${profile.domain}: error patterns`);
        }
      }

      if (profile.successRate >= 0.95 && profile.totalActions > 10) {
        const successHint = `High success rate — current approach is effective. Don't change strategy.`;
        if (!hints.some((h) => h.includes("High success"))) {
          hints.push(successHint);
          changes.push(`Domain hint for ${profile.domain}: high success`);
        }
      }

      // Keep hints manageable
      if (hints.length > 10) {
        this.state.domainHints[profile.domain] = hints.slice(-10);
      }
    }

    return changes;
  }

  private discoverGoalTemplates(
    report: PerformanceReport,
    memory: AgentMemory,
  ): string[] {
    const changes: string[] = [];

    // Look for goals that failed but might succeed if decomposed
    // A goal with high retry count but eventual success = candidate for decomposition
    const stats = memory.getStats();

    if (report.overview.avgRetriesPerGoal.current > 1.5) {
      // High retry rate — suggest breaking goals down
      const rule: LearnedRule = {
        id: `decomp-${Date.now()}`,
        source: "self-discovered",
        rule:
          "Goals are taking too many retries. Break complex goals into smaller, sequential sub-goals. For multi-step web tasks, separate navigation, form-filling, and verification into distinct goals.",
        confidence: 0.8,
        appliesTo: "*",
        createdAt: new Date().toISOString(),
        usageCount: 0,
        effectivenessScore: 0.5,
      };

      if (!this.state.learnedRules.some((r) => r.rule.includes("Break complex goals"))) {
        this.state.learnedRules.push(rule);
        changes.push("New decomposition rule: break complex goals into sub-goals");
      }
    }

    return changes;
  }

  private tuneConfig(report: PerformanceReport): string[] {
    const changes: string[] = [];

    // If success rate is high and retries are low, speed up the tick
    if (
      report.overview.overallSuccessRate.current >= 0.9 &&
      report.overview.avgRetriesPerGoal.current <= 0.5
    ) {
      const existing = this.state.configMutations.find(
        (m) => m.parameter === "activeTickMs",
      );
      if (!existing) {
        this.state.configMutations.push({
          parameter: "activeTickMs",
          originalValue: 2000,
          newValue: 1500,
          reason: "High success rate + low retries → safe to speed up",
          appliedAt: new Date().toISOString(),
          revertible: true,
        });
        changes.push("Tuned activeTickMs: 2000 → 1500 (performance is good, speeding up)");
      }
    }

    // If confidence threshold is causing too many skipped actions, lower it
    if (
      report.overview.overallSuccessRate.current < 0.5 &&
      report.overview.avgRetriesPerGoal.current > 2
    ) {
      const existing = this.state.configMutations.find(
        (m) => m.parameter === "minConfidence",
      );
      if (!existing) {
        this.state.configMutations.push({
          parameter: "minConfidence",
          originalValue: 0.7,
          newValue: 0.5,
          reason: "Low success rate — lowering confidence threshold to allow more actions",
          appliedAt: new Date().toISOString(),
          revertible: true,
        });
        changes.push(
          "Tuned minConfidence: 0.7 → 0.5 (allowing more actions to reduce stuck states)",
        );
      }
    }

    // If we're getting a lot of TIMEOUT errors, increase active tick
    const timeoutErrors = report.errorAnalysis.byType.find((e) => e.type === "TIMEOUT");
    if (timeoutErrors && timeoutErrors.count > 5) {
      const existing = this.state.configMutations.find(
        (m) => m.parameter === "activeTickMs" && m.reason.includes("timeout"),
      );
      if (!existing) {
        this.state.configMutations.push({
          parameter: "activeTickMs",
          originalValue: 2000,
          newValue: 3000,
          reason: "Many timeout errors — slowing tick to give pages more time to load",
          appliedAt: new Date().toISOString(),
          revertible: true,
        });
        changes.push("Tuned activeTickMs: 2000 → 3000 (reducing timeouts)");
      }
    }

    return changes;
  }

  private pruneIneffectiveRules(): string[] {
    const changes: string[] = [];
    const before = this.state.learnedRules.length;

    this.state.learnedRules = this.state.learnedRules.filter((rule) => {
      // Prune rules that have been used 5+ times with low effectiveness
      if (rule.usageCount >= 5 && rule.effectivenessScore < 0.2) {
        changes.push(`Pruned ineffective rule: "${rule.rule.slice(0, 60)}..."`);
        return false;
      }

      // Prune rules where confidence has dropped to near zero
      if (rule.confidence < 0.1 && rule.usageCount >= 3) {
        changes.push(`Pruned low-confidence rule: "${rule.rule.slice(0, 60)}..."`);
        return false;
      }

      // Keep max 50 rules
      return true;
    });

    if (this.state.learnedRules.length > 50) {
      // Sort by effectiveness and keep top 50
      this.state.learnedRules.sort((a, b) => b.effectivenessScore - a.effectivenessScore);
      this.state.learnedRules = this.state.learnedRules.slice(0, 50);
      changes.push(`Trimmed rules to 50 (kept most effective)`);
    }

    return changes;
  }

  // ---------------------------------------------------------------------------
  // Apply mutations to config
  // ---------------------------------------------------------------------------

  /**
   * Apply all pending config mutations to a config object.
   * Returns a new config with the mutations applied.
   */
  applyConfigMutations(config: AutonomousConfig): AutonomousConfig {
    const mutated = { ...config };

    for (const mutation of this.state.configMutations) {
      const key = mutation.parameter;
      if (key in mutated) {
        (mutated as Record<string, unknown>)[key] = mutation.newValue;
      }
    }

    return mutated;
  }

  /**
   * Revert all config mutations.
   */
  revertConfigMutations(): void {
    this.state.configMutations = this.state.configMutations.filter((m) => !m.revertible);
    this.persist();
  }

  // ---------------------------------------------------------------------------
  // Persistence
  // ---------------------------------------------------------------------------

  private load(): ImprovementState {
    try {
      if (existsSync(this.filePath)) {
        const raw = readFileSync(this.filePath, "utf-8");
        return JSON.parse(raw) as ImprovementState;
      }
    } catch {
      // Corrupted — start fresh
    }
    return { ...EMPTY_STATE };
  }

  private persist(): void {
    try {
      const dir = join(this.filePath, "..");
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
      writeFileSync(this.filePath, JSON.stringify(this.state, null, 2), "utf-8");
    } catch {
      // Silent
    }
  }
}

// ---------------------------------------------------------------------------
// Summary type
// ---------------------------------------------------------------------------

export type ImprovementSummary = {
  version: number;
  changesApplied: number;
  changes: string[];
  totalRules: number;
  totalTemplates: number;
};
