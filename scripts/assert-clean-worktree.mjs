#!/usr/bin/env node
/**
 * Assert that the working tree is clean.
 *
 * A release candidate must be reproducible from a commit and its lockfile alone.
 * Any staged, unstaged, or untracked path means the tree under test is not the
 * tree that would be published, so this gate fails closed.
 *
 * It deliberately covers all three states. `git diff --exit-code` alone misses
 * untracked files, which is how a new gate script can pass locally and be absent
 * from CI in the same commit.
 *
 * Usage:
 *   node scripts/assert-clean-worktree.mjs
 *   node scripts/assert-clean-worktree.mjs --json
 *   node scripts/assert-clean-worktree.mjs --allow-untracked .workbuddy-ai/
 *   node scripts/assert-clean-worktree.mjs --allow-untracked .tmp/ --allow-untracked .rmguard.mjs
 *
 * `--allow-untracked <prefix>` is repeatable and matches a path prefix on
 * untracked entries only. It exists so an operator can run this locally without
 * their tooling state tripping the gate. CI passes no allowances.
 *
 * Exit codes: 0 = clean, 1 = dirty or the check could not run.
 */

import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const STATUS_LABELS = new Map([
  ["M", "modified"],
  ["A", "added"],
  ["D", "deleted"],
  ["R", "renamed"],
  ["C", "copied"],
  ["U", "unmerged"],
  ["?", "untracked"],
  ["!", "ignored"],
]);

function parseArgs(argv) {
  const allowUntracked = [];
  let asJson = false;
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--json") {
      asJson = true;
      continue;
    }
    if (arg === "--allow-untracked") {
      const value = argv[index + 1];
      if (!value) {
        throw new Error("--allow-untracked requires a path prefix");
      }
      allowUntracked.push(value.split(path.sep).join("/"));
      index += 1;
      continue;
    }
    throw new Error(`unknown argument: ${arg}`);
  }
  return { asJson, allowUntracked };
}

/**
 * Read `git status --porcelain` and normalise it.
 *
 * Porcelain v1 emits `XY <path>` with a literal space separator, and renames as
 * `XY <old> -> <new>`. Both index and worktree columns are reported so a staged
 * change is never mistaken for a clean tree.
 */
function collectEntries() {
  const raw = execFileSync("git", ["status", "--porcelain", "--untracked-files=all"], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });

  const entries = [];
  for (const line of raw.split("\n")) {
    if (line.trim() === "") {
      continue;
    }
    const indexStatus = line[0];
    const worktreeStatus = line[1];
    let filePath = line.slice(3);
    if (filePath.includes(" -> ")) {
      filePath = filePath.slice(filePath.indexOf(" -> ") + 4);
    }
    entries.push({
      indexStatus,
      worktreeStatus,
      path: filePath.split(path.sep).join("/"),
    });
  }
  return entries;
}

function describe(entry) {
  const labels = [];
  if (entry.indexStatus !== " " && entry.indexStatus !== "?") {
    labels.push(`staged:${STATUS_LABELS.get(entry.indexStatus) ?? entry.indexStatus}`);
  }
  if (entry.worktreeStatus !== " ") {
    labels.push(`worktree:${STATUS_LABELS.get(entry.worktreeStatus) ?? entry.worktreeStatus}`);
  }
  if (entry.indexStatus === "?" && entry.worktreeStatus === "?") {
    labels.push("untracked");
  }
  return labels.join(",") || "changed";
}

function main() {
  const { asJson, allowUntracked } = parseArgs(process.argv.slice(2));
  const all = collectEntries();

  const allowed = [];
  const blocking = [];
  for (const entry of all) {
    const isUntracked = entry.indexStatus === "?" && entry.worktreeStatus === "?";
    const permit =
      isUntracked && allowUntracked.some((prefix) => entry.path.startsWith(prefix));
    (permit ? allowed : blocking).push(entry);
  }

  const counts = blocking.reduce((accumulator, entry) => {
    const key = describe(entry).split(",").pop();
    accumulator[key] = (accumulator[key] ?? 0) + 1;
    return accumulator;
  }, {});

  if (asJson) {
    console.log(
      JSON.stringify(
        {
          clean: blocking.length === 0,
          repoRoot: REPO_ROOT,
          blockingCount: blocking.length,
          allowedCount: allowed.length,
          counts,
          blocking: blocking.map((entry) => ({ path: entry.path, status: describe(entry) })),
          allowed: allowed.map((entry) => ({ path: entry.path, status: describe(entry) })),
        },
        null,
        2,
      ),
    );
  } else if (blocking.length === 0) {
    console.log("Worktree is clean.");
    if (allowed.length > 0) {
      console.log(`  ${allowed.length} allowed untracked path(s) ignored.`);
    }
  } else {
    console.error("Worktree is not clean:");
    for (const entry of blocking.slice(0, 40)) {
      console.error(`- ${entry.path} (${describe(entry)})`);
    }
    if (blocking.length > 40) {
      console.error(`- ... and ${blocking.length - 40} more`);
    }
    console.error("");
    console.error(
      "A release candidate must be reproducible from a commit and its lockfile alone. " +
        "Commit, revert, or gitignore the paths above before continuing.",
    );
  }

  if (blocking.length > 0) {
    process.exitCode = 1;
  }
}

try {
  main();
} catch (error) {
  console.error(`assert-clean-worktree: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
