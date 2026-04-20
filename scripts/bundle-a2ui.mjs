#!/usr/bin/env node

import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const hashFile = path.join(rootDir, "src", "canvas-host", "a2ui", ".bundle.hash");
const outputFile = path.join(rootDir, "src", "canvas-host", "a2ui", "a2ui.bundle.js");
const rendererDir = path.join(rootDir, "vendor", "a2ui", "renderers", "lit");
const appDir = path.join(rootDir, "apps", "shared", "OpenClawKit", "Tools", "CanvasA2UI");

async function exists(targetPath) {
  try {
    await fs.stat(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function walk(entryPath, out) {
  const stat = await fs.stat(entryPath);
  if (stat.isDirectory()) {
    for (const entry of await fs.readdir(entryPath)) {
      await walk(path.join(entryPath, entry), out);
    }
    return;
  }
  out.push(entryPath);
}

async function computeHash(inputs) {
  const files = [];
  for (const input of inputs) {
    await walk(input, files);
  }
  files.sort((left, right) =>
    left.split(path.sep).join("/").localeCompare(right.split(path.sep).join("/")),
  );

  const hash = createHash("sha256");
  for (const filePath of files) {
    hash.update(path.relative(rootDir, filePath).split(path.sep).join("/"));
    hash.update("\0");
    hash.update(await fs.readFile(filePath));
    hash.update("\0");
  }
  return hash.digest("hex");
}

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: rootDir,
    stdio: "inherit",
    shell: process.platform === "win32" && command.toLowerCase().endsWith(".cmd"),
  });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed`);
  }
}

async function main() {
  const rendererPresent = await exists(rendererDir);
  const appPresent = await exists(appDir);
  const outputPresent = await exists(outputFile);

  if (!rendererPresent || !appPresent) {
    if (outputPresent) {
      console.log("A2UI sources missing; keeping checked-in prebuilt bundle.");
      return;
    }
    throw new Error(
      `A2UI sources missing and no prebuilt bundle found at: ${path.relative(rootDir, outputFile)}`,
    );
  }

  const inputs = [path.join(rootDir, "package.json"), path.join(rootDir, "pnpm-lock.yaml"), rendererDir, appDir];
  const currentHash = await computeHash(inputs);
  const previousHash = (await exists(hashFile)) ? (await fs.readFile(hashFile, "utf8")).trim() : "";
  if (previousHash === currentHash && outputPresent) {
    console.log("A2UI bundle up to date; skipping.");
    return;
  }

  run("pnpm", ["-s", "exec", "tsc", "-p", path.join(rendererDir, "tsconfig.json")]);
  run("pnpm", ["-s", "exec", "rolldown", "-c", path.join(appDir, "rolldown.config.mjs")]);
  await fs.writeFile(hashFile, `${currentHash}\n`, "utf8");
}

main().catch((error) => {
  console.error("A2UI bundling failed. Re-run with: pnpm canvas:a2ui:bundle");
  console.error("If this persists, verify pnpm deps and try again.");
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
