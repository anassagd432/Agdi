/**
 * Shared types for the autonomous agent module.
 */

// ---------------------------------------------------------------------------
// Goal system
// ---------------------------------------------------------------------------

export type GoalPriority = "critical" | "high" | "normal" | "low";
export type GoalStatus = "pending" | "in-progress" | "completed" | "failed" | "paused";
export type GoalType = "one-time" | "recurring";

export type Goal = {
  id: string;
  description: string;
  type: GoalType;
  priority: GoalPriority;
  status: GoalStatus;
  retries: number;
  maxRetries: number;
  context: string[];
  createdAt: string;
  updatedAt: string;
  schedule?: string; // cron expression for recurring goals
  lastError?: string;
  progress?: string;
};

// ---------------------------------------------------------------------------
// Agent state machine
// ---------------------------------------------------------------------------

export type AgentState = "idle" | "planning" | "executing" | "observing" | "repairing";

// ---------------------------------------------------------------------------
// Actions (output from vision / planner)
// ---------------------------------------------------------------------------

export type ActionType =
  | "click"
  | "type"
  | "scroll"
  | "navigate"
  | "wait"
  | "screenshot"
  | "press_key"
  | "done"
  // Device control actions (native desktop)
  | "device_click"
  | "device_double_click"
  | "device_right_click"
  | "device_type"
  | "device_press_key"
  | "device_hotkey"
  | "device_scroll"
  | "device_drag"
  | "device_open_app"
  | "device_open_file"
  | "device_open_url"
  | "device_focus_window"
  | "device_minimize_window"
  | "device_maximize_window"
  | "device_close_window"
  | "device_screenshot";

export type Action = {
  action: ActionType;
  coordinates?: { x: number; y: number };
  text?: string;
  url?: string;
  key?: string;
  direction?: "up" | "down";
  durationMs?: number;
  confidence: number;
  reasoning: string;
};

// ---------------------------------------------------------------------------
// Vision analysis (response from Gemini)
// ---------------------------------------------------------------------------

export type VisionAnalysis = {
  observation: string;
  reasoning: string;
  suggestedAction: Action;
  elements?: Array<{
    type: string;
    label: string;
    bbox: [number, number, number, number]; // [x1, y1, x2, y2]
  }>;
  confidence: number;
  goalProgress: "continue" | "done" | "stuck";
};

// ---------------------------------------------------------------------------
// Self-repair
// ---------------------------------------------------------------------------

export type ErrorType =
  | "SELECTOR_CHANGED"
  | "AUTH_EXPIRED"
  | "NETWORK_ERROR"
  | "LOGIC_ERROR"
  | "CAPTCHA"
  | "PAGE_CRASH"
  | "TIMEOUT"
  | "UNRECOVERABLE";

export type RepairDiagnosis = {
  type: ErrorType;
  insight: string;
  suggestedFix: string;
  canAutoRepair: boolean;
};

// ---------------------------------------------------------------------------
// User messages
// ---------------------------------------------------------------------------

export type MessagePriority = "CRITICAL" | "HIGH" | "NORMAL" | "LOW";

export type UserMessage = {
  id: string;
  content: string;
  priority: MessagePriority;
  timestamp: string;
  processed: boolean;
};

// ---------------------------------------------------------------------------
// Agent events (emitted to UI)
// ---------------------------------------------------------------------------

export type AgentEvent =
  | { type: "state_change"; state: AgentState; goalId?: string }
  | { type: "goal_completed"; goal: Goal }
  | { type: "goal_failed"; goal: Goal; error: string }
  | { type: "action_executed"; action: Action; screenshot?: Buffer }
  | { type: "repair_attempt"; diagnosis: RepairDiagnosis; goalId: string }
  | { type: "user_escalation"; message: string; goalId: string }
  | { type: "status_report"; state: AgentState; activeGoal?: Goal; queueLength: number };

export type AgentEventHandler = (event: AgentEvent) => void;

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

export type AutonomousConfig = {
  /** Tick interval when actively working (ms). Default 2000. */
  activeTickMs: number;
  /** Tick interval when idle (ms). Default 30000. */
  idleTickMs: number;
  /** Maximum retries per goal. Default 3. */
  maxRetries: number;
  /** Whether to run browser in headless mode. Default true. */
  headless: boolean;
  /** Gemini model for complex vision analysis. */
  visionModel: string;
  /** Gemini model for fast observations. */
  fastModel: string;
  /** Minimum confidence threshold to execute an action. Default 0.7. */
  minConfidence: number;
  /** Path to persist goals and state. */
  dataDir: string;
  /** Port for the agent browser dashboard. Default 7700. */
  dashboardPort: number;
};

export const DEFAULT_CONFIG: AutonomousConfig = {
  activeTickMs: 2_000,
  idleTickMs: 30_000,
  maxRetries: 3,
  headless: true,
  visionModel: "gemini-2.5-pro",
  fastModel: "gemini-2.0-flash",
  minConfidence: 0.7,
  dataDir: "",
  dashboardPort: 7700,
};
