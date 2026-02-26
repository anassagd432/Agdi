---
title: "Web Scanner"
description: "SQL injection, XSS, directory brute-forcing, header audit, SSL analysis, and WAF detection."
---

# Web Security Scanner

Automated web application vulnerability scanner with detection for the OWASP Top 10.

## Scan Types

| Scan                | Severity    | What it detects                                 |
| ------------------- | ----------- | ----------------------------------------------- |
| **SQL Injection**   | Critical    | Error-based, blind, time-based, NoSQL injection |
| **XSS**             | High        | Reflected XSS via 12 payload vectors            |
| **Directory Brute** | Medium—High | Hidden admin panels, .git, .env, config files   |
| **Header Audit**    | Medium      | Missing HSTS, CSP, X-Frame-Options, etc.        |
| **SSL/TLS**         | High        | Weak ciphers, old protocols, self-signed certs  |
| **CORS**            | Medium—High | Misconfigured Access-Control-Allow-Origin       |
| **Open Redirect**   | Medium      | Unvalidated redirect parameters                 |
| **WAF Detection**   | Info        | Cloudflare, Akamai, ModSecurity, AWS WAF, etc.  |

## Usage

```typescript
import { WebSecurityScanner } from "agdi/autonomous";

const scanner = new WebSecurityScanner();

// Full automated scan
const findings = await scanner.fullScan({
  url: "https://target.com",
  depth: 3,
  insecure: true,
});

// Individual scans
await scanner.auditHeaders("https://target.com");
await scanner.testSqli("https://target.com/search?q=test");
await scanner.testXss("https://target.com/search?q=test");
await scanner.dirBrute("https://target.com");
await scanner.checkCors("https://target.com");
await scanner.checkSsl("https://target.com");
await scanner.detectWaf("https://target.com");

// Event-driven
scanner.on((event) => {
  if (event.kind === "finding") {
    console.log(`[${event.finding.severity}] ${event.finding.description}`);
  }
});
```
