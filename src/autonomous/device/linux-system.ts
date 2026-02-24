/**
 * Full Linux system controller.
 *
 * Gives the agent comprehensive control over a Linux system:
 *
 * - Terminal / Shell — run commands, spawn persistent shells
 * - File system — CRUD, search, permissions, disk usage
 * - Processes — list, kill, monitor
 * - Packages — install, remove, update (apt/dnf/pacman)
 * - Services — systemctl start/stop/restart/status
 * - Network — interfaces, connectivity, DNS, ports
 * - Clipboard — copy/paste via xclip/xsel
 * - Notifications — desktop notifications via notify-send
 * - Audio — volume control via pactl/amixer
 * - Display — brightness, resolution
 * - System info — CPU, memory, disk, uptime, OS
 * - Users — whoami, list users, groups
 * - Environment — get/set env vars
 * - Cron — list/add/remove scheduled jobs
 */

import { exec as execCb, execFile, spawn } from "node:child_process";
import { promisify } from "node:util";
import {
  readFile, writeFile, readdir, stat, mkdir, rm, rename, copyFile,
  chmod, chown, access, constants,
} from "node:fs/promises";
import { homedir, hostname, userInfo, cpus, totalmem, freemem, uptime, platform, arch, release } from "node:os";
import { join, resolve, dirname, basename } from "node:path";
import { createSubsystemLogger } from "../../logging/subsystem.js";

const log = createSubsystemLogger("linux-system");
const execAsync = promisify(execCb);

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

async function run(cmd: string, timeoutMs: number = 30_000): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  try {
    const { stdout, stderr } = await execAsync(cmd, {
      timeout: timeoutMs,
      maxBuffer: 10 * 1024 * 1024, // 10MB
      env: { ...process.env, LANG: "C.UTF-8" },
    });
    return { stdout: stdout.trim(), stderr: stderr.trim(), exitCode: 0 };
  } catch (err: any) {
    return {
      stdout: (err.stdout ?? "").trim(),
      stderr: (err.stderr ?? err.message ?? "").trim(),
      exitCode: err.code ?? 1,
    };
  }
}

async function runStrict(cmd: string, timeoutMs?: number): Promise<string> {
  const result = await run(cmd, timeoutMs);
  if (result.exitCode !== 0) {
    throw new Error(`Command failed (exit ${result.exitCode}): ${result.stderr || result.stdout}`);
  }
  return result.stdout;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ProcessInfo = {
  pid: number;
  user: string;
  cpu: number;
  mem: number;
  command: string;
  started: string;
};

export type DiskUsage = {
  filesystem: string;
  size: string;
  used: string;
  available: string;
  usePercent: string;
  mountpoint: string;
};

export type NetworkInterface = {
  name: string;
  ipv4?: string;
  ipv6?: string;
  mac?: string;
  up: boolean;
};

export type ServiceStatus = {
  name: string;
  active: boolean;
  enabled: boolean;
  status: string;
  description: string;
};

export type FileInfo = {
  name: string;
  path: string;
  type: "file" | "directory" | "symlink" | "other";
  size: number;
  permissions: string;
  owner: string;
  group: string;
  modified: Date;
};

export type CronJob = {
  minute: string;
  hour: string;
  dayOfMonth: string;
  month: string;
  dayOfWeek: string;
  command: string;
  raw: string;
};

export type SystemInfo = {
  hostname: string;
  platform: string;
  arch: string;
  kernel: string;
  distro: string;
  uptime: number;
  cpuModel: string;
  cpuCores: number;
  totalMemoryMB: number;
  freeMemoryMB: number;
  username: string;
  homeDir: string;
  shell: string;
};

// ---------------------------------------------------------------------------
// Package manager detection
// ---------------------------------------------------------------------------

type PkgManager = "apt" | "dnf" | "yum" | "pacman" | "zypper" | "apk" | "unknown";

async function detectPkgManager(): Promise<PkgManager> {
  const managers: Array<[string, PkgManager]> = [
    ["apt", "apt"], ["dnf", "dnf"], ["yum", "yum"],
    ["pacman", "pacman"], ["zypper", "zypper"], ["apk", "apk"],
  ];
  for (const [cmd, name] of managers) {
    const result = await run(`which ${cmd}`);
    if (result.exitCode === 0) return name;
  }
  return "unknown";
}

// ===========================================================================
// Linux System Controller
// ===========================================================================

export class LinuxSystemController {

  // -------------------------------------------------------------------------
  // 1. Terminal / Shell
  // -------------------------------------------------------------------------

  /** Run a shell command and return stdout/stderr/exitCode. */
  async exec(command: string, timeoutMs: number = 30_000): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    log.info(`exec: ${command.slice(0, 100)}`);
    return run(command, timeoutMs);
  }

  /** Run a command and throw on non-zero exit. */
  async execStrict(command: string, timeoutMs?: number): Promise<string> {
    return runStrict(command, timeoutMs);
  }

  /** Run a command in the background. Returns the PID. */
  async execBackground(command: string): Promise<number> {
    log.info(`exec background: ${command.slice(0, 100)}`);
    const child = spawn("bash", ["-c", command], {
      detached: true,
      stdio: "ignore",
    });
    child.unref();
    return child.pid ?? 0;
  }

  /** Open a new terminal window running a command. */
  async openTerminal(command?: string): Promise<void> {
    const terminals = [
      "gnome-terminal", "konsole", "xfce4-terminal",
      "mate-terminal", "xterm", "alacritty", "kitty",
    ];

    for (const term of terminals) {
      const { exitCode } = await run(`which ${term}`);
      if (exitCode === 0) {
        if (command) {
          await run(`${term} -- bash -c '${command}; exec bash' &`);
        } else {
          await run(`${term} &`);
        }
        return;
      }
    }
    throw new Error("No terminal emulator found");
  }

  // -------------------------------------------------------------------------
  // 2. File System
  // -------------------------------------------------------------------------

  /** Read a file's contents. */
  async readFile(filePath: string): Promise<string> {
    return readFile(resolve(filePath), "utf-8");
  }

  /** Write content to a file (creates or overwrites). */
  async writeFile(filePath: string, content: string): Promise<void> {
    const dir = dirname(resolve(filePath));
    await mkdir(dir, { recursive: true });
    await writeFile(resolve(filePath), content, "utf-8");
  }

  /** Append content to a file. */
  async appendFile(filePath: string, content: string): Promise<void> {
    const { appendFile: appendFn } = await import("node:fs/promises");
    await appendFn(resolve(filePath), content, "utf-8");
  }

  /** Delete a file or directory. */
  async delete(path: string, recursive: boolean = false): Promise<void> {
    await rm(resolve(path), { recursive, force: true });
  }

  /** Create a directory (and parents). */
  async createDir(dirPath: string): Promise<void> {
    await mkdir(resolve(dirPath), { recursive: true });
  }

  /** Copy a file. */
  async copy(src: string, dest: string): Promise<void> {
    await copyFile(resolve(src), resolve(dest));
  }

  /** Move/rename a file or directory. */
  async move(src: string, dest: string): Promise<void> {
    await rename(resolve(src), resolve(dest));
  }

  /** List directory contents with details. */
  async listDir(dirPath: string): Promise<FileInfo[]> {
    const entries = await readdir(resolve(dirPath), { withFileTypes: true });
    const results: FileInfo[] = [];

    for (const entry of entries) {
      const fullPath = join(resolve(dirPath), entry.name);
      try {
        const s = await stat(fullPath);
        const { stdout: perms } = await run(`stat -c '%A %U %G' "${fullPath}"`);
        const parts = perms.split(" ");
        results.push({
          name: entry.name,
          path: fullPath,
          type: entry.isDirectory() ? "directory" : entry.isSymbolicLink() ? "symlink" : entry.isFile() ? "file" : "other",
          size: s.size,
          permissions: parts[0] ?? "",
          owner: parts[1] ?? "",
          group: parts[2] ?? "",
          modified: s.mtime,
        });
      } catch {
        // Skip inaccessible entries
      }
    }

    return results;
  }

  /** Check if a path exists. */
  async exists(path: string): Promise<boolean> {
    try {
      await access(resolve(path), constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }

  /** Search for files matching a pattern. */
  async findFiles(directory: string, pattern: string, maxDepth: number = 5): Promise<string[]> {
    const { stdout } = await run(`find "${resolve(directory)}" -maxdepth ${maxDepth} -name "${pattern}" 2>/dev/null | head -50`);
    return stdout.split("\n").filter(Boolean);
  }

  /** Get file/directory size (human-readable). */
  async getSize(path: string): Promise<string> {
    return runStrict(`du -sh "${resolve(path)}" | cut -f1`);
  }

  /** Change file permissions. */
  async setPermissions(path: string, mode: string): Promise<void> {
    await chmod(resolve(path), parseInt(mode, 8));
  }

  /** Get disk usage. */
  async getDiskUsage(): Promise<DiskUsage[]> {
    const { stdout } = await run("df -h --output=source,size,used,avail,pcent,target 2>/dev/null | tail -n +2");
    return stdout.split("\n").filter(Boolean).map((line) => {
      const parts = line.trim().split(/\s+/);
      return {
        filesystem: parts[0] ?? "",
        size: parts[1] ?? "",
        used: parts[2] ?? "",
        available: parts[3] ?? "",
        usePercent: parts[4] ?? "",
        mountpoint: parts[5] ?? "",
      };
    });
  }

  // -------------------------------------------------------------------------
  // 3. Process Management
  // -------------------------------------------------------------------------

  /** List running processes. */
  async listProcesses(filter?: string): Promise<ProcessInfo[]> {
    const cmd = filter
      ? `ps aux --sort=-%cpu | grep -i "${filter}" | grep -v grep | head -30`
      : `ps aux --sort=-%cpu | head -30`;
    const { stdout } = await run(cmd);

    return stdout.split("\n").filter(Boolean).slice(1).map((line) => {
      const parts = line.trim().split(/\s+/);
      return {
        pid: parseInt(parts[1] ?? "0", 10),
        user: parts[0] ?? "",
        cpu: parseFloat(parts[2] ?? "0"),
        mem: parseFloat(parts[3] ?? "0"),
        started: parts[8] ?? "",
        command: parts.slice(10).join(" "),
      };
    });
  }

  /** Kill a process by PID. */
  async killProcess(pid: number, signal: string = "TERM"): Promise<void> {
    log.info(`killing process ${pid} with SIG${signal}`);
    await run(`kill -${signal} ${pid}`);
  }

  /** Kill processes matching a name. */
  async killByName(name: string): Promise<void> {
    log.info(`killall: ${name}`);
    await run(`pkill -f "${name}"`);
  }

  /** Get process info by PID. */
  async getProcess(pid: number): Promise<ProcessInfo | null> {
    const { stdout, exitCode } = await run(`ps -p ${pid} -o user,%cpu,%mem,start,command --no-headers`);
    if (exitCode !== 0 || !stdout) return null;
    const parts = stdout.trim().split(/\s+/);
    return {
      pid,
      user: parts[0] ?? "",
      cpu: parseFloat(parts[1] ?? "0"),
      mem: parseFloat(parts[2] ?? "0"),
      started: parts[3] ?? "",
      command: parts.slice(4).join(" "),
    };
  }

  // -------------------------------------------------------------------------
  // 4. Package Management
  // -------------------------------------------------------------------------

  /** Install a package using the system package manager. */
  async installPackage(packageName: string): Promise<{ success: boolean; output: string }> {
    const pm = await detectPkgManager();
    log.info(`installing ${packageName} via ${pm}`);

    const cmds: Record<string, string> = {
      apt: `sudo apt-get install -y ${packageName}`,
      dnf: `sudo dnf install -y ${packageName}`,
      yum: `sudo yum install -y ${packageName}`,
      pacman: `sudo pacman -S --noconfirm ${packageName}`,
      zypper: `sudo zypper install -y ${packageName}`,
      apk: `sudo apk add ${packageName}`,
    };

    const cmd = cmds[pm];
    if (!cmd) return { success: false, output: `Unknown package manager: ${pm}` };

    const result = await run(cmd, 120_000);
    return { success: result.exitCode === 0, output: result.stdout || result.stderr };
  }

  /** Remove a package. */
  async removePackage(packageName: string): Promise<{ success: boolean; output: string }> {
    const pm = await detectPkgManager();
    log.info(`removing ${packageName} via ${pm}`);

    const cmds: Record<string, string> = {
      apt: `sudo apt-get remove -y ${packageName}`,
      dnf: `sudo dnf remove -y ${packageName}`,
      yum: `sudo yum remove -y ${packageName}`,
      pacman: `sudo pacman -R --noconfirm ${packageName}`,
      zypper: `sudo zypper remove -y ${packageName}`,
      apk: `sudo apk del ${packageName}`,
    };

    const cmd = cmds[pm];
    if (!cmd) return { success: false, output: `Unknown package manager: ${pm}` };

    const result = await run(cmd, 120_000);
    return { success: result.exitCode === 0, output: result.stdout || result.stderr };
  }

  /** Update all packages. */
  async updatePackages(): Promise<{ success: boolean; output: string }> {
    const pm = await detectPkgManager();
    log.info(`updating all packages via ${pm}`);

    const cmds: Record<string, string> = {
      apt: "sudo apt-get update && sudo apt-get upgrade -y",
      dnf: "sudo dnf upgrade -y",
      yum: "sudo yum update -y",
      pacman: "sudo pacman -Syu --noconfirm",
      zypper: "sudo zypper update -y",
      apk: "sudo apk update && sudo apk upgrade",
    };

    const cmd = cmds[pm];
    if (!cmd) return { success: false, output: `Unknown package manager: ${pm}` };

    const result = await run(cmd, 300_000);
    return { success: result.exitCode === 0, output: result.stdout || result.stderr };
  }

  /** Search for a package. */
  async searchPackage(query: string): Promise<string[]> {
    const pm = await detectPkgManager();

    const cmds: Record<string, string> = {
      apt: `apt-cache search "${query}" | head -20`,
      dnf: `dnf search "${query}" 2>/dev/null | head -20`,
      yum: `yum search "${query}" 2>/dev/null | head -20`,
      pacman: `pacman -Ss "${query}" 2>/dev/null | head -20`,
      zypper: `zypper search "${query}" 2>/dev/null | head -20`,
      apk: `apk search "${query}" | head -20`,
    };

    const cmd = cmds[pm];
    if (!cmd) return [];

    const { stdout } = await run(cmd);
    return stdout.split("\n").filter(Boolean);
  }

  /** Check if a package is installed. */
  async isPackageInstalled(packageName: string): Promise<boolean> {
    const pm = await detectPkgManager();

    const cmds: Record<string, string> = {
      apt: `dpkg -l ${packageName} 2>/dev/null | grep "^ii"`,
      dnf: `rpm -q ${packageName}`,
      yum: `rpm -q ${packageName}`,
      pacman: `pacman -Q ${packageName}`,
      zypper: `rpm -q ${packageName}`,
      apk: `apk info -e ${packageName}`,
    };

    const cmd = cmds[pm];
    if (!cmd) return false;

    const { exitCode } = await run(cmd);
    return exitCode === 0;
  }

  // -------------------------------------------------------------------------
  // 5. Services (systemd)
  // -------------------------------------------------------------------------

  /** Get the status of a service. */
  async serviceStatus(name: string): Promise<ServiceStatus> {
    const { stdout } = await run(`systemctl show ${name} --no-pager -p ActiveState,UnitFileState,Description 2>/dev/null`);
    const props: Record<string, string> = {};
    for (const line of stdout.split("\n")) {
      const [k, v] = line.split("=");
      if (k && v) props[k] = v;
    }
    return {
      name,
      active: props.ActiveState === "active",
      enabled: props.UnitFileState === "enabled",
      status: props.ActiveState ?? "unknown",
      description: props.Description ?? "",
    };
  }

  /** Start a service. */
  async serviceStart(name: string): Promise<void> {
    log.info(`starting service: ${name}`);
    await runStrict(`sudo systemctl start ${name}`);
  }

  /** Stop a service. */
  async serviceStop(name: string): Promise<void> {
    log.info(`stopping service: ${name}`);
    await runStrict(`sudo systemctl stop ${name}`);
  }

  /** Restart a service. */
  async serviceRestart(name: string): Promise<void> {
    log.info(`restarting service: ${name}`);
    await runStrict(`sudo systemctl restart ${name}`);
  }

  /** Enable a service to start at boot. */
  async serviceEnable(name: string): Promise<void> {
    await runStrict(`sudo systemctl enable ${name}`);
  }

  /** Disable a service from starting at boot. */
  async serviceDisable(name: string): Promise<void> {
    await runStrict(`sudo systemctl disable ${name}`);
  }

  /** List all services. */
  async listServices(filter?: string): Promise<ServiceStatus[]> {
    const cmd = filter
      ? `systemctl list-units --type=service --no-pager --no-legend | grep -i "${filter}"`
      : `systemctl list-units --type=service --no-pager --no-legend | head -30`;
    const { stdout } = await run(cmd);

    return stdout.split("\n").filter(Boolean).map((line) => {
      const parts = line.trim().split(/\s+/);
      const name = (parts[0] ?? "").replace(".service", "");
      return {
        name,
        active: parts[2] === "active",
        enabled: false, // Would need separate query
        status: parts[3] ?? "unknown",
        description: parts.slice(4).join(" "),
      };
    });
  }

  // -------------------------------------------------------------------------
  // 6. Network
  // -------------------------------------------------------------------------

  /** List network interfaces. */
  async listNetworkInterfaces(): Promise<NetworkInterface[]> {
    const { stdout } = await run("ip -j addr show 2>/dev/null || ip addr show");
    try {
      const parsed = JSON.parse(stdout);
      return parsed.map((iface: any) => ({
        name: iface.ifname,
        ipv4: iface.addr_info?.find((a: any) => a.family === "inet")?.local,
        ipv6: iface.addr_info?.find((a: any) => a.family === "inet6")?.local,
        mac: iface.address,
        up: iface.operstate === "UP",
      }));
    } catch {
      // Fallback parsing
      const interfaces: NetworkInterface[] = [];
      const blocks = stdout.split(/^\d+: /m).filter(Boolean);
      for (const block of blocks) {
        const nameMatch = block.match(/^(\S+?):/);
        const ipv4Match = block.match(/inet (\S+)/);
        const ipv6Match = block.match(/inet6 (\S+)/);
        const macMatch = block.match(/link\/\S+ (\S+)/);
        interfaces.push({
          name: nameMatch?.[1] ?? "unknown",
          ipv4: ipv4Match?.[1]?.split("/")[0],
          ipv6: ipv6Match?.[1]?.split("/")[0],
          mac: macMatch?.[1],
          up: block.includes("state UP"),
        });
      }
      return interfaces;
    }
  }

  /** Check internet connectivity. */
  async checkConnectivity(host: string = "8.8.8.8"): Promise<boolean> {
    const { exitCode } = await run(`ping -c 1 -W 3 ${host}`);
    return exitCode === 0;
  }

  /** Do a DNS lookup. */
  async dnsLookup(domain: string): Promise<string[]> {
    const { stdout } = await run(`dig +short ${domain} 2>/dev/null || nslookup ${domain} | grep "Address" | tail -n +2`);
    return stdout.split("\n").filter(Boolean);
  }

  /** List open network ports. */
  async listOpenPorts(): Promise<Array<{ protocol: string; port: number; pid: number; process: string }>> {
    const { stdout } = await run("ss -tlnp 2>/dev/null | tail -n +2");
    return stdout.split("\n").filter(Boolean).map((line) => {
      const parts = line.trim().split(/\s+/);
      const addr = parts[3] ?? "";
      const portMatch = addr.match(/:(\d+)$/);
      const pidMatch = (parts[5] ?? "").match(/pid=(\d+)/);
      const procMatch = (parts[5] ?? "").match(/\("([^"]+)"/);
      return {
        protocol: parts[0] ?? "tcp",
        port: parseInt(portMatch?.[1] ?? "0", 10),
        pid: parseInt(pidMatch?.[1] ?? "0", 10),
        process: procMatch?.[1] ?? "",
      };
    });
  }

  /** Download a file from a URL. */
  async downloadFile(url: string, destPath: string): Promise<void> {
    log.info(`downloading ${url} → ${destPath}`);
    await runStrict(`curl -fsSL -o "${resolve(destPath)}" "${url}"`, 120_000);
  }

  // -------------------------------------------------------------------------
  // 7. Clipboard
  // -------------------------------------------------------------------------

  /** Copy text to clipboard. */
  async clipboardCopy(text: string): Promise<void> {
    const result = await run(`echo -n "${text.replace(/"/g, '\\"')}" | xclip -selection clipboard 2>/dev/null || echo -n "${text.replace(/"/g, '\\"')}" | xsel --clipboard --input`);
    if (result.exitCode !== 0) {
      // Fallback: wl-copy for Wayland
      await run(`echo -n "${text.replace(/"/g, '\\"')}" | wl-copy`);
    }
  }

  /** Paste text from clipboard. */
  async clipboardPaste(): Promise<string> {
    const { stdout, exitCode } = await run("xclip -selection clipboard -o 2>/dev/null || xsel --clipboard --output 2>/dev/null || wl-paste 2>/dev/null");
    return stdout;
  }

  // -------------------------------------------------------------------------
  // 8. Notifications
  // -------------------------------------------------------------------------

  /** Send a desktop notification. */
  async notify(title: string, body: string, urgency: "low" | "normal" | "critical" = "normal"): Promise<void> {
    await run(`notify-send -u ${urgency} "${title}" "${body}"`);
  }

  // -------------------------------------------------------------------------
  // 9. Audio / Volume
  // -------------------------------------------------------------------------

  /** Get current volume percentage. */
  async getVolume(): Promise<number> {
    const { stdout } = await run("pactl get-sink-volume @DEFAULT_SINK@ 2>/dev/null | grep -oP '\\d+%' | head -1");
    return parseInt(stdout.replace("%", ""), 10) || 0;
  }

  /** Set volume (0-100). */
  async setVolume(percent: number): Promise<void> {
    await run(`pactl set-sink-volume @DEFAULT_SINK@ ${Math.min(150, Math.max(0, percent))}%`);
  }

  /** Toggle mute. */
  async toggleMute(): Promise<void> {
    await run("pactl set-sink-mute @DEFAULT_SINK@ toggle");
  }

  // -------------------------------------------------------------------------
  // 10. Display
  // -------------------------------------------------------------------------

  /** Get current screen brightness (0-100). */
  async getBrightness(): Promise<number> {
    try {
      const { stdout } = await run("brightnessctl get");
      const { stdout: max } = await run("brightnessctl max");
      return Math.round((parseInt(stdout, 10) / parseInt(max, 10)) * 100);
    } catch {
      const { stdout } = await run("xrandr --verbose | grep -i brightness | head -1 | cut -d' ' -f2");
      return Math.round(parseFloat(stdout) * 100);
    }
  }

  /** Set screen brightness (0-100). */
  async setBrightness(percent: number): Promise<void> {
    const clamped = Math.min(100, Math.max(1, percent));
    try {
      await run(`brightnessctl set ${clamped}%`);
    } catch {
      await run(`xrandr --output $(xrandr | grep " connected" | head -1 | cut -d' ' -f1) --brightness ${clamped / 100}`);
    }
  }

  /** Change screen resolution. */
  async setResolution(width: number, height: number): Promise<void> {
    const output = await runStrict("xrandr | grep ' connected' | head -1 | cut -d' ' -f1");
    await runStrict(`xrandr --output ${output} --mode ${width}x${height}`);
  }

  /** List available screen resolutions. */
  async listResolutions(): Promise<string[]> {
    const { stdout } = await run("xrandr | grep -oP '\\d+x\\d+' | sort -t'x' -k1 -n -r | head -20");
    return Array.from(new Set(stdout.split("\n").filter(Boolean)));
  }

  // -------------------------------------------------------------------------
  // 11. System Info
  // -------------------------------------------------------------------------

  /** Get comprehensive system information. */
  async getSystemInfo(): Promise<SystemInfo> {
    const user = userInfo();
    let distro = "Linux";
    try {
      const { stdout } = await run("cat /etc/os-release | grep PRETTY_NAME | cut -d'\"' -f2");
      if (stdout) distro = stdout;
    } catch { /* ignore */ }

    return {
      hostname: hostname(),
      platform: platform(),
      arch: arch(),
      kernel: release(),
      distro,
      uptime: uptime(),
      cpuModel: cpus()[0]?.model ?? "unknown",
      cpuCores: cpus().length,
      totalMemoryMB: Math.round(totalmem() / 1024 / 1024),
      freeMemoryMB: Math.round(freemem() / 1024 / 1024),
      username: user.username,
      homeDir: homedir(),
      shell: user.shell ?? "/bin/bash",
    };
  }

  /** Get CPU usage percentage. */
  async getCpuUsage(): Promise<number> {
    const { stdout } = await run("top -bn1 | grep 'Cpu(s)' | awk '{print $2}' | cut -d'%' -f1");
    return parseFloat(stdout) || 0;
  }

  /** Get memory usage. */
  async getMemoryUsage(): Promise<{ totalMB: number; usedMB: number; freeMB: number; percent: number }> {
    const { stdout } = await run("free -m | grep Mem");
    const parts = stdout.trim().split(/\s+/);
    const total = parseInt(parts[1] ?? "0", 10);
    const used = parseInt(parts[2] ?? "0", 10);
    const free = parseInt(parts[3] ?? "0", 10);
    return { totalMB: total, usedMB: used, freeMB: free, percent: total > 0 ? Math.round((used / total) * 100) : 0 };
  }

  // -------------------------------------------------------------------------
  // 12. Users & Environment
  // -------------------------------------------------------------------------

  /** Get the current username. */
  async whoami(): Promise<string> {
    return runStrict("whoami");
  }

  /** List logged-in users. */
  async listUsers(): Promise<string[]> {
    const { stdout } = await run("who | awk '{print $1}' | sort -u");
    return stdout.split("\n").filter(Boolean);
  }

  /** Get an environment variable. */
  getEnv(name: string): string | undefined {
    return process.env[name];
  }

  /** Set an environment variable for this session. */
  setEnv(name: string, value: string): void {
    process.env[name] = value;
  }

  // -------------------------------------------------------------------------
  // 13. Cron Jobs
  // -------------------------------------------------------------------------

  /** List current user's cron jobs. */
  async listCronJobs(): Promise<CronJob[]> {
    const { stdout, exitCode } = await run("crontab -l 2>/dev/null");
    if (exitCode !== 0) return [];
    return stdout.split("\n")
      .filter((l) => l.trim() && !l.startsWith("#"))
      .map((line) => {
        const parts = line.trim().split(/\s+/);
        return {
          minute: parts[0] ?? "*",
          hour: parts[1] ?? "*",
          dayOfMonth: parts[2] ?? "*",
          month: parts[3] ?? "*",
          dayOfWeek: parts[4] ?? "*",
          command: parts.slice(5).join(" "),
          raw: line,
        };
      });
  }

  /** Add a cron job. */
  async addCronJob(schedule: string, command: string): Promise<void> {
    log.info(`adding cron: ${schedule} ${command}`);
    await run(`(crontab -l 2>/dev/null; echo "${schedule} ${command}") | crontab -`);
  }

  /** Remove cron jobs matching a pattern. */
  async removeCronJob(pattern: string): Promise<void> {
    log.info(`removing cron matching: ${pattern}`);
    await run(`crontab -l 2>/dev/null | grep -v "${pattern}" | crontab -`);
  }

  // -------------------------------------------------------------------------
  // 14. Power
  // -------------------------------------------------------------------------

  /** Lock the screen. */
  async lockScreen(): Promise<void> {
    await run("loginctl lock-session 2>/dev/null || xdg-screensaver lock 2>/dev/null || gnome-screensaver-command -l");
  }

  /** Suspend the system. */
  async suspend(): Promise<void> {
    log.info("suspending system");
    await run("systemctl suspend");
  }

  /** Reboot the system. */
  async reboot(): Promise<void> {
    log.info("rebooting system");
    await run("sudo reboot");
  }

  /** Shutdown the system. */
  async shutdown(): Promise<void> {
    log.info("shutting down system");
    await run("sudo shutdown -h now");
  }

  // -------------------------------------------------------------------------
  // 15. Utility: check what tools are available
  // -------------------------------------------------------------------------

  /** Check which optional tools are installed. */
  async checkTools(): Promise<Record<string, boolean>> {
    const tools = [
      "xdotool", "xdg-open", "wmctrl", "scrot", "xclip", "xsel", "wl-copy",
      "notify-send", "pactl", "brightnessctl", "curl", "wget",
      "git", "docker", "snap", "flatpak", "pip", "npm", "node",
    ];
    const result: Record<string, boolean> = {};
    for (const tool of tools) {
      const { exitCode } = await run(`which ${tool}`);
      result[tool] = exitCode === 0;
    }
    return result;
  }
}
