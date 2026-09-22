#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const targets = [
  "README.md",
  "VISION.md",
  "ui/index.html",
  "ui/package.json",
  "ui/e2e/dashboard.spec.ts",
  "ui/src/ui/components/dashboard-header.ts",
  "src/acp/client.ts",
  "src/acp/translator.ts",
  "src/acp/types.ts",
  "src/cli/browser-cli-actions-input/register.files-downloads.ts",
  "src/cli/browser-cli.ts",
  "src/cli/completion-cli.ts",
  "src/cli/docs-cli.ts",
  "src/cli/gateway-cli/dev.ts",
  "src/cli/help-format.ts",
  "src/cli/mcp-cli.ts",
  "src/cli/nodes-cli/register.canvas.ts",
  "src/cli/nodes-cli/register.push.ts",
  "src/cli/plugins-cli.ts",
  "src/cli/program/core-command-descriptors.ts",
  "src/cli/program/command-registry.ts",
  "src/cli/program/help.ts",
  "src/cli/program/register.agent.ts",
  "src/cli/program/register.backup.ts",
  "src/cli/program/register.onboard.ts",
  "src/cli/program/register.setup.ts",
  "src/cli/qr-cli.ts",
  "src/cli/security-cli.ts",
  "src/cli/program/register.subclis.ts",
  "src/cli/program/subcli-descriptors.ts",
  "src/cli/tagline.ts",
  "src/cli/update-cli.ts",
  "src/cli/update-cli/status.ts",
  "src/cli/update-cli/update-command.ts",
  "src/cli/webhooks-cli.ts",
  "src/commands/agents.commands.add.ts",
  "src/commands/backup-shared.ts",
  "src/commands/chutes-oauth.ts",
  "src/commands/configure.gateway.ts",
  "src/commands/configure.wizard.ts",
  "src/commands/dashboard.ts",
  "src/commands/doctor-gateway-services.ts",
  "src/commands/doctor-update.ts",
  "src/commands/doctor.ts",
  "src/commands/doctor-browser.ts",
  "src/commands/onboard-remote.ts",
  "src/commands/onboard-search.ts",
  "src/commands/onboard.ts",
  "src/commands/status-all/report-lines.ts",
  "src/commands/status.command.ts",
  "src/wizard/setup.ts",
  "src/wizard/setup.finalize.ts",
  "src/wizard/setup.gateway-config.ts",
  "scripts/changelog-to-html.sh",
];

// Each negated class excludes `\n` so a match is confined to a single line.
//
// Without that exclusion the class admits newlines, so the engine pairs an
// unrelated opening quote with the next quote anywhere later in the file. On
// 2026-09-22 that produced a 42-line "string literal" starting at the quote in
// `align="center"` on README.md line 1 and ending inside a Mermaid block, and
// reported the violation against line 1 while the actual `OpenClaw` text sat on
// line 25. The label is "string literal", and a string literal that this check
// cares about is a single-line quoted token (for example a package id, a
// service name, or a compatibility shim name), so line-bounding the match is a
// correctness fix rather than a relaxation: a quoted `"OpenClaw"` on one line is
// still caught. Prose mentions outside quotes, such as the attribution link in
// README.md, are deliberately not this check's concern.
const forbiddenPatterns = [
  {
    label: "OpenClaw string literal",
    pattern:
      /"(?:\\.|[^"\\\n])*\bOpenClaw\b(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*\bOpenClaw\b(?:\\.|[^'\\\n])*'|`(?:\\.|[^`\\\n])*\bOpenClaw\b(?:\\.|[^`\\\n])*`/g,
  },
  { label: "openclaw.ai", pattern: /https:\/\/openclaw\.ai\b/g },
];

const allowedSnippets = ["# OpenClaw Completion"];

function getLineNumber(content, index) {
  let line = 1;
  for (let i = 0; i < index; i += 1) {
    if (content.charCodeAt(i) === 10) {
      line += 1;
    }
  }
  return line;
}

const violations = [];

for (const relativePath of targets) {
  const fullPath = path.join(repoRoot, relativePath);
  let content;
  try {
    content = await fs.readFile(fullPath, "utf8");
  } catch {
    continue;
  }

  for (const entry of forbiddenPatterns) {
    entry.pattern.lastIndex = 0;
    for (const match of content.matchAll(entry.pattern)) {
      if (allowedSnippets.some((snippet) => match[0].includes(snippet))) {
        continue;
      }
      const index = match.index ?? 0;
      violations.push({
        path: relativePath,
        line: getLineNumber(content, index),
        label: entry.label,
      });
    }
  }
}

if (violations.length > 0) {
  console.error("Public branding leaks detected:");
  for (const violation of violations) {
    console.error(`- ${violation.path}:${violation.line} -> ${violation.label}`);
  }
  process.exit(1);
}

console.log("Public branding check passed.");
