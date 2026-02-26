#!/usr/bin/env node
// lint-ceiling.mjs — Freeze oxlint debt at a known ceiling.
// Runs oxlint normally; if error count ≤ ceiling, exits 0.
// If errors increase above ceiling, exits 1 (new violations introduced).
// Ceiling is stored in .oxlint-ceiling.json.

import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const CEILING_FILE = resolve(import.meta.dirname, "..", ".oxlint-ceiling.json");

let ceiling;
try {
  const raw = readFileSync(CEILING_FILE, "utf8");
  ceiling = JSON.parse(raw).maxErrors;
} catch {
  console.error("❌ Missing .oxlint-ceiling.json — run: pnpm lint:freeze");
  process.exit(1);
}

let output = "";
let exitCode = 0;
try {
  output = execSync("pnpm exec oxlint --type-aware", {
    cwd: resolve(import.meta.dirname, ".."),
    stdio: ["pipe", "pipe", "pipe"],
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
  });
} catch (err) {
  exitCode = err.status ?? 1;
  output = (err.stdout ?? "") + (err.stderr ?? "");
}

// Parse "Found N warnings and M errors."
const m = output.match(/Found \d+ warnings? and (\d+) errors?/);
const errorCount = m ? parseInt(m[1], 10) : 0;

if (errorCount === 0 && exitCode === 0) {
  console.log("✅ oxlint clean (0 errors)");
  process.exit(0);
}

if (errorCount > ceiling) {
  console.error(
    `❌ oxlint: ${errorCount} errors (ceiling: ${ceiling}). New violations introduced!`,
  );
  console.error(output);
  process.exit(1);
}

if (errorCount < ceiling) {
  console.log(
    `✅ oxlint: ${errorCount} errors (ceiling: ${ceiling}). Debt decreased — update .oxlint-ceiling.json!`,
  );
} else {
  console.log(`✅ oxlint: ${errorCount} errors (at ceiling: ${ceiling}). No new violations.`);
}

process.exit(0);
