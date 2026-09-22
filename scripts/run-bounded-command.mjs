import { spawn } from "node:child_process";

const DEFAULT_TIMEOUT_MS = 180_000;

function usage() {
  console.error(
    "usage: node scripts/run-bounded-command.mjs --timeout-ms <ms> -- <command> [args...]",
  );
}

export function parseBoundedArgs(argv) {
  let timeoutMs = DEFAULT_TIMEOUT_MS;
  const separator = argv.indexOf("--");
  if (separator === -1) {
    throw new Error("missing -- before the command");
  }
  const options = argv.slice(0, separator);
  const command = argv.slice(separator + 1);
  for (let index = 0; index < options.length; index += 1) {
    const option = options[index];
    if (option === "--timeout-ms") {
      const value = options[index + 1];
      timeoutMs = Number(value);
      if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
        throw new Error(`invalid --timeout-ms value: ${value}`);
      }
      index += 1;
      continue;
    }
    throw new Error(`unknown argument: ${option}`);
  }
  if (command.length === 0) {
    throw new Error("missing command");
  }
  return { timeoutMs, command };
}

export function runBoundedCommand({ timeoutMs, command, spawnImpl = spawn }) {
  const [executable, ...args] = command;
  const child = spawnImpl(executable, args, { stdio: "inherit", windowsHide: true });
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    console.error(
      `bounded command exceeded ${timeoutMs}ms; stopping only pid ${child.pid ?? "unknown"}: ${command.join(" ")}`,
    );
    if (typeof child.kill === "function") {
      child.kill();
    }
  }, timeoutMs);

  return new Promise((resolve) => {
    child.on("exit", (code, signal) => {
      clearTimeout(timer);
      if (timedOut) {
        resolve({ code: 124, signal: signal ?? null, timedOut: true, pid: child.pid });
        return;
      }
      resolve({ code: code ?? 1, signal: signal ?? null, timedOut: false, pid: child.pid });
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      console.error(error instanceof Error ? error.message : String(error));
      resolve({ code: 127, signal: null, timedOut: false, pid: child.pid });
    });
  });
}

async function main() {
  let parsed;
  try {
    parsed = parseBoundedArgs(process.argv.slice(2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    usage();
    process.exitCode = 2;
    return;
  }
  const result = await runBoundedCommand(parsed);
  process.exitCode = result.code;
}

const isDirectRun = process.argv[1] && import.meta.url.endsWith(process.argv[1].replaceAll("\\", "/"));
if (isDirectRun || process.argv[1]?.endsWith("run-bounded-command.mjs")) {
  await main();
}
