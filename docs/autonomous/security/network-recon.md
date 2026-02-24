---
title: "Network Recon"
description: "Host discovery, port scanning, DNS enumeration, and traceroute."
---

# Network Recon

Full network reconnaissance powered by nmap, masscan, and native TCP sockets.

## Capabilities

- **Host Discovery** — Ping sweep, ARP scan for live hosts
- **Port Scanning** — SYN, connect, UDP, ACK, FIN techniques
- **Service Detection** — Version fingerprinting on open ports
- **DNS Enumeration** — A, AAAA, MX, NS, TXT, CNAME, SOA + subdomain brute
- **Traceroute** — Full hop-by-hop path tracing
- **Masscan** — Ultra-fast scanning up to 65535 ports

## Usage

```typescript
import { NetworkRecon } from "agdi/autonomous";

const recon = new NetworkRecon();

// Event-driven results
recon.on((event) => {
  if (event.kind === "port_found") {
    console.log(`Port ${event.port.port} is ${event.port.state}`);
  }
});

// Discover live hosts
const hosts = await recon.discoverHosts("192.168.1.0/24");

// Full port scan
const result = await recon.scanPorts({
  target: "10.0.0.1",
  ports: "1-65535",
  technique: "syn",
  serviceDetection: true,
  aggressive: true,
});

// DNS enumeration (includes subdomain brute force)
const records = await recon.dnsEnum("example.com");

// Traceroute
const hops = await recon.traceroute("8.8.8.8");

// Ultra-fast masscan
const ports = await recon.masscan("10.0.0.0/24", "1-65535", 10000);
```

## Dependencies

| Tool | Required | Fallback |
|------|----------|----------|
| nmap | Recommended | Native TCP connect scan |
| masscan | Optional | — |
| arp-scan | Optional | Ping sweep |
| traceroute | Optional | — |
