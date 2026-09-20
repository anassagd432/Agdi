export type GoalStatus = "pending" | "in_progress" | "completed" | "failed" | "paused";

export type TaskStatus = "pending" | "running" | "completed" | "failed" | "skipped";

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
