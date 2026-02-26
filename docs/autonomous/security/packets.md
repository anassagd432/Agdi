---
title: "Packet Sniffer"
description: "Live packet capture, PCAP analysis, credential extraction, and traffic statistics."
---

# Packet Sniffer

## Live Capture

```typescript
import { PacketSniffer } from "agdi/autonomous";
const sniffer = new PacketSniffer();

// Start live capture
await sniffer.startCapture({
  iface: "eth0",
  filter: "port 80 or port 443",
  duration: 30, // seconds
  outputFile: "/tmp/capture.pcap",
});

// Stop manually
sniffer.stopCapture();
```

## Read & Analyze PCAP Files

```typescript
// Read packets
const packets = await sniffer.readPcap("/tmp/capture.pcap", "tcp", 100);
for (const p of packets) {
  console.log(`${p.src} → ${p.dst} [${p.protocol}] ${p.info}`);
}

// Traffic statistics
const stats = await sniffer.analyzeTraffic("/tmp/capture.pcap");
console.log(`Total packets: ${stats.totalPackets}`);
console.log("Top sources:", stats.topSources);
console.log("Protocols:", stats.protocols);
```

## Credential Extraction

```typescript
// Extract HTTP Basic Auth and FTP credentials
const creds = await sniffer.extractCredentials("/tmp/capture.pcap");
// → ["HTTP Basic: admin:password", "FTP: USER admin", "FTP: PASS secret"]
```

## DNS Query Enumeration

```typescript
const queries = await sniffer.dnsQueries("/tmp/capture.pcap");
// → ["google.com", "api.github.com", "cdn.example.com"]
```

## Dependencies

| Tool      | Purpose                |
| --------- | ---------------------- |
| `tcpdump` | Live packet capture    |
| `tshark`  | Advanced PCAP analysis |
