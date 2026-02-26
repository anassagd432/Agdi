/**
 * AGDI Security Module — Barrel Export
 *
 * Re-exports all cybersecurity sub-modules.
 */

export { NetworkRecon } from "./network-recon.js";
export type {
  PortResult,
  HostResult,
  ScanOptions,
  TracerouteHop,
  DnsRecord,
  ReconEvent,
} from "./network-recon.js";

export { WebSecurityScanner } from "./web-scanner.js";
export type {
  Finding,
  HeaderAudit,
  SslInfo,
  WebScanOptions,
  ScanEvent,
  Severity,
} from "./web-scanner.js";

export { WifiSecurity } from "./wifi-security.js";
export type { WifiNetwork, HandshakeResult, DeauthOptions, WifiEvent } from "./wifi-security.js";

export { CryptoToolkit } from "./crypto-toolkit.js";
export type { HashResult, CrackResult, PasswordConfig } from "./crypto-toolkit.js";

export { ExploitEngine } from "./exploit-engine.js";
export type { CveInfo, ExploitResult, PayloadConfig, ExploitEvent } from "./exploit-engine.js";

export { PacketSniffer } from "./packet-sniffer.js";
export type { Packet, CaptureOptions, TrafficStats, SnifferEvent } from "./packet-sniffer.js";

export {
  InfoGathering,
  VulnAnalysis,
  WebAttacks,
  PasswordAttacks,
  WirelessAttacks,
  Exploitation,
  SniffSpoof,
  PostExploitation,
  Forensics,
  ReverseEngineering,
  SocialEngineering,
  auditKaliTools,
  runTool,
} from "./kali-tools.js";
