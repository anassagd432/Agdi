import test from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { LearningEngine } from "./engine.js";

test("LearningEngine: learns instincts from completed goals", () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "agdi-learning-test-"));
  try {
    const engine = new LearningEngine(tmpDir);

    const instinct = engine.learnFromGoal({
      goalId: "goal-1",
      goalTitle: "Fix Windows Schannel SSL Hang",
      trigger: "Windows curl hangs on github.com",
      solutionPattern: "CRYPT_E_NO_REVOCATION_CHECK error",
      concreteAction: "Add --ssl-no-revoke or -c http.schannelCheckRevoke=false",
      tags: ["Windows", "SSL", "Network"],
      scope: "global",
    });

    assert.ok(instinct.id.startsWith("instinct-"));
    assert.equal(instinct.successes, 1);
    assert.equal(instinct.confidence, 0.6);
    assert.equal(instinct.scope, "global");

    // Reinforce on repeated success
    const reinforced = engine.reinforce(instinct.id, true);
    assert.equal(reinforced?.successes, 2);
    assert.ok(reinforced?.confidence && reinforced.confidence > 0.6);

    // Search
    const matches = engine.findMatching("Schannel");
    assert.equal(matches.length, 1);
    assert.equal(matches[0].id, instinct.id);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test("LearningEngine: synthesizes valid agentskills.io compliant skills", () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "agdi-learning-test-"));
  try {
    const engine = new LearningEngine(tmpDir);

    const instinct = engine.learnFromGoal({
      goalId: "goal-2",
      goalTitle: "Optimize Vitest Runner",
      trigger: "optimize vitest concurrency",
      solutionPattern: "High CPU contention on multi-core test runs",
      concreteAction: "vitest --pool=threads --maxForks=4",
      tags: ["Testing", "Optimization"],
    });

    const skill = engine.synthesizeSkill(instinct);

    assert.ok(skill.skillName.startsWith("agdi-"));
    assert.equal(skill.fileName, "SKILL.md");

    // Assert agentskills.io frontmatter format
    assert.ok(skill.content.includes("name: agdi-"));
    assert.ok(skill.content.includes("author: Agdi"));
    assert.ok(skill.content.includes("## When to Use"));
    assert.ok(skill.content.includes("## Execution Strategy"));

    // Check description length constraint (<=60 chars and ends with period)
    const descMatch = skill.content.match(/description:\s*"([^"]+)"/);
    assert.ok(descMatch);
    const desc = descMatch[1];
    assert.ok(desc.length <= 60, `Description too long: ${desc.length}`);
    assert.ok(desc.endsWith("."), "Description must end with a period.");
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
