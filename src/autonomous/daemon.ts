/**
 * Background daemon runner.
 *
 * Initializes all modules (browser, goal queue, vision, repair, memory)
 * and wires them together into the autonomous loop. Manages graceful
 * startup + shutdown and state persistence.
 */

import { homedir } from "node:os";
import { join } from "node:path";
import { mkdirSync, existsSync } from "node:fs";
import { chromium } from "playwright-core";
import type { Browser, Page } from "playwright-core";

import { AutonomousAgent } from "./loop.js";
import { GoalQueue } from "./goal-queue.js";
import { MessageQueue } from "./message-queue.js";
import { AgentUI } from "./user-interface.js";
import { SelfImprover } from "./self-improve.js";
import { analyzePerformance, summarizeReport } from "./self-analyze.js";
import type { PerformanceReport } from "./self-analyze.js";
import { AgentMemory } from "./memory.js";
import { analyzeScreenshot } from "./vision.js";
import { addGridOverlay } from "./grid-overlay.js";
import { executeVisualAction } from "./visual-actions.js";
import { diagnose, attemptRepair } from "./repair.js";
import { decideStrategy } from "./decision.js";
import type { Action, AutonomousConfig, Goal, VisionAnalysis } from "./types.js";
import { DEFAULT_CONFIG } from "./types.js";
import { BrowserDashboard } from "./browser-ui/server.js";
import { TabManager } from "./tab-manager.js";
import { AuthManager } from "./auth-manager.js";
import { GoalScheduler } from "./scheduler.js";
import { PluginRegistry, createApiPlugin, createFilePlugin } from "./plugins.js";
import { TaskRecorder } from "./recorder.js";

// ---------------------------------------------------------------------------
// Data directory
// ---------------------------------------------------------------------------

function resolveDataDir(custom?: string): string {
  const dir = custom || join(homedir(), ".agdi", "autonomous");
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return dir;
}

// ---------------------------------------------------------------------------
// Daemon
// ---------------------------------------------------------------------------

export class AutonomousDaemon {
  private agent: AutonomousAgent | null = null;
  private browser: Browser | null = null;
  private page: Page | null = null;
  private ui: AgentUI | null = null;
  private memory: AgentMemory | null = null;
  private improver: SelfImprover | null = null;
  private lastReport: PerformanceReport | null = null;
  private goalsCompletedSinceLastAnalysis = 0;
  private readonly config: AutonomousConfig;
  private dashboard: BrowserDashboard | null = null;
  private tabManager: TabManager | null = null;
  private authManager: AuthManager | null = null;
  private scheduler: GoalScheduler | null = null;
  private pluginRegistry: PluginRegistry | null = null;
  private recorder: TaskRecorder | null = null;

  constructor(configOverrides?: Partial<AutonomousConfig>) {
    const dataDir = resolveDataDir(configOverrides?.dataDir);
    this.config = { ...DEFAULT_CONFIG, ...configOverrides, dataDir };
  }

  /**
   * Start the autonomous daemon.
   *
   * Initializes the browser, wires all modules, and starts the main loop.
   */
  async start(): Promise<void> {
    if (this.agent?.isRunning) {
      throw new Error("Daemon is already running");
    }

    const dataDir = this.config.dataDir;

    // Initialize modules
    this.memory = new AgentMemory(dataDir);
    this.improver = new SelfImprover(dataDir);
    const messageQueue = new MessageQueue();
    this.ui = new AgentUI({ messageQueue });

    // Apply any learned config mutations from previous sessions
    const tunedConfig = this.improver.applyConfigMutations(this.config);
    Object.assign(this.config, tunedConfig);

    this.ui.sendNotification("info", "Starting autonomous daemon...");

    // Launch browser
    this.browser = await chromium.launch({
      headless: this.config.headless,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-blink-features=AutomationControlled",
      ],
    });

    const context = await this.browser.newContext({
      viewport: { width: 1280, height: 720 },
      userAgent:
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    });

    this.page = await context.newPage();

    // Initialize tab manager
    this.tabManager = new TabManager();
    this.tabManager.init(context, this.page);

    // Initialize auth manager — restore previous session
    this.authManager = new AuthManager(dataDir);
    await this.authManager.restore(context, this.page).catch(() => {});

    // Initialize plugin registry with built-in plugins
    this.pluginRegistry = new PluginRegistry();
    this.pluginRegistry.register(createApiPlugin());
    this.pluginRegistry.register(createFilePlugin());
    await this.pluginRegistry.loadFromDirectory(join(dataDir, "plugins")).catch(() => {});

    // Initialize task recorder
    this.recorder = new TaskRecorder(dataDir);

    // Initialize scheduler
    this.scheduler = new GoalScheduler();

    // Create the agent
    this.agent = new AutonomousAgent(this.config);

    // Wire scheduler to goal queue
    this.scheduler.attach(this.agent.goals);
    this.scheduler.start();

    // Wire the modules
    this.wireModules();

    // Listen for events
    this.agent.onEvent((event) => {
      this.ui!.logEvent(event);

      switch (event.type) {
        case "state_change":
          this.ui!.sendStatus(event.state);
          // Trigger improvement cycle during idle
          if (event.state === "idle" && this.goalsCompletedSinceLastAnalysis >= 3) {
            void this.runImprovementCycle();
          }
          break;
        case "goal_completed":
          this.ui!.sendNotification("success", `Completed: "${event.goal.description}"`);
          this.goalsCompletedSinceLastAnalysis += 1;
          break;
        case "goal_failed":
          this.ui!.sendNotification("error", `Failed: "${event.goal.description}" — ${event.error}`);
          this.goalsCompletedSinceLastAnalysis += 1;
          break;
        case "user_escalation":
          this.ui!.sendEscalation(event.message, event.goalId);
          break;
        case "repair_attempt":
          this.ui!.sendNotification("warning", `Repairing: ${event.diagnosis.insight}`);
          break;
      }
    });

    this.ui.sendNotification("success", "Autonomous daemon started ✅");
    this.ui.sendNotification("info", `Data directory: ${dataDir}`);
    this.ui.sendNotification("info", `Browser: ${this.config.headless ? "headless" : "headed"}`);
    this.ui.sendNotification("info", `Vision model: ${this.config.visionModel}`);
    this.ui.sendNotification(
      "info",
      `Self-improvement: v${this.improver.getState().version} (${this.improver.getState().learnedRules.length} rules)`,
    );

    // Start the loop (non-blocking)
    void this.agent.run();

    // Start the browser dashboard
    this.dashboard = new BrowserDashboard(this.config.dashboardPort ?? 7700);
    try {
      const dashUrl = await this.dashboard.start({
        page: this.page!,
        agent: this.agent,
        ui: this.ui,
        memory: this.memory,
        improver: this.improver,
      });
      this.ui.sendNotification("success", `🌐 Agent browser: ${dashUrl}`);
    } catch (err) {
      this.ui.sendNotification("warning", `Dashboard failed to start: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  /**
   * Stop the daemon gracefully.
   */
  async stop(): Promise<void> {
    this.ui?.sendNotification("info", "Stopping autonomous daemon...");

    this.agent?.stop();
    this.scheduler?.stop();

    // Save session before closing browser
    if (this.authManager && this.browser && this.page) {
      const context = this.page.context();
      await this.authManager.save(context, this.page).catch(() => {});
    }

    // Finish any active recording
    if (this.recorder?.isRecording) {
      await this.recorder.finishRecording(false).catch(() => {});
    }

    if (this.dashboard) {
      await this.dashboard.stop().catch(() => {});
      this.dashboard = null;
    }

    if (this.browser) {
      await this.browser.close().catch(() => {});
      this.browser = null;
      this.page = null;
    }

    this.ui?.sendNotification("info", "Autonomous daemon stopped.");
  }

  /** Get the agent instance (for adding goals, sending messages, etc.). */
  getAgent(): AutonomousAgent | null {
    return this.agent;
  }

  /** Get the UI instance. */
  getUI(): AgentUI | null {
    return this.ui;
  }

  /** Get the memory instance. */
  getMemory(): AgentMemory | null {
    return this.memory;
  }

  /** Get the self-improver instance. */
  getImprover(): SelfImprover | null {
    return this.improver;
  }

  /** Get the tab manager. */
  getTabManager(): TabManager | null {
    return this.tabManager;
  }

  /** Get the auth manager. */
  getAuthManager(): AuthManager | null {
    return this.authManager;
  }

  /** Get the goal scheduler. */
  getScheduler(): GoalScheduler | null {
    return this.scheduler;
  }

  /** Get the plugin registry. */
  getPlugins(): PluginRegistry | null {
    return this.pluginRegistry;
  }

  /** Get the task recorder. */
  getRecorder(): TaskRecorder | null {
    return this.recorder;
  }

  /** Manually trigger an improvement cycle. */
  async runImprovementCycle(): Promise<void> {
    if (!this.memory || !this.improver || !this.agent) return;

    this.ui?.sendNotification("info", "🧬 Running self-analysis & improvement cycle...");

    const allGoals = this.agent.goals.list();
    const report = analyzePerformance(this.memory, allGoals, 24 * 60 * 60 * 1000, this.lastReport ?? undefined);

    this.ui?.sendNotification("info", summarizeReport(report));

    const summary = this.improver.improve(report, this.memory);
    this.lastReport = report;
    this.goalsCompletedSinceLastAnalysis = 0;

    if (summary.changesApplied > 0) {
      this.ui?.sendNotification("success", `🧬 Self-improved: ${summary.changesApplied} changes (v${summary.version})`);
      for (const change of summary.changes.slice(0, 5)) {
        this.ui?.sendNotification("info", `  → ${change}`);
      }

      // Re-apply config mutations
      const tunedConfig = this.improver.applyConfigMutations(this.config);
      Object.assign(this.config, tunedConfig);
    } else {
      this.ui?.sendNotification("info", "🧬 No improvements needed — agent is performing well.");
    }
  }

  /** Whether the daemon is running. */
  get isRunning(): boolean {
    return this.agent?.isRunning ?? false;
  }

  // ---------------------------------------------------------------------------
  // Module wiring
  // ---------------------------------------------------------------------------

  private wireModules(): void {
    const agent = this.agent!;
    const page = this.page!;
    const memory = this.memory!;
    const config = this.config;

    const improver = this.improver!;

    // --- PLANNER ---
    // Uses vision to analyze the current page and generate a plan
    agent.setPlanner(async (goal: Goal): Promise<Action[]> => {
      // Check if the goal should be decomposed into sub-goals
      const subGoals = improver.getGoalDecomposition(goal.description);
      if (subGoals && goal.retries === 0) {
        // Add sub-goals to the queue and mark this one as done
        for (const sub of subGoals) {
          agent.goals.add({
            description: sub.description,
            priority: sub.priority,
          });
        }
        return [{ action: "done", confidence: 1, reasoning: "Decomposed into sub-goals" }];
      }

      // Check if we have a learned procedure for this goal type
      const procedure = memory.recallProcedure(goal.description);
      if (procedure && procedure.successCount >= 2) {
        return procedure.steps;
      }

      // Take a screenshot and ask Gemini for a plan
      const screenshot = Buffer.from(await page.screenshot({ type: "jpeg", quality: 80 }));

      // Build augmented history with self-improvement context
      const history = memory.getRecentActionsSummary(goal.id);
      const augmentation = improver.getPromptAugmentation(goal);
      if (augmentation) {
        history.unshift(augmentation);
      }

      const analysis = await analyzeScreenshot(screenshot, goal, config, {
        history,
      });

      // Return a single step — the loop will call the planner again after each step
      return [analysis.suggestedAction];
    });

    // --- EXECUTOR ---
    // Chooses between DOM-based and visual execution
    agent.setExecutor(async (action: Action): Promise<{ screenshot: Buffer | null }> => {
      const strategy = await decideStrategy(page, agent.activeGoal!);

      // For now, always use visual execution (coordinate-based)
      // DOM-based execution will be added when we integrate with the existing
      // agdi browser tools (snapshotAiViaPlaywright, clickViaPlaywright, etc.)
      if (strategy === "dom" && action.action === "click") {
        // Future: use DOM-based clicking via ARIA refs
      }

      const result = await executeVisualAction(action, page);
      return result;
    });

    // --- OBSERVER ---
    // Takes a screenshot and asks Gemini to evaluate progress
    agent.setObserver(
      async (screenshot: Buffer, goal: Goal): Promise<VisionAnalysis> => {
        // Add grid overlay if we're having precision issues
        let imageToAnalyze = screenshot;
        if (goal.retries > 0) {
          imageToAnalyze = await addGridOverlay(screenshot);
        }

        const history = memory.getRecentActionsSummary(goal.id);
        const analysis = await analyzeScreenshot(imageToAnalyze, goal, config, {
          history,
          useFastModel: goal.retries === 0, // Use fast model first, pro on retries
        });

        // Log the observation
        memory.logAction(goal, analysis.suggestedAction, "success", analysis.observation);

        return analysis;
      },
    );

    // --- REPAIRER ---
    // Diagnoses errors and attempts self-repair
    agent.setRepairer(
      async (
        goal: Goal,
        error: Error,
        context?: VisionAnalysis,
      ): Promise<boolean> => {
        const diagnosis = diagnose(error, goal, context);
        const repairResult = await attemptRepair(diagnosis, goal);

        // Record the failure in memory
        const currentUrl = page.url();
        memory.recordFailure(currentUrl, diagnosis.type, error.message);

        if (repairResult.repaired && repairResult.goalMutation?.addContext) {
          goal.context.push(repairResult.goalMutation.addContext);
        }

        return repairResult.repaired;
      },
    );
  }
}

// ---------------------------------------------------------------------------
// Convenience: start/stop functions
// ---------------------------------------------------------------------------

let daemon: AutonomousDaemon | null = null;

/** Start the global daemon instance. */
export async function startDaemon(
  config?: Partial<AutonomousConfig>,
): Promise<AutonomousDaemon> {
  if (daemon?.isRunning) {
    throw new Error("Autonomous daemon is already running");
  }
  daemon = new AutonomousDaemon(config);
  await daemon.start();
  return daemon;
}

/** Stop the global daemon instance. */
export async function stopDaemon(): Promise<void> {
  if (daemon) {
    await daemon.stop();
    daemon = null;
  }
}

/** Get the global daemon instance. */
export function getDaemon(): AutonomousDaemon | null {
  return daemon;
}
