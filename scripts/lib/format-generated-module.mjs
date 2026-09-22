import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/**
 * Locate the locally installed Oxfmt binary.
 *
 * The previous version refused the direct binary on Windows
 * (`process.platform !== "win32"`), so it always spawned bare `pnpm`. On any host
 * where `pnpm` is not on `PATH` — including this repository's own documented
 * Windows workflow, which invokes it as
 * `npm exec --yes --package pnpm@10.32.1 -- pnpm` — `spawnSync` returned a
 * non-zero status and the caller silently received *unformatted* source.
 *
 * That produced a flapping gate. A generator run through plain `node` wrote
 * unformatted output and then agreed with itself, while the same generator run
 * through `pnpm` formatted its output and reported the committed baseline as
 * stale. Measured on 2026-09-22: `node --import tsx scripts/generate-base-config-schema.ts --check`
 * exited 0 while `pnpm check:base-config-schema` exited 1, against the same file.
 *
 * npm installs `oxfmt`, `oxfmt.cmd`, and `oxfmt.ps1` on Windows; the `.cmd` shim is
 * the directly spawnable one.
 */
function resolveFormatter(repoRoot) {
  const binDir = path.join(repoRoot, "node_modules", ".bin");
  const names = process.platform === "win32" ? ["oxfmt.cmd", "oxfmt.exe", "oxfmt"] : ["oxfmt"];
  for (const name of names) {
    const candidate = path.join(binDir, name);
    if (fs.existsSync(candidate)) {
      return { command: candidate, prefixArgs: [] };
    }
  }
  return { command: "pnpm", prefixArgs: ["exec", "oxfmt"] };
}

export function formatGeneratedModule(source, { repoRoot, outputPath, errorLabel }) {
  const resolvedRepoRoot = path.resolve(repoRoot);
  const resolvedOutputPath = path.resolve(
    resolvedRepoRoot,
    path.isAbsolute(outputPath) ? path.relative(resolvedRepoRoot, outputPath) : outputPath,
  );
  const { command, prefixArgs } = resolveFormatter(resolvedRepoRoot);
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "openclaw-generated-format-"));
  const tempOutputPath = path.join(tempDir, path.basename(resolvedOutputPath));

  // Node 22 refuses to spawn a `.cmd` file without a shell, and `shell: true`
  // joins command and args without quoting, so quote any value that may contain
  // a space.
  const useShell = process.platform === "win32";
  const quoteForShell = (value) => (useShell ? `"${value}"` : value);
  const args = [...prefixArgs, "--write", quoteForShell(tempOutputPath)];

  try {
    fs.writeFileSync(tempOutputPath, source, "utf8");
    const formatter = spawnSync(quoteForShell(command), args, {
      cwd: resolvedRepoRoot,
      encoding: "utf8",
      ...(useShell ? { shell: true } : {}),
    });
    if (formatter.status !== 0) {
      // Fail closed. Returning `source` here yielded unformatted output with no
      // signal at all, which is how the generated-baseline gates came to
      // disagree with themselves depending on how they were invoked. A
      // generated artifact must be formatted before it is compared or written.
      throw new Error(
        `${errorLabel}: could not run the formatter (${command} ${args.join(" ")}). ` +
          `status=${formatter.status ?? "null"} signal=${formatter.signal ?? "none"} ` +
          `error=${formatter.error?.code ?? "none"}. ` +
          `stderr: ${(formatter.stderr ?? "").trim() || "(empty)"}`,
      );
    }
    return fs.readFileSync(tempOutputPath, "utf8");
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}
