import test from "node:test";
import assert from "node:assert/strict";
import { ToolGuardrailController } from "./guardrails.js";

test("ToolGuardrailController: detects identical repeat tool calls", () => {
  const guard = new ToolGuardrailController({
    maxIdenticalCallsWarnAfter: 2,
    maxIdenticalCallsBlockAfter: 3,
  });

  const tool = "read_file";
  const params = { path: "src/index.ts" };

  // 1st invocation -> allow
  let decision = guard.evaluate(tool, params);
  assert.equal(decision.action, "allow");
  guard.recordResult(tool, params, true);

  // 2nd invocation -> warn
  decision = guard.evaluate(tool, params);
  assert.equal(decision.action, "warn");
  assert.equal(decision.code, "identical_call_repeated");
  guard.recordResult(tool, params, true);

  // 3rd invocation -> block
  decision = guard.evaluate(tool, params);
  assert.equal(decision.action, "block");
  assert.equal(decision.code, "identical_call_loop_detected");
  assert.equal(decision.shouldHalt, true);
});

test("ToolGuardrailController: halts on consecutive failure streaks", () => {
  const guard = new ToolGuardrailController({
    sameToolFailureWarnAfter: 2,
    sameToolFailureHaltAfter: 3,
  });

  const tool = "compile_target";

  guard.recordResult(tool, { target: "arm64" }, false);
  let decision = guard.evaluate(tool, { target: "x86" });
  assert.equal(decision.action, "allow");

  guard.recordResult(tool, { target: "x86" }, false);
  decision = guard.evaluate(tool, { target: "riscv" });
  assert.equal(decision.action, "warn");
  assert.equal(decision.code, "tool_failure_streak_warning");

  guard.recordResult(tool, { target: "riscv" }, false);
  decision = guard.evaluate(tool, { target: "mips" });
  assert.equal(decision.action, "halt");
  assert.equal(decision.code, "tool_failure_streak_halt");
  assert.equal(decision.shouldHalt, true);

  // Success resets failure count
  guard.recordResult(tool, { target: "mips" }, true);
  decision = guard.evaluate(tool, { target: "x64" });
  assert.equal(decision.action, "allow");
});

test("ToolGuardrailController: enforces turn loop caps", () => {
  const guard = new ToolGuardrailController({
    maxWebSearchesPerTurn: 2,
  });

  assert.equal(guard.evaluate("web_search", { q: "test 1" }).action, "allow");
  guard.recordResult("web_search", { q: "test 1" }, true);

  assert.equal(guard.evaluate("web_search", { q: "test 2" }).action, "allow");
  guard.recordResult("web_search", { q: "test 2" }, true);

  // 3rd search in turn exceeds cap
  const decision = guard.evaluate("web_search", { q: "test 3" });
  assert.equal(decision.action, "block");
  assert.equal(decision.code, "loop_cap_searches_exceeded");

  // Resetting turn clears the cap
  guard.resetTurn();
  assert.equal(guard.evaluate("web_search", { q: "test 3" }).action, "allow");
});
