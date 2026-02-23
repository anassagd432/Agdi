---
title: "WiFi Security"
description: "Wireless network scanning, handshake capture, deauthentication, and WPA cracking."
---

# WiFi Security

Full wireless security testing powered by the aircrack-ng suite.

## Capabilities

- **Network Scanning** — Enumerate all WiFi networks via nmcli or airodump-ng
- **Monitor Mode** — Enable/disable monitor mode on wireless interfaces
- **Handshake Capture** — Capture WPA/WPA2 4-way handshakes
- **Deauthentication** — Send deauth packets for authorized testing
- **WPS Testing** — Check for WPS PIN vulnerabilities with Reaver
- **Handshake Cracking** — Crack captured handshakes with wordlists

## Usage

```typescript
import { WifiSecurity } from "agdi/autonomous";

const wifi = new WifiSecurity();

// Scan networks (no root needed)
const networks = await wifi.scanNetworks();

// Enable monitor mode (requires root)
const monIface = await wifi.enableMonitor("wlan0");

// Capture handshake
const hs = await wifi.captureHandshake("AA:BB:CC:DD:EE:FF", 6, monIface);

// Deauth to force handshake
await wifi.deauth({ bssid: "AA:BB:CC:DD:EE:FF", iface: monIface, count: 10 });

// Crack with wordlist
const result = await wifi.crackHandshake(hs.filePath!, "/usr/share/wordlists/rockyou.txt");

// Cleanup
await wifi.disableMonitor();
```

## Dependencies

Requires the `aircrack-ng` suite. Install on Kali/Debian:

```bash
sudo apt install aircrack-ng reaver
```
