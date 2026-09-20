import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import type { Goal, ProofToken, VerificationKind } from "./types.js";

const DEFAULT_MAX_OUTPUT_SUMMARY_CHARS = 2000;

export interface RecordProofParams {
  command: string;
  exitCode: number;
  output: string;
  goalId?: string;
  durationMs?: number;
  scope?: string;
}

export interface VerificationInvariantsResult {
  verified: boolean;
  missingProofs: string[];
  passedProofs: ProofToken[];
}

export class VerificationLedger {
  private readonly storagePath: string;
  private proofs: ProofToken[] = [];

  constructor(stateDir?: string) {
    const baseDir = stateDir ?? path.join(process.cwd(), ".agdi", "goals");
    this.storagePath = path.join(baseDir, "verification-ledger.json");
    this.load();
  }

  private load(): void {
    if (!fs.existsSync(this.storagePath)) {
      this.proofs = [];
      return;
    }
    try {
      const raw = fs.readFileSync(this.storagePath, "utf-8");
      this.proofs = JSON.parse(raw) as ProofToken[];
    } catch {
      this.proofs = [];
    }
  }

  private save(): void {
    try {
      const dir = path.dirname(this.storagePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.storagePath, JSON.stringify(this.proofs, null, 2), "utf-8");
    } catch (err) {
      console.error("[VerificationLedger] Failed to save verification ledger:", err);
    }
  }

  public classifyCommand(rawCommand: string): { kind: VerificationKind; canonical: string; scope: string } {
    const trimmed = rawCommand.trim();
    const lower = trimmed.toLowerCase();

    // Typecheck
    if (lower.includes("typecheck") || lower.includes("tsc") || lower.includes("mypy") || lower.includes("pyright")) {
      return { kind: "typecheck", canonical: "typecheck", scope: "workspace" };
    }

    // Linter
    if (lower.includes("eslint") || lower.includes("ruff") || lower.includes("lint")) {
      return { kind: "lint", canonical: "lint", scope: "workspace" };
    }

    // Formatter
    if (lower.includes("format") || lower.includes("prettier") || lower.includes("fmt")) {
      return { kind: "format", canonical: "format", scope: "workspace" };
    }

    // Builder
    if (lower.includes("build") || lower.includes("compile")) {
      return { kind: "build", canonical: "build", scope: "artifacts" };
    }

    // Default to test
    return { kind: "test", canonical: "test", scope: "unit" };
  }

  private parseMetrics(output: string): { passedCount?: number; failedCount?: number } {
    const metrics: { passedCount?: number; failedCount?: number } = {};

    // Match e.g. "4 passed", "2 failed", "Tests: 12 passed"
    const passedMatch = output.match(/(\d+)\s*(?:passed|succeeded|passing)/i);
    if (passedMatch) {
      metrics.passedCount = Number.parseInt(passedMatch[1], 10);
    }

    const failedMatch = output.match(/(\d+)\s*(?:failed|failing|errors)/i);
    if (failedMatch) {
      metrics.failedCount = Number.parseInt(failedMatch[1], 10);
    }

    return metrics;
  }

  public recordProof(params: RecordProofParams): ProofToken {
    const { kind, canonical, scope } = this.classifyCommand(params.command);
    const parsedMetrics = this.parseMetrics(params.output);
    const summary = params.output.slice(-DEFAULT_MAX_OUTPUT_SUMMARY_CHARS).trim();

    const evidenceHash = crypto
      .createHash("sha256")
      .update(params.command)
      .update(params.exitCode.toString())
      .update(params.output)
      .digest("hex");

    const token: ProofToken = {
      id: `proof-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`,
      goalId: params.goalId,
      command: params.command,
      canonicalCommand: canonical,
      kind,
      scope: params.scope ?? scope,
      status: params.exitCode === 0 ? "passed" : "failed",
      exitCode: params.exitCode,
      outputSummary: summary,
      evidenceHash,
      metrics: {
        ...parsedMetrics,
        durationMs: params.durationMs,
      },
      timestamp: Date.now(),
    };

    this.proofs.push(token);
    this.save();
    return token;
  }

  public getProofs(): ProofToken[] {
    return [...this.proofs];
  }

  public getProofsForGoal(goalId: string): ProofToken[] {
    return this.proofs.filter((p) => p.goalId === goalId);
  }

  public hasPassingProof(kind: VerificationKind, goalId?: string): boolean {
    return this.proofs.some((p) => {
      const matchKind = p.kind === kind && p.status === "passed";
      if (!matchKind) return false;
      if (goalId && p.goalId !== goalId) return false;
      return true;
    });
  }

  public verifyGoalInvariants(goal: Goal): VerificationInvariantsResult {
    const criteria = goal.validationCriteria ?? [];
    const missingProofs: string[] = [];
    const passedProofs: ProofToken[] = [];

    const goalProofs = this.getProofsForGoal(goal.id);

    // If explicit criteria exist, check each kind
    for (const criterion of criteria) {
      const canonicalKind = criterion.toLowerCase().trim() as VerificationKind;
      const matchingProof = goalProofs.find((p) => p.kind === canonicalKind && p.status === "passed");

      if (matchingProof) {
        passedProofs.push(matchingProof);
      } else {
        missingProofs.push(criterion);
      }
    }

    return {
      verified: missingProofs.length === 0,
      missingProofs,
      passedProofs,
    };
  }

  public clear(): void {
    this.proofs = [];
    this.save();
  }
}
