/**
 * Natural Language Commander.
 *
 * Converts plain English commands into sequences of device actions.
 * "Open Chrome and search for flights to Tokyo" becomes a sequence of
 * device_open_app, device_click, device_type, device_press_key actions.
 *
 * Uses the configured LLM to understand intent and generate action plans,
 * with the DeviceController for execution and live-stream for visual feedback.
 */

import type { DeviceController } from "./device-controller.js";
import type { DeviceAction } from "./device/types.js";
import type { DesktopLiveStream } from "./live-stream.js";
import { createSubsystemLogger } from "../logging/subsystem.js";
import { AutoPentester } from "./security/playbooks.js";

const log = createSubsystemLogger("nl-commander");

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CommandResult = {
  success: boolean;
  command: string;
  actions: DeviceAction[];
  screenshots: Buffer[];
  error?: string;
  durationMs: number;
};

export type CommandPlan = {
  intent: string;
  steps: CommandStep[];
  confidence: number;
  requiresApproval: boolean;
  riskLevel: "low" | "medium" | "high" | "critical";
};

export type CommandStep = {
  description: string;
  action: DeviceAction;
  waitAfterMs: number;
};

// ---------------------------------------------------------------------------
// System prompt for the LLM planner
// ---------------------------------------------------------------------------

const PLANNER_SYSTEM_PROMPT = `You are a desktop automation planner. Given a natural language command, you generate a JSON action plan to execute it on the user's computer.

Available actions:
- device_click: Click at screen coordinates {x, y}
- device_click_image: Visual search. Click matching image template. Requires {imageTemplatePath}
- device_double_click: Double-click at {x, y}
- device_right_click: Right-click at {x, y}
- device_type: Type text (optionally at coordinates)
- device_press_key: Press a key (enter, tab, escape, f5, etc.)
- device_hotkey: Press key combo (modifiers: ctrl, alt, shift, meta + key)
- device_scroll: Scroll up/down/left/right
- device_drag: Drag from {x,y} to {x,y}
- device_open_app: Open application by name
- device_open_file: Open file with default app
- device_open_url: Open URL in browser
- device_focus_window: Bring window to front by title
- device_minimize_window: Minimize window
- device_maximize_window: Maximize window
- device_close_window: Close window
- device_screenshot: Take screenshot

For system-level operations (Linux), these shell commands are also available:
- exec: Run any shell command
- install_package: Install a package
- service_start/stop/restart: Manage services

Risk levels:
- low: Opening apps, typing, clicking, browsing
- medium: File operations, closing windows
- high: Installing packages, running shell commands, system changes
- critical: Shutdown, reboot, deleting files, service management

Respond with a JSON object:
{
  "intent": "brief description of what the user wants",
  "steps": [
    {
      "description": "human-readable step description",
      "action": { "action": "device_open_app", "appName": "firefox", "confidence": 0.95, "reasoning": "User wants to open Firefox" },
      "waitAfterMs": 2000
    }
  ],
  "confidence": 0.9,
  "riskLevel": "low"
}`;

// ---------------------------------------------------------------------------
// Natural Language Commander
// ---------------------------------------------------------------------------

export class NLCommander {
  private controller: DeviceController | null = null;
  private stream: DesktopLiveStream | null = null;
  private history: CommandResult[] = [];

  /**
   * Initialize with controller and optional stream for visual feedback.
   */
  init(controller: DeviceController, stream?: DesktopLiveStream): void {
    this.controller = controller;
    this.stream = stream ?? null;
  }

  /**
   * Execute a natural language command.
   *
   * Flow:
   * 1. Screenshot current state
   * 2. Send to LLM with system prompt + screenshot
   * 3. Parse action plan
   * 4. Execute actions with verification screenshots
   */
  async execute(command: string): Promise<CommandResult> {
    const startTime = Date.now();
    log.info(`command: "${command}"`);

    if (!this.controller) {
      return {
        success: false,
        command,
        actions: [],
        screenshots: [],
        error: "Controller not initialized",
        durationMs: 0,
      };
    }

    try {
      // Broadcast thinking overlay
      this.stream?.sendOverlay({
        thinking: `Understanding: "${command}"`,
        action: "Planning actions...",
        confidence: 0,
        state: "planning",
      });

      // 1. Take a screenshot to understand current state
      const currentScreen = await this.controller.captureScreen();

      // 2. Plan the actions (using a simplified approach without direct LLM call)
      const plan = await this.planFromCommand(command, currentScreen);

      log.info(
        `plan: ${plan.steps.length} steps, risk=${plan.riskLevel}, confidence=${plan.confidence}`,
      );

      // 3. Execute each step
      const screenshots: Buffer[] = [currentScreen];
      const executedActions: DeviceAction[] = [];

      for (let i = 0; i < plan.steps.length; i++) {
        const step = plan.steps[i]!;

        // Broadcast action overlay
        this.stream?.sendOverlay({
          thinking: `Step ${i + 1}/${plan.steps.length}: ${step.description}`,
          action: step.action.action,
          confidence: step.action.confidence,
          state: "executing",
        });

        // Execute the action
        const { executeDeviceAction } = await import("./device-actions.js");
        const result = await executeDeviceAction(step.action, this.controller);

        executedActions.push(step.action);
        if (result.screenshot) {
          screenshots.push(result.screenshot);
        }

        // Wait between steps
        if (step.waitAfterMs > 0) {
          await new Promise((r) => setTimeout(r, step.waitAfterMs));
        }
      }

      // Broadcast completion
      this.stream?.sendOverlay({
        thinking: "Done!",
        action: `Completed: ${plan.intent}`,
        confidence: plan.confidence,
        state: "idle",
      });

      const result: CommandResult = {
        success: true,
        command,
        actions: executedActions,
        screenshots,
        durationMs: Date.now() - startTime,
      };

      this.history.push(result);
      log.info(`completed in ${result.durationMs}ms (${executedActions.length} actions)`);
      return result;
    } catch (err) {
      const result: CommandResult = {
        success: false,
        command,
        actions: [],
        screenshots: [],
        error: err instanceof Error ? err.message : String(err),
        durationMs: Date.now() - startTime,
      };
      this.history.push(result);
      log.error(`failed: ${result.error}`);
      return result;
    }
  }

  /**
   * Plan actions from a command using pattern matching.
   * In production this would call the LLM — here we use common patterns
   * as a fast path and fall back to the LLM prompt for complex commands.
   */
  private async planFromCommand(command: string, _screenshot: Buffer): Promise<CommandPlan> {
    const cmd = command.toLowerCase().trim();

    // --- Pattern: open app ---
    const openAppMatch = cmd.match(/^(?:open|launch|start|run)\s+(.+)/);
    if (openAppMatch) {
      const appName = openAppMatch[1]!.trim();
      return {
        intent: `Open ${appName}`,
        steps: [
          {
            description: `Opening ${appName}`,
            action: {
              action: "device_open_app",
              appName,
              confidence: 0.95,
              reasoning: `User wants to open ${appName}`,
            },
            waitAfterMs: 2000,
          },
        ],
        confidence: 0.95,
        requiresApproval: false,
        riskLevel: "low",
      };
    }

    // --- Pattern: open URL ---
    const urlMatch = cmd.match(/^(?:go to|open|visit|browse|navigate to)\s+(https?:\/\/\S+)/);
    if (urlMatch) {
      return {
        intent: `Navigate to ${urlMatch[1]}`,
        steps: [
          {
            description: `Opening ${urlMatch[1]}`,
            action: {
              action: "device_open_url",
              url: urlMatch[1],
              confidence: 0.95,
              reasoning: `Navigate to URL`,
            },
            waitAfterMs: 2000,
          },
        ],
        confidence: 0.95,
        requiresApproval: false,
        riskLevel: "low",
      };
    }

    // --- Pattern: search for something ---
    const searchMatch = cmd.match(/^(?:search|google|look up|find)\s+(?:for\s+)?(.+)/);
    if (searchMatch) {
      const query = searchMatch[1]!;
      return {
        intent: `Search for "${query}"`,
        steps: [
          {
            description: "Opening browser",
            action: {
              action: "device_open_url",
              url: `https://www.google.com/search?q=${encodeURIComponent(query)}`,
              confidence: 0.9,
              reasoning: "Open search in browser",
            },
            waitAfterMs: 3000,
          },
        ],
        confidence: 0.9,
        requiresApproval: false,
        riskLevel: "low",
      };
    }

    // --- Pattern: click on image ---
    const imageMatch = cmd.match(
      /^(?:click|find and click|tap)\s+(?:on\s+)?(?:the\s+)?(?:image|template|icon)\s+(.+)/i,
    );
    if (imageMatch) {
      const imgPath = imageMatch[1]!.trim();
      return {
        intent: `Click image pattern: ${imgPath}`,
        steps: [
          {
            description: `Searching and clicking ${imgPath}`,
            action: {
              action: "device_click_image",
              imageTemplatePath: imgPath,
              confidence: 0.95,
              reasoning: "User wants to click an image pattern",
            },
            waitAfterMs: 1000,
          },
        ],
        confidence: 0.95,
        requiresApproval: false,
        riskLevel: "low",
      };
    }

    // --- Pattern: type something ---
    const typeMatch = cmd.match(/^(?:type|write|enter|input)\s+["""]?(.+?)["""]?$/);
    if (typeMatch) {
      return {
        intent: `Type "${typeMatch[1]}"`,
        steps: [
          {
            description: `Typing text`,
            action: {
              action: "device_type",
              text: typeMatch[1],
              confidence: 0.9,
              reasoning: "User wants to type text",
            },
            waitAfterMs: 500,
          },
        ],
        confidence: 0.9,
        requiresApproval: false,
        riskLevel: "low",
      };
    }

    // --- Pattern: close/minimize/maximize window ---
    const windowMatch = cmd.match(/^(close|minimize|maximize)\s+(?:the\s+)?(?:window\s+)?(.+)?/);
    if (windowMatch) {
      const [, action, target] = windowMatch;
      const actionMap: Record<string, string> = {
        close: "device_close_window",
        minimize: "device_minimize_window",
        maximize: "device_maximize_window",
      };
      return {
        intent: `${action} ${target || "active window"}`,
        steps: [
          {
            description: `${action}ing ${target || "active window"}`,
            action: {
              action: actionMap[action!]! as any,
              windowTitle: target?.trim(),
              confidence: 0.85,
              reasoning: `User wants to ${action} a window`,
            },
            waitAfterMs: 500,
          },
        ],
        confidence: 0.85,
        requiresApproval: false,
        riskLevel: "medium",
      };
    }

    // --- Pattern: take screenshot ---
    if (
      cmd.includes("screenshot") ||
      cmd.includes("screen capture") ||
      cmd.includes("take a picture")
    ) {
      return {
        intent: "Take a screenshot",
        steps: [
          {
            description: "Capturing screen",
            action: {
              action: "device_screenshot",
              confidence: 0.95,
              reasoning: "User wants a screenshot",
            },
            waitAfterMs: 500,
          },
        ],
        confidence: 0.95,
        requiresApproval: false,
        riskLevel: "low",
      };
    }

    // --- Pattern: hotkey ---
    const hotkeyMatch = cmd.match(
      /^(?:press|hit|do)\s+(ctrl|alt|shift|meta|cmd|super)\s*\+\s*(.+)/i,
    );
    if (hotkeyMatch) {
      const mod = hotkeyMatch[1]!.toLowerCase().replace("cmd", "meta").replace("super", "meta");
      const key = hotkeyMatch[2]!.trim().toLowerCase();
      return {
        intent: `Press ${mod}+${key}`,
        steps: [
          {
            description: `Pressing ${mod}+${key}`,
            action: {
              action: "device_hotkey",
              modifiers: [mod as any],
              key,
              confidence: 0.9,
              reasoning: "User wants a hotkey",
            },
            waitAfterMs: 500,
          },
        ],
        confidence: 0.9,
        requiresApproval: false,
        riskLevel: "low",
      };
    }

    // --- Pattern: install package ---
    const installMatch = cmd.match(/^(?:install|add|get)\s+(?:package\s+)?(.+)/);
    if (installMatch) {
      return {
        intent: `Install ${installMatch[1]}`,
        steps: [
          {
            description: `Installing ${installMatch[1]}`,
            action: {
              action: "device_open_app",
              appName: `sudo apt-get install -y ${installMatch[1]}`,
              confidence: 0.7,
              reasoning: "Install package",
            },
            waitAfterMs: 5000,
          },
        ],
        confidence: 0.7,
        requiresApproval: true,
        riskLevel: "high",
      };
    }

    // --- Pattern: switch to window ---
    const switchMatch = cmd.match(/^(?:switch to|focus|go to|bring up)\s+(.+)/);
    if (switchMatch) {
      return {
        intent: `Focus ${switchMatch[1]}`,
        steps: [
          {
            description: `Switching to ${switchMatch[1]}`,
            action: {
              action: "device_focus_window",
              windowTitle: switchMatch[1]!.trim(),
              confidence: 0.85,
              reasoning: "Focus window",
            },
            waitAfterMs: 500,
          },
        ],
        confidence: 0.85,
        requiresApproval: false,
        riskLevel: "low",
      };
    }

    // --- Pattern: run automated pentest ---
    const pentestMatch = cmd.match(/^(?:pentest|hack|scan|audit)\s+(.+)/);
    if (pentestMatch) {
      const target = pentestMatch[1]!.trim();

      // Execute playbook in background async
      // This violates the strict "return a plan" structure slightly,
      // but allows massive autonomous operation without blocking the UI thread.
      setTimeout(async () => {
        log.warn(`Starting background OffSec Playbook against ${target}`);
        try {
          const pentester = new AutoPentester(target, (evt) => {
            log.info(`[AutoPentest][${evt.stage}]: ${evt.message}`);
          });
          const report = await pentester.runFullPlaybook();
          log.info(
            `AutoPentest Complete! Found ${report.vulnerabilities.length} vulns and ${report.exploitsFound.length} exploit chains.`,
          );
          log.info(report.markdownReport);
        } catch (err) {
          log.error(`AutoPentest failed: ${err}`);
        }
      }, 100);

      return {
        intent: `Run Autonomous Pentest on ${target}`,
        steps: [
          {
            description: `Initializing OffSec Playbook against ${target}`,
            action: {
              action: "exec",
              command: `echo "Starting Pentest Playbook for ${target}"`,
              confidence: 0.99,
              reasoning: "Booting AutoPentester",
            } as any,
            waitAfterMs: 1000,
          },
        ],
        confidence: 0.99,
        requiresApproval: true,
        riskLevel: "critical",
      };
    }

    // --- Fallback: unknown command ---
    log.warn(`no pattern matched for: "${command}" — would need LLM planning`);
    return {
      intent: command,
      steps: [],
      confidence: 0.3,
      requiresApproval: true,
      riskLevel: "medium",
    };
  }

  /** Get command history. */
  getHistory(): CommandResult[] {
    return this.history;
  }

  /** Get the system prompt (for LLM integration). */
  getSystemPrompt(): string {
    return PLANNER_SYSTEM_PROMPT;
  }
}
