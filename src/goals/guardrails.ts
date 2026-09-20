import * as crypto from "node:crypto";
import type { ToolGuardrailDecision } from "./types.js";

export interface ToolGuardrailConfig {
  maxIdenticalCallsWarnAfter: number;
  maxIdenticalCallsBlockAfter: number;
  sameToolFailureWarnAfter: number;
  sameToolFailureHaltAfter: number;
  maxWebSearchesPerTurn: number;
  maxSubagentsPerTurn: number;
  maxMutationsPerTurn: number;
}

export const DEFAULT_GUARDRAIL_CONFIG: ToolGuardrailConfig = {
  maxIdenticalCallsWarnAfter: 2,
  maxIdenticalCallsBlockAfter: 4,
  sameToolFailureWarnAfter: 3,
  sameToolFailureHaltAfter: 6,
  maxWebSearchesPerTurn: 10,
  maxSubagentsPerTurn: 5,
  maxMutationsPerTurn: 25,
};

export class ToolGuardrailController {
  private readonly config: ToolGuardrailConfig;
  private readonly callSignatures: Map<string, number> = new Map();
  private readonly toolFailures: Map<string, number> = new Map();
  private turnWebSearches = 0;
  private turnSubagents = 0;
  private turnMutations = 0;

  constructor(config?: Partial<ToolGuardrailConfig>) {
    this.config = { ...DEFAULT_GUARDRAIL_CONFIG, ...config };
  }

  public computeSignature(toolName: string, params: Record<string, unknown>): string {
    const canonicalParams = JSON.stringify(params, Object.keys(params).sort());
    const hash = crypto.createHash("sha256").update(canonicalParams).digest("hex").slice(0, 16);
    return `${toolName}:${hash}`;
  }

  public evaluate(toolName: string, params: Record<string, unknown>): ToolGuardrailDecision {
    const lowerTool = toolName.toLowerCase();

    // 1. Check turn loop caps
    if (lowerTool.includes("search") || lowerTool.includes("browser")) {
      if (this.turnWebSearches >= this.config.maxWebSearchesPerTurn) {
        return {
          action: "block",
          code: "loop_cap_searches_exceeded",
          message: `Turn web search ceiling reached (${this.config.maxWebSearchesPerTurn}). Consolidate search strategy.`,
          toolName,
          count: this.turnWebSearches,
          signature: this.computeSignature(toolName, params),
          shouldHalt: true,
        };
      }
    }

    if (lowerTool.includes("subagent") || lowerTool.includes("delegate")) {
      if (this.turnSubagents >= this.config.maxSubagentsPerTurn) {
        return {
          action: "block",
          code: "loop_cap_subagents_exceeded",
          message: `Turn subagent spawning ceiling reached (${this.config.maxSubagentsPerTurn}). Consolidate execution.`,
          toolName,
          count: this.turnSubagents,
          signature: this.computeSignature(toolName, params),
          shouldHalt: true,
        };
      }
    }

    if (lowerTool.includes("write") || lowerTool.includes("edit") || lowerTool.includes("delete")) {
      if (this.turnMutations >= this.config.maxMutationsPerTurn) {
        return {
          action: "block",
          code: "loop_cap_mutations_exceeded",
          message: `Turn file mutation ceiling reached (${this.config.maxMutationsPerTurn}). Verify state before proceeding.`,
          toolName,
          count: this.turnMutations,
          signature: this.computeSignature(toolName, params),
          shouldHalt: true,
        };
      }
    }

    // 2. Check identical repeat calls
    const signature = this.computeSignature(toolName, params);
    const identicalCount = (this.callSignatures.get(signature) ?? 0) + 1;

    if (identicalCount >= this.config.maxIdenticalCallsBlockAfter) {
      return {
        action: "block",
        code: "identical_call_loop_detected",
        message: `Identical tool call ${toolName} repeated ${identicalCount} times with exact arguments. Halting duplicate call.`,
        toolName,
        count: identicalCount,
        signature,
        shouldHalt: true,
      };
    }

    if (identicalCount >= this.config.maxIdenticalCallsWarnAfter) {
      return {
        action: "warn",
        code: "identical_call_repeated",
        message: `Tool call ${toolName} has been executed ${identicalCount} times with identical arguments. Ensure fresh progress.`,
        toolName,
        count: identicalCount,
        signature,
        shouldHalt: false,
      };
    }

    // 3. Check tool failure streaks
    const failureCount = this.toolFailures.get(toolName) ?? 0;
    if (failureCount >= this.config.sameToolFailureHaltAfter) {
      return {
        action: "halt",
        code: "tool_failure_streak_halt",
        message: `Tool ${toolName} has failed ${failureCount} times consecutively. Halting execution loop for strategy reflection.`,
        toolName,
        count: failureCount,
        signature,
        shouldHalt: true,
      };
    }

    if (failureCount >= this.config.sameToolFailureWarnAfter) {
      return {
        action: "warn",
        code: "tool_failure_streak_warning",
        message: `Tool ${toolName} has failed ${failureCount} times consecutively. Consider alternative parameters or tools.`,
        toolName,
        count: failureCount,
        signature,
        shouldHalt: false,
      };
    }

    return {
      action: "allow",
      code: "allow",
      message: "Tool invocation permitted",
      toolName,
      count: identicalCount,
      signature,
      shouldHalt: false,
    };
  }

  public recordResult(toolName: string, params: Record<string, unknown>, success: boolean): void {
    const signature = this.computeSignature(toolName, params);
    const count = (this.callSignatures.get(signature) ?? 0) + 1;
    this.callSignatures.set(signature, count);

    const lowerTool = toolName.toLowerCase();
    if (lowerTool.includes("search") || lowerTool.includes("browser")) {
      this.turnWebSearches++;
    } else if (lowerTool.includes("subagent") || lowerTool.includes("delegate")) {
      this.turnSubagents++;
    } else if (lowerTool.includes("write") || lowerTool.includes("edit") || lowerTool.includes("delete")) {
      this.turnMutations++;
    }

    if (success) {
      this.toolFailures.delete(toolName);
    } else {
      const currentFailures = (this.toolFailures.get(toolName) ?? 0) + 1;
      this.toolFailures.set(toolName, currentFailures);
    }
  }

  public resetTurn(): void {
    this.turnWebSearches = 0;
    this.turnSubagents = 0;
    this.turnMutations = 0;
  }

  public clear(): void {
    this.callSignatures.clear();
    this.toolFailures.clear();
    this.resetTurn();
  }
}
