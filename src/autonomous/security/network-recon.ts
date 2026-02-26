/**
 * AGDI Network Reconnaissance Module
 *
 * Capabilities:
 *   - Host discovery (ping sweep, ARP scan)
 *   - Port scanning (TCP SYN, connect, UDP)
 *   - Service/version fingerprinting
 *   - OS detection
 *   - Traceroute
 *   - DNS enumeration
 *
 * Wraps nmap, masscan, and native sockets.
 */

import { execFile } from "node:child_process";
import * as dns from "node:dns";
import * as net from "node:net";
import { promisify } from "node:util";

const run = promisify(execFile);
const dnsResolve = promisify(dns.resolve);

// ── Types ──────────────────────────────────────────────────────────

export interface PortResult {
  port: number;
  state: "open" | "closed" | "filtered";
  service?: string;
  version?: string;
  banner?: string;
}

export interface HostResult {
  ip: string;
  hostname?: string;
  mac?: string;
  os?: string;
  ports: PortResult[];
  latencyMs?: number;
}

export interface ScanOptions {
  /** Target IP, CIDR, or hostname */
  target: string;
  /** Port range, e.g. "1-1024", "80,443,8080", or "1-65535" */
  ports?: string;
  /** Scan technique */
  technique?: "syn" | "connect" | "udp" | "ack" | "fin";
  /** Attempt OS detection */
  osDetection?: boolean;
  /** Attempt service/version detection */
  serviceDetection?: boolean;
  /** Timeout per probe in ms */
  timeoutMs?: number;
  /** Maximum concurrent connections */
  concurrency?: number;
  /** Use aggressive timing (nmap -T4) */
  aggressive?: boolean;
}

export interface TracerouteHop {
  hop: number;
  ip: string;
  hostname?: string;
  rttMs: number[];
}

export interface DnsRecord {
  type: string;
  value: string;
  ttl?: number;
}

export type ReconEvent =
  | { kind: "host_discovered"; host: HostResult }
  | { kind: "port_found"; ip: string; port: PortResult }
  | { kind: "scan_progress"; percent: number }
  | { kind: "scan_complete"; hosts: HostResult[] }
  | { kind: "error"; message: string };

export type ReconListener = (event: ReconEvent) => void;

// ── Network Recon Engine ───────────────────────────────────────────

export class NetworkRecon {
  private listeners: ReconListener[] = [];

  on(listener: ReconListener): void {
    this.listeners.push(listener);
  }

  private emit(event: ReconEvent): void {
    for (const l of this.listeners) l(event);
  }

  // ── Host Discovery ────────────────────────────────────────────

  /** Ping sweep a CIDR range to find live hosts */
  async discoverHosts(cidr: string): Promise<HostResult[]> {
    const hosts: HostResult[] = [];
    try {
      // Try nmap ping sweep first
      const { stdout } = await run("nmap", ["-sn", "-oG", "-", cidr], {
        timeout: 60_000,
      });
      const lines = stdout.split("\n");
      for (const line of lines) {
        const match = line.match(/Host:\s+(\S+)\s+\(([^)]*)\)\s+Status:\s+Up/);
        if (match) {
          const host: HostResult = {
            ip: match[1],
            hostname: match[2] || undefined,
            ports: [],
          };
          hosts.push(host);
          this.emit({ kind: "host_discovered", host });
        }
      }
    } catch {
      // Fallback: native ping sweep
      const base = cidr.replace(/\/\d+$/, "");
      const prefix = base.split(".").slice(0, 3).join(".");
      const promises: Promise<void>[] = [];
      for (let i = 1; i < 255; i++) {
        const ip = `${prefix}.${i}`;
        promises.push(
          run("ping", ["-c", "1", "-W", "1", ip])
            .then(() => {
              const host: HostResult = { ip, ports: [] };
              hosts.push(host);
              this.emit({ kind: "host_discovered", host });
            })
            .catch(() => {}),
        );
      }
      await Promise.all(promises);
    }
    return hosts;
  }

  /** ARP scan for local network (requires root) */
  async arpScan(iface?: string): Promise<HostResult[]> {
    const hosts: HostResult[] = [];
    const args = ["-l"];
    if (iface) args.push("-I", iface);
    try {
      const { stdout } = await run("arp-scan", args, { timeout: 30_000 });
      for (const line of stdout.split("\n")) {
        const match = line.match(/^(\d+\.\d+\.\d+\.\d+)\s+([0-9a-f:]+)\s+(.*)/i);
        if (match) {
          const host: HostResult = {
            ip: match[1],
            mac: match[2],
            ports: [],
          };
          hosts.push(host);
          this.emit({ kind: "host_discovered", host });
        }
      }
    } catch (err) {
      this.emit({
        kind: "error",
        message: `arp-scan failed: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
    return hosts;
  }

  // ── Port Scanning ─────────────────────────────────────────────

  /** Full port scan with nmap or fallback to native TCP connect */
  async scanPorts(options: ScanOptions): Promise<HostResult> {
    const result: HostResult = { ip: options.target, ports: [] };

    try {
      result.ports = await this.nmapScan(options);
    } catch {
      // Fallback: native TCP connect scan
      result.ports = await this.nativeTcpScan(options);
    }

    // Attempt hostname resolution
    try {
      const hostnames = await run("host", [options.target]);
      const m = hostnames.stdout.match(/pointer\s+(.+)\./);
      if (m) result.hostname = m[1];
    } catch {}

    this.emit({ kind: "scan_complete", hosts: [result] });
    return result;
  }

  private async nmapScan(options: ScanOptions): Promise<PortResult[]> {
    const args: string[] = [];

    // Scan technique
    switch (options.technique) {
      case "syn":
        args.push("-sS");
        break;
      case "udp":
        args.push("-sU");
        break;
      case "ack":
        args.push("-sA");
        break;
      case "fin":
        args.push("-sF");
        break;
      default:
        args.push("-sT");
    }

    if (options.serviceDetection) args.push("-sV");
    if (options.osDetection) args.push("-O");
    if (options.aggressive) args.push("-T4");
    if (options.ports) args.push("-p", options.ports);

    args.push("-oG", "-", options.target);

    const { stdout } = await run("nmap", args, {
      timeout: options.timeoutMs ?? 120_000,
    });

    const ports: PortResult[] = [];
    const portRegex = /(\d+)\/(open|closed|filtered)\/(\w+)\/\/([^/]*)\//g;
    let match: RegExpExecArray | null;
    while ((match = portRegex.exec(stdout)) !== null) {
      const port: PortResult = {
        port: parseInt(match[1]),
        state: match[2] as PortResult["state"],
        service: match[3] || undefined,
        version: match[4] || undefined,
      };
      ports.push(port);
      this.emit({ kind: "port_found", ip: options.target, port });
    }
    return ports;
  }

  private async nativeTcpScan(options: ScanOptions): Promise<PortResult[]> {
    const ports: PortResult[] = [];
    const range = this.parsePortRange(options.ports ?? "1-1024");
    const concurrency = options.concurrency ?? 200;
    const timeout = options.timeoutMs ?? 2000;
    let completed = 0;
    const total = range.length;

    const scanPort = async (port: number): Promise<void> => {
      return new Promise<void>((resolve) => {
        const socket = new net.Socket();
        socket.setTimeout(timeout);

        socket.on("connect", () => {
          const result: PortResult = { port, state: "open" };
          ports.push(result);
          this.emit({ kind: "port_found", ip: options.target, port: result });

          // Try banner grab
          socket.once("data", (data) => {
            result.banner = data.toString("utf-8").trim().slice(0, 256);
            socket.destroy();
          });

          setTimeout(() => socket.destroy(), 500);
        });

        socket.on("timeout", () => {
          socket.destroy();
          resolve();
        });

        socket.on("error", () => {
          socket.destroy();
          resolve();
        });

        socket.on("close", () => {
          completed++;
          if (completed % 100 === 0) {
            this.emit({
              kind: "scan_progress",
              percent: Math.round((completed / total) * 100),
            });
          }
          resolve();
        });

        socket.connect(port, options.target);
      });
    };

    // Batch scan with concurrency limit
    for (let i = 0; i < range.length; i += concurrency) {
      const batch = range.slice(i, i + concurrency);
      await Promise.all(batch.map(scanPort));
    }

    return ports.sort((a, b) => a.port - b.port);
  }

  // ── DNS Enumeration ───────────────────────────────────────────

  /** Enumerate DNS records for a domain */
  async dnsEnum(domain: string): Promise<DnsRecord[]> {
    const records: DnsRecord[] = [];
    const types = ["A", "AAAA", "MX", "NS", "TXT", "CNAME", "SOA", "SRV"];

    for (const type of types) {
      try {
        const results = (await dnsResolve(domain, type)) as unknown[];
        for (const r of results) {
          const value = typeof r === "string" ? r : JSON.stringify(r);
          records.push({ type, value });
        }
      } catch {
        // record type not found — skip
      }
    }

    // Subdomain brute force with common prefixes
    const subdomains = [
      "www",
      "mail",
      "ftp",
      "admin",
      "api",
      "dev",
      "staging",
      "test",
      "portal",
      "vpn",
      "cdn",
      "app",
      "blog",
      "shop",
      "store",
      "m",
      "ns1",
      "ns2",
      "mx",
      "smtp",
      "pop",
      "imap",
      "webmail",
      "secure",
      "login",
      "dashboard",
      "git",
      "ci",
      "jenkins",
      "jira",
      "wiki",
      "docs",
      "status",
      "monitor",
      "grafana",
    ];

    for (const sub of subdomains) {
      try {
        const results = await dnsResolve(`${sub}.${domain}`, "A");
        for (const ip of results) {
          records.push({
            type: "SUBDOMAIN",
            value: `${sub}.${domain} → ${ip}`,
          });
        }
      } catch {}
    }

    return records;
  }

  // ── Traceroute ────────────────────────────────────────────────

  async traceroute(target: string): Promise<TracerouteHop[]> {
    const hops: TracerouteHop[] = [];
    try {
      const { stdout } = await run("traceroute", ["-n", "-w", "2", "-q", "3", target], {
        timeout: 60_000,
      });
      for (const line of stdout.split("\n")) {
        const match = line.match(
          /^\s*(\d+)\s+(\S+)\s+([\d.]+)\s*ms\s+([\d.]+)\s*ms\s+([\d.]+)\s*ms/,
        );
        if (match) {
          hops.push({
            hop: parseInt(match[1]),
            ip: match[2],
            rttMs: [parseFloat(match[3]), parseFloat(match[4]), parseFloat(match[5])],
          });
        }
      }
    } catch (err) {
      this.emit({
        kind: "error",
        message: `traceroute failed: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
    return hops;
  }

  // ── Masscan (ultra-fast) ──────────────────────────────────────

  /** Ultra-fast port scan using masscan (if available) */
  async masscan(
    target: string,
    ports: string = "1-65535",
    rate: number = 10000,
  ): Promise<PortResult[]> {
    const results: PortResult[] = [];
    try {
      const { stdout } = await run(
        "masscan",
        [target, "-p", ports, "--rate", String(rate), "-oG", "-"],
        { timeout: 300_000 },
      );
      for (const line of stdout.split("\n")) {
        const match = line.match(/Ports:\s+(\d+)\/open\/(\w+)/);
        if (match) {
          results.push({
            port: parseInt(match[1]),
            state: "open",
            service: match[2],
          });
        }
      }
    } catch (err) {
      this.emit({
        kind: "error",
        message: `masscan failed: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
    return results;
  }

  // ── Dependency Check ──────────────────────────────────────────

  async checkDependencies(): Promise<{
    available: string[];
    missing: string[];
  }> {
    const tools = ["nmap", "masscan", "arp-scan", "traceroute", "host", "dig", "whois"];
    const available: string[] = [];
    const missing: string[] = [];

    for (const tool of tools) {
      try {
        await run("which", [tool]);
        available.push(tool);
      } catch {
        missing.push(tool);
      }
    }

    return { available, missing };
  }

  // ── Utilities ─────────────────────────────────────────────────

  private parsePortRange(range: string): number[] {
    const ports: number[] = [];
    for (const part of range.split(",")) {
      const trimmed = part.trim();
      if (trimmed.includes("-")) {
        const [start, end] = trimmed.split("-").map(Number);
        for (let i = start; i <= Math.min(end, 65535); i++) ports.push(i);
      } else {
        const p = parseInt(trimmed);
        if (p > 0 && p <= 65535) ports.push(p);
      }
    }
    return ports;
  }
}

export default NetworkRecon;
