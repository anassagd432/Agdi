export type InstinctScope = "project" | "global";

export interface Instinct {
  id: string;
  trigger: string;
  pattern: string;
  action: string;
  confidence: number; // 0.0 to 1.0
  scope: InstinctScope;
  successes: number;
  failures: number;
  tags: string[];
  goalTitle?: string;
  createdAt: number;
  updatedAt: number;
}

export interface LearnFromGoalParams {
  goalId: string;
  goalTitle: string;
  trigger: string;
  solutionPattern: string;
  concreteAction: string;
  tags?: string[];
  scope?: InstinctScope;
}

export interface SkillExportResult {
  skillName: string;
  fileName: string;
  content: string;
}
