import test from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { McpClient } from "./client.js";
import { McpRegistry } from "./registry.js";

const mockMcpScript = `
const readline = require('readline');
const rl = readline.createInterface({ input: process.stdin });
rl.on('close', () => process.exit(0));
rl.on('line', (line) => {
  if (!line.trim()) return;
  try {
    const req = JSON.parse(line);
    if (req.method === 'initialize') {
      process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: req.id, result: { protocolVersion: '2024-11-05' } }) + '\\n');
    } else if (req.method === 'tools/list') {
      process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: req.id, result: { tools: [{ name: 'mock_echo', description: 'Echo back text' }] } }) + '\\n');
    } else if (req.method === 'tools/call') {
      process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: req.id, result: { content: [{ type: 'text', text: 'echoed: ' + (req.params?.arguments?.text || '') }] } }) + '\\n');
    }
  } catch (e) {
    // ignore
  }
});
`;

test("McpClient: connects over stdio, lists tools, and executes calls", async () => {
  const tmpScript = path.join(os.tmpdir(), `mock-mcp-${Date.now()}-1.cjs`);
  fs.writeFileSync(tmpScript, mockMcpScript, "utf-8");

  const client = new McpClient({
    id: "mock-server",
    command: process.execPath,
    args: [tmpScript],
  });

  try {
    await client.connect();

    const tools = await client.listTools();
    assert.equal(tools.length, 1);
    assert.equal(tools[0].name, "mock_echo");

    const callRes = await client.callTool("mock_echo", { text: "world" });
    assert.equal(callRes.content[0].text, "echoed: world");
  } finally {
    client.close();
    fs.rmSync(tmpScript, { force: true });
  }
});

test("McpRegistry: connects multi-servers and routes dynamic tool calls", async () => {
  const tmpScript = path.join(os.tmpdir(), `mock-mcp-${Date.now()}-2.cjs`);
  fs.writeFileSync(tmpScript, mockMcpScript, "utf-8");

  const registry = new McpRegistry();

  try {
    registry.registerServer({
      id: "server-a",
      command: process.execPath,
      args: [tmpScript],
    });

    await registry.connectAll();

    const tools = await registry.getAllTools();
    assert.equal(tools.length, 1);
    assert.equal(tools[0].name, "mock_echo");
    assert.equal(tools[0].serverId, "server-a");

    const result = await registry.callTool("mock_echo", { text: "agdi" });
    assert.equal(result.content[0].text, "echoed: agdi");
  } finally {
    registry.closeAll();
    fs.rmSync(tmpScript, { force: true });
  }
});
