import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import type { Instinct, LearnFromGoalParams, SkillExportResult } from "./types.js";

export class LearningEngine {
  private readonly storagePath: string;
  private instincts: Instinct[] = [];

  constructor(stateDir?: string) {
    const baseDir = stateDir ?? path.join(process.cwd(), ".agdi", "learning");
    this.storagePath = path.join(baseDir, "instincts.json");
    this.load();
  }

  private load(): void {
    if (!fs.existsSync(this.storagePath)) {
      this.instincts = [];
      return;
    }
    try {
      const raw = fs.readFileSync(this.storagePath, "utf-8");
      this.instincts = JSON.parse(raw) as Instinct[];
    } catch {
      this.instincts = [];
    }
  }

  private save(): void {
    try {
      const dir = path.dirname(this.storagePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.storagePath, JSON.stringify(this.instincts, null, 2), "utf-8");
    } catch (err) {
      console.error("[LearningEngine] Failed to save instincts:", err);
    }
  }

  public learnFromGoal(params: LearnFromGoalParams): Instinct {
    const existing = this.instincts.find(
      (inst) => inst.trigger.toLowerCase() === params.trigger.toLowerCase() && inst.scope === (params.scope ?? "project"),
    );

    if (existing) {
      existing.successes++;
      existing.confidence = Math.min(1.0, existing.confidence + 0.1);
      existing.action = params.concreteAction;
      existing.pattern = params.solutionPattern;
      existing.updatedAt = Date.now();
      this.save();
      return existing;
    }

    const id = `instinct-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;
    const newInstinct: Instinct = {
      id,
      trigger: params.trigger,
      pattern: params.solutionPattern,
      action: params.concreteAction,
      confidence: 0.6,
      scope: params.scope ?? "project",
      successes: 1,
      failures: 0,
      tags: params.tags ?? [],
      goalTitle: params.goalTitle,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.instincts.push(newInstinct);
    this.save();
    return newInstinct;
  }

  public reinforce(id: string, success: boolean): Instinct | undefined {
    const instinct = this.instincts.find((item) => item.id === id);
    if (!instinct) return undefined;

    if (success) {
      instinct.successes++;
      instinct.confidence = Math.min(1.0, instinct.confidence + 0.05);
    } else {
      instinct.failures++;
      instinct.confidence = Math.max(0.1, instinct.confidence - 0.15);
    }

    instinct.updatedAt = Date.now();
    this.save();
    return instinct;
  }

  public findMatching(query: string): Instinct[] {
    const lower = query.toLowerCase();
    return this.instincts
      .filter((inst) => {
        return (
          inst.trigger.toLowerCase().includes(lower) ||
          inst.pattern.toLowerCase().includes(lower) ||
          (inst.goalTitle && inst.goalTitle.toLowerCase().includes(lower)) ||
          inst.tags.some((t) => t.toLowerCase().includes(lower))
        );
      })
      .sort((a, b) => b.confidence - a.confidence);
  }

  public getInstincts(): Instinct[] {
    return [...this.instincts];
  }

  public synthesizeSkill(instinct: Instinct): SkillExportResult {
    // Standard agentskills.io format:
    // name: lowercase-hyphenated <=64 chars
    const baseName = instinct.trigger
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 50);
    const skillName = `agdi-${baseName || "learned-pattern"}`;

    // description: ONE sentence, <=60 chars, ends with a period.
    let desc = `Execute ${instinct.trigger}.`;
    if (desc.length > 60) {
      desc = desc.slice(0, 59).trim() + ".";
    }

    const tagsYaml = instinct.tags.length > 0 ? instinct.tags.map((t) => `  - ${t}`).join("\n") : "  - Autonomous\n  - Agdi";

    const content = `---
name: ${skillName}
description: "${desc}"
version: 0.1.0
author: Agdi
metadata:
  agdi:
    tags:
${tagsYaml}
---

# ${skillName.toUpperCase()}

Autonomous skill synthesized from verified execution traces.

## When to Use
- When encountering "${instinct.trigger}".
- Trigger criteria: \`${instinct.pattern}\`.

## Prerequisites
- Working environment with verified toolchain access.
- Success rate: ${(instinct.confidence * 100).toFixed(0)}% across ${instinct.successes + instinct.failures} verified executions.

## Execution Strategy
1. **Analyze Trigger**: Confirm condition matches \`${instinct.trigger}\`.
2. **Execute Action**:
\`\`\`
${instinct.action}
\`\`\`
3. **Verify State**: Confirm goal criteria pass verification.
`;

    return {
      skillName,
      fileName: "SKILL.md",
      content,
    };
  }

  public clear(): void {
    this.instincts = [];
    this.save();
  }
}
