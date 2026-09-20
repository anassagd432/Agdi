export type GoalStatus = "pending" | "in_progress" | "completed" | "failed" | "paused";

export type TaskStatus = "pending" | "running" | "completed" | "failed" | "skipped";

export type VerificationKind = "test" | "typecheck" | "lint" | "build" | "format";

export interface ProofToken {
  id: string;
  goalId?: string;
  command: string;
  canonicalCommand: string;
  kind: VerificationKind;
  scope: string;
  status: "passed" | "failed";
  exitCode: number;
  outputSummary: string;
  evidenceHash: string;
  metrics?: {
    passedCount?: number;
    failedCount?: number;
    durationMs?: number;
  };
  timestamp: number;
}

export interface ToolGuardrailDecision {
  action: "allow" | "warn" | "block" | "halt";
  code: string;
  message: string;
  toolName: string;
  count: number;
  signature: string;
  shouldHalt?: boolean;
}

export interface Instinct {
  id: string;
  trigger: string;
  pattern: string;
  action: string;
  confidence: number;
  scope: "project" | "global";
  successes: number;
  failures: number;
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

export interface GoalTask {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  command?: string;
  toolCall?: {
    tool: string;
    params: Record<string, unknown>;
  };
  result?: string;
  error?: string;
  attempts: number;
  maxAttempts: number;
  startedAt?: number;
  completedAt?: number;
}

export interface Goal {
  id: string;
  title: string;
  description: string;
  status: GoalStatus;
  progressPercent: number;
  tasks: GoalTask[];
  validationCriteria?: string[];
  proofTokens?: string[];
  context?: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
}

export interface GoalEngineOptions {
  stateDir?: string;
  maxConsecutiveFailures?: number;
  autoDecompose?: boolean;
}

export interface GoalStepResult {
  taskId: string;
  status: TaskStatus;
  output?: string;
  error?: string;
}
