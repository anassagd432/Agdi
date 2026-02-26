/**
 * One-command agent setup.
 *
 * `agdi agent` auto-detects the OS, installs missing dependencies,
 * prompts for API key, validates everything works, and starts the agent.
 *
 * Goal: zero friction — one command and you're watching the agent work.
 */

import { execFile } from "node:child_process";
import { readFile, writeFile, mkdir, access, constants } from "node:fs/promises";
import { homedir, platform } from "node:os";
import { join } from "node:path";
import { createSubsystemLogger } from "../../logging/subsystem.js";

const log = createSubsystemLogger("setup");

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SetupResult = {
  success: boolean;
  platform: string;
  installedDeps: string[];
  skippedDeps: string[];
  missingDeps: string[];
  apiKeyConfigured: boolean;
  errors: string[];
  warnings: string[];
};

export type DepCheck = {
  name: string;
  command: string; // Command to check if installed
  installCmd?: string; // Command to auto-install
  required: boolean; // Block startup if missing?
  description: string;
};

// ---------------------------------------------------------------------------
// Dependency definitions per platform
// ---------------------------------------------------------------------------

const LINUX_DEPS: DepCheck[] = [
  {
    name: "xdotool",
    command: "which xdotool",
    installCmd:
      "sudo apt-get install -y xdotool || sudo dnf install -y xdotool || sudo pacman -S --noconfirm xdotool",
    required: true,
    description: "Mouse/keyboard control",
  },
  {
    name: "scrot",
    command: "which scrot",
    installCmd:
      "sudo apt-get install -y scrot || sudo dnf install -y scrot || sudo pacman -S --noconfirm scrot",
    required: true,
    description: "Screenshot capture",
  },
  {
    name: "xdg-utils",
    command: "which xdg-open",
    installCmd: "sudo apt-get install -y xdg-utils || sudo dnf install -y xdg-utils",
    required: true,
    description: "Open apps/files/URLs",
  },
  {
    name: "wmctrl",
    command: "which wmctrl",
    installCmd: "sudo apt-get install -y wmctrl || sudo dnf install -y wmctrl",
    required: false,
    description: "Window management (optional, improves window control)",
  },
  {
    name: "xclip",
    command: "which xclip",
    installCmd: "sudo apt-get install -y xclip || sudo dnf install -y xclip",
    required: false,
    description: "Clipboard (optional)",
  },
  {
    name: "notify-send",
    command: "which notify-send",
    installCmd: "sudo apt-get install -y libnotify-bin || sudo dnf install -y libnotify",
    required: false,
    description: "Desktop notifications (optional)",
  },
  {
    name: "xrandr",
    command: "which xrandr",
    installCmd: "sudo apt-get install -y x11-xserver-utils || sudo dnf install -y xrandr",
    required: false,
    description: "Display info (optional)",
  },
];

const MACOS_DEPS: DepCheck[] = [
  {
    name: "cliclick",
    command: "which cliclick",
    installCmd: "brew install cliclick",
    required: true,
    description: "Mouse control",
  },
];

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function exec(cmd: string): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve) => {
    execFile("bash", ["-c", cmd], { timeout: 60_000 }, (error, stdout, stderr) => {
      resolve({
        stdout: (stdout ?? "").trim(),
        stderr: (stderr ?? error?.message ?? "").trim(),
        exitCode: error ? ((error as any).code ?? 1) : 0,
      });
    });
  });
}

// ---------------------------------------------------------------------------
// Setup runner
// ---------------------------------------------------------------------------

/**
 * Run the full setup process.
 * Returns a result object with what was installed, what's missing, etc.
 */
export async function runAgentSetup(opts?: {
  autoInstall?: boolean;
  apiKey?: string;
}): Promise<SetupResult> {
  const os = platform();
  const result: SetupResult = {
    success: true,
    platform: os,
    installedDeps: [],
    skippedDeps: [],
    missingDeps: [],
    apiKeyConfigured: false,
    errors: [],
    warnings: [],
  };

  console.log("");
  console.log("🤖 AGDI Agent Setup");
  console.log("━".repeat(40));
  console.log(`📦 Platform: ${os}`);
  console.log("");

  // 1. Check & install dependencies
  const deps = os === "linux" ? LINUX_DEPS : os === "darwin" ? MACOS_DEPS : [];

  if (deps.length === 0 && os === "win32") {
    console.log("  ✅ Windows — using built-in PowerShell (no extra deps needed)");
  }

  for (const dep of deps) {
    const check = await exec(dep.command);
    if (check.exitCode === 0) {
      console.log(`  ✅ ${dep.name} — ${dep.description}`);
      result.installedDeps.push(dep.name);
      continue;
    }

    if (opts?.autoInstall && dep.installCmd) {
      console.log(`  📦 Installing ${dep.name}...`);
      const install = await exec(dep.installCmd);
      if (install.exitCode === 0) {
        console.log(`  ✅ ${dep.name} — installed!`);
        result.installedDeps.push(dep.name);
      } else {
        if (dep.required) {
          console.log(`  ❌ ${dep.name} — install failed: ${install.stderr}`);
          result.errors.push(`Failed to install ${dep.name}: ${install.stderr}`);
          result.success = false;
        } else {
          console.log(`  ⚠️  ${dep.name} — install failed (optional, skipping)`);
          result.warnings.push(`Optional dep ${dep.name} failed to install`);
          result.skippedDeps.push(dep.name);
        }
      }
    } else {
      if (dep.required) {
        console.log(`  ❌ ${dep.name} — MISSING (${dep.description})`);
        if (dep.installCmd) {
          console.log(`     Install: ${dep.installCmd}`);
        }
        result.missingDeps.push(dep.name);
        result.success = false;
      } else {
        console.log(`  ⚠️  ${dep.name} — not found (optional: ${dep.description})`);
        result.skippedDeps.push(dep.name);
      }
    }
  }

  console.log("");

  // 2. Check API key
  const configDir = join(homedir(), ".agdi");
  const configFile = join(configDir, "config.json");

  let apiKey = opts?.apiKey ?? process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY;

  if (!apiKey) {
    try {
      const config = JSON.parse(await readFile(configFile, "utf-8"));
      apiKey = config.geminiApiKey ?? config.apiKey;
    } catch {
      // No config file
    }
  }

  if (apiKey) {
    console.log("  ✅ API key configured");
    result.apiKeyConfigured = true;
  } else {
    console.log("  ❌ No API key found");
    console.log("     Set GEMINI_API_KEY environment variable or pass --api-key");
    result.apiKeyConfigured = false;
    result.success = false;
  }

  console.log("");

  // 3. Summary
  if (result.success) {
    console.log("✅ Setup complete! Starting agent...");
  } else {
    console.log("❌ Setup incomplete — fix the issues above and try again.");
    if (result.missingDeps.length > 0) {
      console.log(`   Missing: ${result.missingDeps.join(", ")}`);
      console.log(`   Run with --auto-install to install automatically`);
    }
  }

  console.log("");
  return result;
}
