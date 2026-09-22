import assert from "node:assert/strict";
import test from "node:test";
import { parseBoundedArgs, runBoundedCommand } from "./run-bounded-command.mjs";

test("parseBoundedArgs reads the timeout and command", () => {
  assert.deepEqual(parseBoundedArgs(["--timeout-ms", "250", "--", "node", "-e", "process.exit(2)"]), {
    timeoutMs: 250,
    command: ["node", "-e", "process.exit(2)"],
  });
});

test("propagates a nonzero child status", async () => {
  const result = await runBoundedCommand({
    timeoutMs: 5_000,
    command: [process.execPath, "-e", "process.exit(2)"],
  });
  assert.equal(result.timedOut, false);
  assert.equal(result.code, 2);
});

test("stops only the spawned child when the budget is exceeded", async () => {
  const result = await runBoundedCommand({
    timeoutMs: 200,
    command: [process.execPath, "-e", "setTimeout(() => {}, 30_000)"],
  });
  assert.equal(result.timedOut, true);
  assert.equal(result.code, 124);
  assert.equal(typeof result.pid, "number");
});
