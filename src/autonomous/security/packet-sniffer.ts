/**
 * AGDI Packet Sniffer
 * Packet capture, protocol decoding, traffic analysis via tcpdump/tshark.
 */

import { execFile, spawn, ChildProcess } from "node:child_process";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { promisify } from "node:util";

const run = promisify(execFile);

export interface Packet {
  timestamp: string;
  src: string;
  dst: string;
  protocol: string;
  length: number;
  info: string;
}
export interface CaptureOptions {
  iface?: string;
  filter?: string;
  count?: number;
  duration?: number;
  outputFile?: string;
  promiscuous?: boolean;
}
export interface TrafficStats {
  totalPackets: number;
  protocols: Record<string, number>;
  topSources: [string, number][];
  topDests: [string, number][];
}

export type SnifferEvent =
  | { kind: "packet"; packet: Packet }
  | { kind: "stats"; stats: TrafficStats }
  | { kind: "status"; message: string }
  | { kind: "error"; message: string };
export type SnifferListener = (e: SnifferEvent) => void;

export class PacketSniffer {
  private listeners: SnifferListener[] = [];
  private captureProcess: ChildProcess | null = null;
  private captureDir = path.join(os.tmpdir(), "agdi-captures");

  on(l: SnifferListener): void {
    this.listeners.push(l);
  }
  private emit(e: SnifferEvent): void {
    for (const l of this.listeners) l(e);
  }

  async getInterfaces(): Promise<string[]> {
    try {
      const { stdout } = await run("ip", ["link", "show"], { timeout: 5000 });
      return stdout
        .split("\n")
        .filter((l) => /^\d+:/.test(l))
        .map((l) => l.match(/^\d+:\s+(\S+):/)?.[1] ?? "")
        .filter(Boolean);
    } catch {
      return [];
    }
  }

  // ── Live Capture ──────────────────────────────────────────
  async startCapture(options: CaptureOptions = {}): Promise<void> {
    await fs.mkdir(this.captureDir, { recursive: true });
    const iface = options.iface ?? "any";
    const outFile = options.outputFile ?? path.join(this.captureDir, `cap-${Date.now()}.pcap`);
    const args = ["-i", iface, "-w", outFile, "-l"];
    if (options.filter) args.push(options.filter);
    if (options.count) args.push("-c", String(options.count));
    if (!options.promiscuous) args.push("-p");

    this.emit({ kind: "status", message: `Capturing on ${iface} → ${outFile}` });
    this.captureProcess = spawn("tcpdump", args);

    this.captureProcess.stderr?.on("data", (data: Buffer) => {
      const line = data.toString().trim();
      if (line) this.emit({ kind: "status", message: line });
    });

    if (options.duration) {
      setTimeout(() => this.stopCapture(), options.duration * 1000);
    }
  }

  stopCapture(): void {
    if (this.captureProcess) {
      this.captureProcess.kill("SIGINT");
      this.captureProcess = null;
      this.emit({ kind: "status", message: "Capture stopped" });
    }
  }

  // ── Read PCAP ─────────────────────────────────────────────
  async readPcap(pcapFile: string, filter?: string, maxPackets = 100): Promise<Packet[]> {
    const packets: Packet[] = [];
    const args = [
      "-r",
      pcapFile,
      "-T",
      "fields",
      "-e",
      "frame.time",
      "-e",
      "ip.src",
      "-e",
      "ip.dst",
      "-e",
      "frame.protocols",
      "-e",
      "frame.len",
      "-e",
      "_ws.col.Info",
      "-E",
      "separator=|",
      "-c",
      String(maxPackets),
    ];
    if (filter) args.push("-Y", filter);

    try {
      const { stdout } = await run("tshark", args, { timeout: 30_000 });
      for (const line of stdout.split("\n")) {
        if (!line.trim()) continue;
        const [ts, src, dst, proto, len, info] = line.split("|");
        packets.push({
          timestamp: ts ?? "",
          src: src ?? "",
          dst: dst ?? "",
          protocol: proto?.split(":").pop() ?? "",
          length: parseInt(len ?? "0"),
          info: info ?? "",
        });
      }
    } catch {
      // Fallback: tcpdump
      const tdArgs = ["-r", pcapFile, "-nn", "-c", String(maxPackets)];
      if (filter) tdArgs.push(filter);
      try {
        const { stdout } = await run("tcpdump", tdArgs, { timeout: 30_000 });
        for (const line of stdout.split("\n")) {
          if (!line.trim()) continue;
          const m = line.match(/^(\S+)\s+IP\s+(\S+)\s+>\s+(\S+?):\s+(.+)/);
          if (m)
            packets.push({
              timestamp: m[1],
              src: m[2],
              dst: m[3],
              protocol: "TCP/IP",
              length: 0,
              info: m[4],
            });
        }
      } catch {}
    }
    return packets;
  }

  // ── Traffic Analysis ──────────────────────────────────────
  async analyzeTraffic(pcapFile: string): Promise<TrafficStats> {
    const packets = await this.readPcap(pcapFile, undefined, 10000);
    const protocols: Record<string, number> = {};
    const sources: Record<string, number> = {};
    const dests: Record<string, number> = {};

    for (const p of packets) {
      protocols[p.protocol] = (protocols[p.protocol] ?? 0) + 1;
      if (p.src) sources[p.src] = (sources[p.src] ?? 0) + 1;
      if (p.dst) dests[p.dst] = (dests[p.dst] ?? 0) + 1;
    }

    const topN = (obj: Record<string, number>, n = 10): [string, number][] =>
      Object.entries(obj)
        .sort((a, b) => b[1] - a[1])
        .slice(0, n);

    const stats: TrafficStats = {
      totalPackets: packets.length,
      protocols,
      topSources: topN(sources),
      topDests: topN(dests),
    };
    this.emit({ kind: "stats", stats });
    return stats;
  }

  // ── Protocol Filters ──────────────────────────────────────
  async extractCredentials(pcapFile: string): Promise<string[]> {
    const creds: string[] = [];
    try {
      // HTTP auth
      const { stdout: http } = await run(
        "tshark",
        ["-r", pcapFile, "-Y", "http.authbasic", "-T", "fields", "-e", "http.authbasic"],
        { timeout: 30_000 },
      );
      for (const l of http.split("\n")) if (l.trim()) creds.push(`HTTP Basic: ${l.trim()}`);
      // FTP
      const { stdout: ftp } = await run(
        "tshark",
        [
          "-r",
          pcapFile,
          "-Y",
          "ftp.request.command == USER || ftp.request.command == PASS",
          "-T",
          "fields",
          "-e",
          "ftp.request.command",
          "-e",
          "ftp.request.arg",
        ],
        { timeout: 30_000 },
      );
      for (const l of ftp.split("\n")) if (l.trim()) creds.push(`FTP: ${l.trim()}`);
    } catch {}
    return creds;
  }

  async dnsQueries(pcapFile: string): Promise<string[]> {
    try {
      const { stdout } = await run(
        "tshark",
        ["-r", pcapFile, "-Y", "dns.qry.name", "-T", "fields", "-e", "dns.qry.name"],
        { timeout: 30_000 },
      );
      return [
        ...new Set(
          stdout
            .split("\n")
            .map((l) => l.trim())
            .filter(Boolean),
        ),
      ];
    } catch {
      return [];
    }
  }

  async checkDependencies(): Promise<{ available: string[]; missing: string[] }> {
    const tools = ["tcpdump", "tshark", "wireshark", "capinfos"];
    const available: string[] = [];
    const missing: string[] = [];
    for (const t of tools) {
      try {
        await run("which", [t]);
        available.push(t);
      } catch {
        missing.push(t);
      }
    }
    return { available, missing };
  }
}

export default PacketSniffer;
