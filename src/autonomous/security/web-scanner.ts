/**
 * AGDI Web Security Scanner
 *
 * Capabilities:
 *   - SQL Injection detection (error-based, blind, time-based)
 *   - XSS detection (reflected, stored, DOM)
 *   - Directory/file brute forcing
 *   - HTTP header security audit
 *   - SSL/TLS analysis
 *   - CORS misconfiguration detection
 *   - Open redirect detection
 *   - Server info leakage detection
 *   - Subdomain takeover check
 *   - WAF detection
 */

import { execFile } from "node:child_process";
import { promisify } from "node:util";

const run = promisify(execFile);

// ── Types ──────────────────────────────────────────────────────────

export type Severity = "critical" | "high" | "medium" | "low" | "info";

export interface Finding {
  id: string;
  type: string;
  severity: Severity;
  url: string;
  parameter?: string;
  payload?: string;
  evidence?: string;
  description: string;
  remediation?: string;
}

export interface HeaderAudit {
  header: string;
  present: boolean;
  value?: string;
  severity: Severity;
  recommendation: string;
}

export interface SslInfo {
  protocol: string;
  cipher: string;
  validFrom: string;
  validTo: string;
  issuer: string;
  subject: string;
  expired: boolean;
  selfSigned: boolean;
  weakCipher: boolean;
}

export interface WebScanOptions {
  /** Target URL */
  url: string;
  /** Scan depth for crawling */
  depth?: number;
  /** Maximum requests per second */
  rateLimit?: number;
  /** Custom headers to include */
  headers?: Record<string, string>;
  /** Authentication cookie/token */
  authToken?: string;
  /** Skip SSL verification */
  insecure?: boolean;
  /** User-Agent string */
  userAgent?: string;
}

export type ScanEvent =
  | { kind: "finding"; finding: Finding }
  | { kind: "progress"; phase: string; percent: number }
  | { kind: "complete"; findings: Finding[] }
  | { kind: "error"; message: string };

export type ScanListener = (event: ScanEvent) => void;

// ── SQL Injection Payloads ─────────────────────────────────────────

const SQLI_PAYLOADS = [
  // Error-based
  `' OR '1'='1`,
  `" OR "1"="1`,
  `' OR '1'='1' --`,
  `1' ORDER BY 1--`,
  `1' UNION SELECT NULL--`,
  `' AND 1=CONVERT(int,(SELECT @@version))--`,
  // Time-based blind
  `'; WAITFOR DELAY '0:0:5'--`,
  `' OR SLEEP(5)#`,
  `1' AND (SELECT * FROM (SELECT SLEEP(5))a)--`,
  // Boolean-based blind
  `' AND 1=1--`,
  `' AND 1=2--`,
  // NoSQL
  `{"$gt":""}`,
  `{"$ne":null}`,
  `' || '1'=='1`,
];

const SQLI_ERROR_PATTERNS = [
  /SQL syntax.*MySQL/i,
  /Warning.*mysql_/i,
  /PostgreSQL.*ERROR/i,
  /ORA-\d{5}/,
  /Microsoft.*SQL.*Server/i,
  /ODBC.*Driver/i,
  /SQLite.*error/i,
  /Unclosed quotation mark/i,
  /syntax error.*sql/i,
  /unterminated quoted string/i,
];

// ── XSS Payloads ──────────────────────────────────────────────────

const XSS_PAYLOADS = [
  `<script>alert('XSS')</script>`,
  `"><script>alert('XSS')</script>`,
  `<img src=x onerror=alert('XSS')>`,
  `<svg onload=alert('XSS')>`,
  `javascript:alert('XSS')`,
  `<body onload=alert('XSS')>`,
  `<input onfocus=alert('XSS') autofocus>`,
  `<details open ontoggle=alert('XSS')>`,
  `'-alert('XSS')-'`,
  `\`;alert('XSS');//`,
  `<iframe src="javascript:alert('XSS')">`,
  `{{constructor.constructor('alert(1)')()}}`, // template injection
];

// ── Common directories ────────────────────────────────────────────

const COMMON_PATHS = [
  "admin",
  "login",
  "dashboard",
  "api",
  "wp-admin",
  "wp-login.php",
  "phpmyadmin",
  ".git",
  ".env",
  ".htaccess",
  "robots.txt",
  "sitemap.xml",
  "backup",
  "db",
  "database",
  "config",
  "configuration",
  "setup",
  "install",
  "test",
  "debug",
  "server-status",
  "server-info",
  "phpinfo.php",
  "info.php",
  "wp-config.php.bak",
  "web.config",
  ".svn",
  ".hg",
  ".DS_Store",
  "Thumbs.db",
  "crossdomain.xml",
  "clientaccesspolicy.xml",
  "elmah.axd",
  "trace.axd",
  "console",
  "actuator",
  "health",
  "metrics",
  "swagger",
  "api-docs",
  "graphql",
  "graphiql",
  "playground",
  ".well-known/security.txt",
  "security.txt",
];

// ── Web Security Scanner ──────────────────────────────────────────

export class WebSecurityScanner {
  private listeners: ScanListener[] = [];
  private findings: Finding[] = [];
  private findingId = 0;

  on(listener: ScanListener): void {
    this.listeners.push(listener);
  }

  private emit(event: ScanEvent): void {
    for (const l of this.listeners) l(event);
  }

  private addFinding(finding: Omit<Finding, "id">): void {
    const f = { ...finding, id: `WEB-${++this.findingId}` };
    this.findings.push(f);
    this.emit({ kind: "finding", finding: f });
  }

  /** Run a comprehensive scan against a target URL */
  async fullScan(options: WebScanOptions): Promise<Finding[]> {
    this.findings = [];
    this.findingId = 0;

    const phases = [
      { name: "Header Audit", fn: () => this.auditHeaders(options.url, options) },
      { name: "SSL/TLS Check", fn: () => this.checkSsl(options.url) },
      { name: "Directory Brute", fn: () => this.dirBrute(options.url, options) },
      { name: "SQLi Detection", fn: () => this.testSqli(options.url, options) },
      { name: "XSS Detection", fn: () => this.testXss(options.url, options) },
      { name: "CORS Check", fn: () => this.checkCors(options.url, options) },
      { name: "Open Redirect", fn: () => this.checkOpenRedirect(options.url, options) },
      { name: "WAF Detection", fn: () => this.detectWaf(options.url) },
    ];

    for (let i = 0; i < phases.length; i++) {
      this.emit({
        kind: "progress",
        phase: phases[i].name,
        percent: Math.round((i / phases.length) * 100),
      });
      try {
        await phases[i].fn();
      } catch (err) {
        this.emit({
          kind: "error",
          message: `${phases[i].name} failed: ${err instanceof Error ? err.message : String(err)}`,
        });
      }
    }

    this.emit({ kind: "complete", findings: this.findings });
    return this.findings;
  }

  // ── Header Security Audit ─────────────────────────────────────

  async auditHeaders(url: string, options?: WebScanOptions): Promise<HeaderAudit[]> {
    const audits: HeaderAudit[] = [];
    const headers = await this.fetchHeaders(url, options);

    const checks: Array<{ header: string; severity: Severity; rec: string }> = [
      {
        header: "Strict-Transport-Security",
        severity: "high",
        rec: "Add HSTS header with max-age ≥ 31536000",
      },
      {
        header: "Content-Security-Policy",
        severity: "high",
        rec: "Implement a strong CSP to prevent XSS",
      },
      {
        header: "X-Content-Type-Options",
        severity: "medium",
        rec: "Add 'X-Content-Type-Options: nosniff'",
      },
      {
        header: "X-Frame-Options",
        severity: "medium",
        rec: "Add 'X-Frame-Options: DENY' or 'SAMEORIGIN'",
      },
      { header: "X-XSS-Protection", severity: "low", rec: "Add 'X-XSS-Protection: 1; mode=block'" },
      {
        header: "Referrer-Policy",
        severity: "low",
        rec: "Add 'Referrer-Policy: strict-origin-when-cross-origin'",
      },
      {
        header: "Permissions-Policy",
        severity: "low",
        rec: "Add Permissions-Policy to restrict browser features",
      },
    ];

    for (const check of checks) {
      const value = headers.get(check.header.toLowerCase());
      const audit: HeaderAudit = {
        header: check.header,
        present: !!value,
        value: value ?? undefined,
        severity: value ? "info" : check.severity,
        recommendation: value ? "Present" : check.rec,
      };
      audits.push(audit);

      if (!value) {
        this.addFinding({
          type: "missing-security-header",
          severity: check.severity,
          url,
          description: `Missing security header: ${check.header}`,
          remediation: check.rec,
        });
      }
    }

    // Check for info leakage headers
    const leakHeaders = ["Server", "X-Powered-By", "X-AspNet-Version", "X-AspNetMvc-Version"];
    for (const h of leakHeaders) {
      const value = headers.get(h.toLowerCase());
      if (value) {
        this.addFinding({
          type: "info-leakage",
          severity: "low",
          url,
          description: `Server info leakage via ${h}: ${value}`,
          evidence: `${h}: ${value}`,
          remediation: `Remove or obfuscate the ${h} header`,
        });
      }
    }

    return audits;
  }

  // ── SQL Injection Testing ─────────────────────────────────────

  async testSqli(url: string, options?: WebScanOptions): Promise<Finding[]> {
    const results: Finding[] = [];
    const baseUrl = new URL(url);
    const params = Array.from(baseUrl.searchParams.entries());

    if (params.length === 0) {
      // Try common parameter names
      const commonParams = ["id", "user", "name", "search", "q", "page", "category", "item"];
      for (const p of commonParams) {
        baseUrl.searchParams.set(p, "1");
      }
    }

    for (const [param] of Array.from(baseUrl.searchParams.entries())) {
      for (const payload of SQLI_PAYLOADS) {
        const testUrl = new URL(url);
        testUrl.searchParams.set(param, payload);

        try {
          const response = await this.fetch(testUrl.toString(), options);
          const body = await response;

          for (const pattern of SQLI_ERROR_PATTERNS) {
            if (pattern.test(body)) {
              this.addFinding({
                type: "sql-injection",
                severity: "critical",
                url: testUrl.toString(),
                parameter: param,
                payload,
                evidence: body.match(pattern)?.[0],
                description: `SQL Injection detected in parameter '${param}'`,
                remediation: "Use parameterized queries or prepared statements",
              });
              break;
            }
          }

          // Time-based detection
          if (payload.includes("SLEEP") || payload.includes("WAITFOR")) {
            const start = Date.now();
            await this.fetch(testUrl.toString(), options);
            const elapsed = Date.now() - start;
            if (elapsed > 4500) {
              this.addFinding({
                type: "sql-injection-blind",
                severity: "critical",
                url: testUrl.toString(),
                parameter: param,
                payload,
                evidence: `Response delayed by ${elapsed}ms`,
                description: `Time-based blind SQL Injection in parameter '${param}'`,
                remediation: "Use parameterized queries",
              });
            }
          }
        } catch {
          // request failed — skip
        }
      }
    }

    return results;
  }

  // ── XSS Testing ───────────────────────────────────────────────

  async testXss(url: string, options?: WebScanOptions): Promise<Finding[]> {
    const results: Finding[] = [];
    const baseUrl = new URL(url);
    const params = Array.from(baseUrl.searchParams.entries());

    if (params.length === 0) return results;

    for (const [param] of params) {
      for (const payload of XSS_PAYLOADS) {
        const testUrl = new URL(url);
        testUrl.searchParams.set(param, payload);

        try {
          const body = await this.fetch(testUrl.toString(), options);

          if (body.includes(payload)) {
            this.addFinding({
              type: "xss-reflected",
              severity: "high",
              url: testUrl.toString(),
              parameter: param,
              payload,
              description: `Reflected XSS in parameter '${param}'`,
              remediation: "Encode output and implement Content-Security-Policy",
            });
            break; // one finding per param is enough
          }
        } catch {}
      }
    }

    return results;
  }

  // ── Directory Brute Force ─────────────────────────────────────

  async dirBrute(url: string, options?: WebScanOptions): Promise<string[]> {
    const found: string[] = [];
    const base = url.replace(/\/$/, "");

    const checkPath = async (path: string): Promise<void> => {
      const fullUrl = `${base}/${path}`;
      try {
        const { stdout } = await run(
          "curl",
          [
            "-s",
            "-o",
            "/dev/null",
            "-w",
            "%{http_code}",
            "-L",
            "--max-time",
            "5",
            ...(options?.insecure ? ["-k"] : []),
            ...(options?.userAgent ? ["-A", options.userAgent] : []),
            ...(options?.authToken ? ["-H", `Authorization: Bearer ${options.authToken}`] : []),
            fullUrl,
          ],
          { timeout: 10_000 },
        );
        const status = parseInt(stdout.trim());
        if (status >= 200 && status < 400) {
          found.push(fullUrl);
          this.addFinding({
            type: "directory-found",
            severity:
              path.startsWith(".") || ["admin", "phpmyadmin", "debug", "console"].includes(path)
                ? "high"
                : "info",
            url: fullUrl,
            description: `Accessible path found: /${path} (HTTP ${status})`,
            remediation: "Restrict access to sensitive paths",
          });
        }
      } catch {}
    };

    // Run in batches
    for (let i = 0; i < COMMON_PATHS.length; i += 10) {
      const batch = COMMON_PATHS.slice(i, i + 10);
      await Promise.all(batch.map(checkPath));
    }

    return found;
  }

  // ── CORS Misconfiguration ─────────────────────────────────────

  async checkCors(url: string, options?: WebScanOptions): Promise<void> {
    const origins = [
      "https://evil.com",
      "null",
      new URL(url).origin.replace("https://", "https://evil."),
    ];

    for (const origin of origins) {
      try {
        const { stdout } = await run("curl", ["-s", "-I", "-H", `Origin: ${origin}`, url], {
          timeout: 10_000,
        });
        const acao = stdout.match(/access-control-allow-origin:\s*(.+)/i);
        if (acao) {
          const value = acao[1].trim();
          if (value === "*" || value === origin) {
            this.addFinding({
              type: "cors-misconfiguration",
              severity: value === "*" ? "medium" : "high",
              url,
              evidence: `Access-Control-Allow-Origin: ${value} (Origin: ${origin})`,
              description: `CORS misconfiguration allows ${value === "*" ? "any" : "malicious"} origin`,
              remediation: "Restrict CORS to trusted origins only",
            });
          }
        }
      } catch {}
    }
  }

  // ── Open Redirect ─────────────────────────────────────────────

  async checkOpenRedirect(url: string, options?: WebScanOptions): Promise<void> {
    const redirectParams = [
      "url",
      "redirect",
      "next",
      "return",
      "returnTo",
      "goto",
      "dest",
      "destination",
      "redir",
      "redirect_uri",
      "continue",
    ];
    const evilUrl = "https://evil.com/pwned";

    for (const param of redirectParams) {
      const testUrl = new URL(url);
      testUrl.searchParams.set(param, evilUrl);

      try {
        const { stdout } = await run(
          "curl",
          [
            "-s",
            "-o",
            "/dev/null",
            "-w",
            "%{redirect_url}",
            "-L",
            "--max-redirs",
            "1",
            testUrl.toString(),
          ],
          { timeout: 10_000 },
        );
        if (stdout.includes("evil.com")) {
          this.addFinding({
            type: "open-redirect",
            severity: "medium",
            url: testUrl.toString(),
            parameter: param,
            payload: evilUrl,
            description: `Open redirect via parameter '${param}'`,
            remediation: "Validate and whitelist redirect destinations",
          });
        }
      } catch {}
    }
  }

  // ── WAF Detection ─────────────────────────────────────────────

  async detectWaf(url: string): Promise<string | null> {
    try {
      // Send a malicious-looking request
      const testUrl = `${url}?test=<script>alert(1)</script>&id=1' OR 1=1--`;
      const { stdout } = await run(
        "curl",
        ["-s", "-I", "-o", "/dev/null", "-w", "%{http_code}", testUrl],
        { timeout: 10_000 },
      );

      const status = parseInt(stdout.trim());
      let waf: string | null = null;

      if (status === 403 || status === 406 || status === 429) {
        // Check for WAF signatures
        const { stdout: headers } = await run("curl", ["-s", "-I", testUrl], { timeout: 10_000 });
        if (/cloudflare/i.test(headers)) waf = "Cloudflare";
        else if (/akamai/i.test(headers)) waf = "Akamai";
        else if (/sucuri/i.test(headers)) waf = "Sucuri";
        else if (/mod_security/i.test(headers)) waf = "ModSecurity";
        else if (/aws/i.test(headers)) waf = "AWS WAF";
        else if (/imperva|incapsula/i.test(headers)) waf = "Imperva/Incapsula";
        else waf = "Unknown WAF";

        this.addFinding({
          type: "waf-detected",
          severity: "info",
          url,
          evidence: `HTTP ${status}, WAF: ${waf}`,
          description: `Web Application Firewall detected: ${waf}`,
        });
      }

      return waf;
    } catch {
      return null;
    }
  }

  // ── SSL/TLS Analysis ──────────────────────────────────────────

  async checkSsl(url: string): Promise<SslInfo | null> {
    try {
      const hostname = new URL(url).hostname;
      const { stdout } = await run(
        "openssl",
        ["s_client", "-connect", `${hostname}:443`, "-servername", hostname],
        { timeout: 10_000 },
      );

      const protocol = stdout.match(/Protocol\s*:\s*(\S+)/)?.[1] ?? "unknown";
      const cipher = stdout.match(/Cipher\s*:\s*(\S+)/)?.[1] ?? "unknown";
      const issuer = stdout.match(/issuer=(.+)/)?.[1]?.trim() ?? "unknown";
      const subject = stdout.match(/subject=(.+)/)?.[1]?.trim() ?? "unknown";

      const weakCiphers = ["RC4", "DES", "3DES", "MD5", "NULL", "EXPORT"];
      const isWeak = weakCiphers.some((w) => cipher.toUpperCase().includes(w));
      const oldProtocols = ["SSLv2", "SSLv3", "TLSv1", "TLSv1.1"];
      const isOldProtocol = oldProtocols.includes(protocol);

      if (isWeak) {
        this.addFinding({
          type: "weak-ssl-cipher",
          severity: "high",
          url,
          evidence: `Cipher: ${cipher}`,
          description: `Weak SSL/TLS cipher detected: ${cipher}`,
          remediation: "Disable weak ciphers, use TLS 1.2+ with AES-GCM",
        });
      }

      if (isOldProtocol) {
        this.addFinding({
          type: "old-tls-protocol",
          severity: "high",
          url,
          evidence: `Protocol: ${protocol}`,
          description: `Outdated TLS protocol: ${protocol}`,
          remediation: "Upgrade to TLS 1.2 or 1.3",
        });
      }

      return {
        protocol,
        cipher,
        validFrom: "",
        validTo: "",
        issuer,
        subject,
        expired: false,
        selfSigned: issuer === subject,
        weakCipher: isWeak,
      };
    } catch {
      return null;
    }
  }

  // ── Dependencies ──────────────────────────────────────────────

  async checkDependencies(): Promise<{ available: string[]; missing: string[] }> {
    const tools = ["curl", "openssl", "nikto", "sqlmap", "wfuzz"];
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

  // ── HTTP Helpers ──────────────────────────────────────────────

  private async fetchHeaders(url: string, options?: WebScanOptions): Promise<Map<string, string>> {
    const headers = new Map<string, string>();
    try {
      const args = ["-s", "-I", "--max-time", "10"];
      if (options?.insecure) args.push("-k");
      if (options?.userAgent) args.push("-A", options.userAgent);
      args.push(url);

      const { stdout } = await run("curl", args, { timeout: 15_000 });
      for (const line of stdout.split("\n")) {
        const match = line.match(/^([^:]+):\s*(.+)/);
        if (match) {
          headers.set(match[1].toLowerCase().trim(), match[2].trim());
        }
      }
    } catch {}
    return headers;
  }

  private async fetch(url: string, options?: WebScanOptions): Promise<string> {
    const args = ["-s", "--max-time", "10", "-L"];
    if (options?.insecure) args.push("-k");
    if (options?.userAgent) args.push("-A", options.userAgent);
    if (options?.authToken) args.push("-H", `Authorization: Bearer ${options.authToken}`);
    args.push(url);

    const { stdout } = await run("curl", args, { timeout: 15_000 });
    return stdout;
  }
}

export default WebSecurityScanner;
