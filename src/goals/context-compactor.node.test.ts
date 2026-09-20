import test from "node:test";
import assert from "node:assert/strict";
import { ContextCompactor, type ContextMessage } from "./context-compactor.js";

test("ContextCompactor: prunes older tool outputs while keeping recent intact", () => {
  const compactor = new ContextCompactor(10, 2); // max 10 lines, keep 2 recent tool outputs intact

  const longOutput = Array.from({ length: 50 }, (_, i) => `log line ${i + 1}`).join("\n");

  const messages: ContextMessage[] = [
    { role: "user", content: "Run tasks" },
    { role: "tool", content: longOutput, toolCallId: "call-1" }, // should be pruned
    { role: "assistant", content: "Checking next" },
    { role: "tool", content: longOutput, toolCallId: "call-2" }, // recent 2 -> untouched
    { role: "assistant", content: "Almost done" },
    { role: "tool", content: longOutput, toolCallId: "call-3" }, // recent 1 -> untouched
  ];

  const pruned = compactor.pruneToolOutputs(messages, { maxOutputLines: 10, keepRecentCount: 2 });

  // Recent two tool calls untouched
  assert.equal(pruned[5].content, longOutput);
  assert.equal(pruned[3].content, longOutput);

  // Old tool call pruned
  assert.ok(pruned[1].content.includes("[... Agdi Context Compactor:"));
  assert.ok(pruned[1].content.includes("lines pruned"));
  assert.ok(pruned[1].content.startsWith("log line 1"));
  assert.ok(pruned[1].content.endsWith("log line 50"));
});

test("ContextCompactor: partitions prompt cache prefix correctly", () => {
  const compactor = new ContextCompactor();

  const systemPrompt = "You are Agdi, the autonomous runtime.";
  const toolSchemas = [{ name: "exec", description: "run command" }];
  const history: ContextMessage[] = [
    { role: "user", content: "Build goal" },
    { role: "assistant", content: "Starting execution" },
  ];

  const partition = compactor.partitionPromptCache(systemPrompt, toolSchemas, history);

  assert.ok(partition.prefixHash.length === 16);
  assert.equal(partition.staticPrefix.systemPrompt, systemPrompt);
  assert.equal(partition.dynamicTail.length, 2);

  // Identical prefix yields identical hash
  const partition2 = compactor.partitionPromptCache(systemPrompt, toolSchemas, []);
  assert.equal(partition.prefixHash, partition2.prefixHash);
});
