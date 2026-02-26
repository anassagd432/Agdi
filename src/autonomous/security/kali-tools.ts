/**
 * AGDI Kali Linux Tools Integration
 *
 * Unified wrapper for 100+ Kali tools across all categories:
 *   Information Gathering, Vulnerability Analysis, Web Application,
 *   Password Attacks, Wireless, Exploitation, Sniffing/Spoofing,
 *   Post-Exploitation, Forensics, Reverse Engineering, Social Engineering.
 */

import { execFile } from "node:child_process";
import { promisify } from "node:util";

const run = promisify(execFile);

export interface ToolExecResult {
  tool: string;
  exitCode: number;
  stdout: string;
  stderr: string;
  durationMs: number;
}

/** Execute any Kali tool directly */
async function exec(tool: string, args: string[], timeoutMs = 120_000): Promise<ToolExecResult> {
  const start = Date.now();
  try {
    const { stdout, stderr } = await run(tool, args, {
      timeout: timeoutMs,
      maxBuffer: 50 * 1024 * 1024,
    });
    return { tool, exitCode: 0, stdout, stderr, durationMs: Date.now() - start };
  } catch (err: unknown) {
    const e = err as { stdout?: string; stderr?: string; code?: number };
    return {
      tool,
      exitCode: e.code ?? 1,
      stdout: e.stdout ?? "",
      stderr: e.stderr ?? String(err),
      durationMs: Date.now() - start,
    };
  }
}

// ── INFORMATION GATHERING ────────────────────────────────────────

export const InfoGathering = {
  nmap: (target: string, ...args: string[]) => exec("nmap", [target, ...args]),
  masscan: (target: string, ports: string, rate = "1000") =>
    exec("masscan", [target, "-p", ports, "--rate", rate]),
  amass: (domain: string) => exec("amass", ["enum", "-passive", "-d", domain], 300_000),
  sublister: (domain: string) => exec("sublist3r", ["-d", domain]),
  theHarvester: (domain: string, source = "all") =>
    exec("theHarvester", ["-d", domain, "-b", source]),
  dnsrecon: (domain: string) => exec("dnsrecon", ["-d", domain]),
  dnsenum: (domain: string) => exec("dnsenum", [domain]),
  fierce: (domain: string) => exec("fierce", ["--domain", domain]),
  shodan: (query: string) => exec("shodan", ["search", query]),
  recon_ng: (...cmds: string[]) => exec("recon-ng", ["-x", cmds.join(";")]),
  whois: (target: string) => exec("whois", [target]),
  dmitry: (target: string) => exec("dmitry", ["-wnspb", target]),
  maltego: () => exec("maltego", []),
  spiderfoot: (target: string) => exec("spiderfoot", ["-s", target, "-q"]),
  enum4linux: (target: string) => exec("enum4linux", ["-a", target]),
  smbclient: (target: string) => exec("smbclient", ["-L", target, "-N"]),
  snmpwalk: (target: string, community = "public") =>
    exec("snmpwalk", ["-v2c", "-c", community, target]),
  netdiscover: (range: string) => exec("netdiscover", ["-r", range, "-P"]),
  arpscan: (iface = "eth0") => exec("arp-scan", ["-l", "-I", iface]),
  wafw00f: (url: string) => exec("wafw00f", [url]),
};

// ── VULNERABILITY ANALYSIS ───────────────────────────────────────

export const VulnAnalysis = {
  nmapVuln: (target: string) => exec("nmap", ["--script", "vuln", "-sV", target], 300_000),
  nikto: (target: string) => exec("nikto", ["-h", target]),
  openvas: (target: string) =>
    exec("gvm-cli", [
      "socket",
      "--socketpath",
      "/var/run/gvmd/gvmd.sock",
      "--xml",
      `<create_target><name>${target}</name><hosts>${target}</hosts></create_target>`,
    ]),
  wpscan: (url: string) => exec("wpscan", ["--url", url, "--enumerate", "vp,vt,u"]),
  joomscan: (url: string) => exec("joomscan", ["-u", url]),
  drupalscan: (url: string) => exec("droopescan", ["scan", "drupal", "-u", url]),
  lynis: () => exec("lynis", ["audit", "system", "--quick", "--no-colors"]),
  legion: (target: string) => exec("legion", [target]),
  vulners: (target: string) => exec("nmap", ["--script", "vulners", "-sV", target]),
};

// ── WEB APPLICATION ATTACKS ──────────────────────────────────────

export const WebAttacks = {
  sqlmap: (url: string, ...args: string[]) =>
    exec("sqlmap", ["-u", url, "--batch", ...args], 300_000),
  burpsuite: () => exec("burpsuite", []),
  zaproxy: (target: string) => exec("zap-cli", ["quick-scan", target]),
  dirb: (url: string, wordlist = "/usr/share/wordlists/dirb/common.txt") =>
    exec("dirb", [url, wordlist]),
  gobuster: (url: string, wordlist = "/usr/share/wordlists/dirb/common.txt") =>
    exec("gobuster", ["dir", "-u", url, "-w", wordlist]),
  ffuf: (url: string, wordlist: string) => exec("ffuf", ["-u", `${url}/FUZZ`, "-w", wordlist]),
  wfuzz: (url: string, wordlist: string) =>
    exec("wfuzz", ["-c", "-w", wordlist, "--hc", "404", `${url}/FUZZ`]),
  commix: (url: string) => exec("commix", ["--url", url, "--batch"]),
  xsser: (url: string) => exec("xsser", ["-u", url, "--auto"]),
  whatweb: (url: string) => exec("whatweb", [url]),
  skipfish: (url: string, outputDir: string) => exec("skipfish", ["-o", outputDir, url]),
  davtest: (url: string) => exec("davtest", ["-url", url]),
  cadaver: (url: string) => exec("cadaver", [url]),
  httprint: (target: string) => exec("httprint", ["-h", target]),
  sslyze: (host: string) => exec("sslyze", [host]),
  testssl: (host: string) => exec("testssl.sh", [host]),
};

// ── PASSWORD ATTACKS ─────────────────────────────────────────────

export const PasswordAttacks = {
  hydra: (target: string, service: string, userList: string, passlist: string) =>
    exec("hydra", ["-L", userList, "-P", passlist, target, service], 600_000),
  hashcat: (hash: string, mode: string, wordlist: string) =>
    exec("hashcat", ["-m", mode, "-a", "0", hash, wordlist, "--force"], 600_000),
  john: (hashFile: string, wordlist = "/usr/share/wordlists/rockyou.txt") =>
    exec("john", [`--wordlist=${wordlist}`, hashFile], 600_000),
  johnShow: (hashFile: string) => exec("john", ["--show", hashFile]),
  medusa: (target: string, module: string, userList: string, passList: string) =>
    exec("medusa", ["-h", target, "-U", userList, "-P", passList, "-M", module]),
  ncrack: (target: string, service: string) => exec("ncrack", [`${service}://${target}`]),
  cewl: (url: string) => exec("cewl", [url]),
  crunch: (min: string, max: string, charset: string) => exec("crunch", [min, max, charset]),
  ophcrack: () => exec("ophcrack", []),
  rainbowcrack: (hash: string) => exec("rcrack", [".", "-h", hash]),
  hashIdentifier: (hash: string) => exec("hash-identifier", [], 5000),
  patator: (module: string, ...args: string[]) => exec("patator", [module, ...args]),
};

// ── WIRELESS ATTACKS ─────────────────────────────────────────────

export const WirelessAttacks = {
  airmonNg: (action: string, iface: string) => exec("airmon-ng", [action, iface]),
  airodumpNg: (iface: string, ...args: string[]) => exec("airodump-ng", [iface, ...args]),
  aireplayNg: (attack: string, ...args: string[]) => exec("aireplay-ng", [attack, ...args]),
  aircrackNg: (capFile: string, wordlist: string) =>
    exec("aircrack-ng", ["-w", wordlist, capFile], 600_000),
  reaver: (iface: string, bssid: string) => exec("reaver", ["-i", iface, "-b", bssid, "-vvv"]),
  pixiewps: (pkE: string, pkR: string, eHash1: string, eHash2: string, authKey: string) =>
    exec("pixiewps", ["-e", pkE, "-r", pkR, "-s", eHash1, "-z", eHash2, "-a", authKey]),
  wifite: () => exec("wifite", ["--kill"]),
  fern: () => exec("fern-wifi-cracker", []),
  bettercap: (...args: string[]) => exec("bettercap", args),
  kismet: () => exec("kismet", []),
  fluxion: () => exec("fluxion", []),
  mdk3: (iface: string, attack: string) => exec("mdk3", [iface, attack]),
};

// ── EXPLOITATION TOOLS ───────────────────────────────────────────

export const Exploitation = {
  msfconsole: (resource: string) => exec("msfconsole", ["-q", "-r", resource], 300_000),
  msfvenom: (...args: string[]) => exec("msfvenom", args),
  searchsploit: (query: string) => exec("searchsploit", [query]),
  setoolkit: () => exec("setoolkit", []),
  beefXss: () => exec("beef-xss", []),
  routersploit: () => exec("rsf", []),
  crackmapexec: (proto: string, target: string, ...args: string[]) =>
    exec("crackmapexec", [proto, target, ...args]),
  impacket: (script: string, ...args: string[]) => exec(script, args),
  empire: () => exec("powershell-empire", ["server"]),
  covenant: () => exec("covenant", []),
};

// ── SNIFFING & SPOOFING ─────────────────────────────────────────

export const SniffSpoof = {
  wireshark: (iface: string) => exec("wireshark", ["-k", "-i", iface]),
  tcpdump: (iface: string, filter = "") =>
    exec("tcpdump", ["-i", iface, ...(filter ? [filter] : [])]),
  tshark: (iface: string, ...args: string[]) => exec("tshark", ["-i", iface, ...args]),
  ettercap: (iface: string) => exec("ettercap", ["-T", "-i", iface]),
  arpspoof: (iface: string, target: string, gateway: string) =>
    exec("arpspoof", ["-i", iface, "-t", target, gateway]),
  dsniff: (iface: string) => exec("dsniff", ["-i", iface]),
  mitmproxy: (port = "8080") => exec("mitmproxy", ["-p", port]),
  responder: (iface: string) => exec("responder", ["-I", iface]),
  macchanger: (iface: string, mode = "-r") => exec("macchanger", [mode, iface]),
  sslstrip: () => exec("sslstrip", ["-l", "10000"]),
  netsniffNg: (iface: string) => exec("netsniff-ng", ["-i", iface]),
  scapy: (script: string) => exec("scapy", ["-c", script]),
};

// ── POST-EXPLOITATION ────────────────────────────────────────────

export const PostExploitation = {
  linpeas: () =>
    exec("bash", [
      "-c",
      "curl -fsSL https://github.com/carlospolop/PEASS-ng/releases/latest/download/linpeas.sh | sh",
    ]),
  linenum: () => exec("bash", ["/opt/LinEnum/LinEnum.sh"]),
  mimikatz: (...args: string[]) => exec("mimikatz", args),
  lazagne: () => exec("lazagne", ["all"]),
  bloodhound: () => exec("bloodhound", []),
  powersploit: (module: string) =>
    exec("powershell", ["-c", `Import-Module PowerSploit; ${module}`]),
  pivoting: (lhost: string, lport: string, rhost: string) =>
    exec("chisel", ["server", "-p", lport, "--reverse"]),
  proxychains: (cmd: string, ...args: string[]) => exec("proxychains4", [cmd, ...args]),
  weevely: (url: string, password: string) => exec("weevely", [url, password]),
};

// ── FORENSICS ────────────────────────────────────────────────────

export const Forensics = {
  autopsy: () => exec("autopsy", []),
  volatility: (dumpFile: string, profile: string, plugin: string) =>
    exec("vol.py", ["-f", dumpFile, `--profile=${profile}`, plugin]),
  binwalk: (file: string) => exec("binwalk", [file]),
  foremost: (file: string, outputDir: string) => exec("foremost", ["-i", file, "-o", outputDir]),
  scalpel: (file: string, outputDir: string) => exec("scalpel", [file, "-o", outputDir]),
  bulk_extractor: (file: string, outputDir: string) =>
    exec("bulk_extractor", ["-o", outputDir, file]),
  exiftool: (file: string) => exec("exiftool", [file]),
  steghide: (file: string, passphrase = "") =>
    exec("steghide", ["extract", "-sf", file, "-p", passphrase]),
  strings: (file: string) => exec("strings", [file]),
  hexdump: (file: string) => exec("xxd", [file]),
  dd: (input: string, output: string, bs = "512", count = "1") =>
    exec("dd", [`if=${input}`, `of=${output}`, `bs=${bs}`, `count=${count}`]),
};

// ── REVERSE ENGINEERING ──────────────────────────────────────────

export const ReverseEngineering = {
  ghidra: (file: string) => exec("ghidra", [file]),
  radare2: (file: string, ...cmds: string[]) => exec("r2", ["-q", "-c", cmds.join(";"), file]),
  gdb: (file: string, ...cmds: string[]) =>
    exec("gdb", ["-batch", ...cmds.flatMap((c) => ["-ex", c]), file]),
  objdump: (file: string) => exec("objdump", ["-d", file]),
  strace: (pid: string) => exec("strace", ["-p", pid, "-f", "-e", "trace=all"]),
  ltrace: (cmd: string) => exec("ltrace", [cmd]),
  apktool: (apk: string) => exec("apktool", ["d", apk]),
  jadx: (apk: string) => exec("jadx", [apk]),
  dex2jar: (apk: string) => exec("d2j-dex2jar", [apk]),
};

// ── SOCIAL ENGINEERING ───────────────────────────────────────────

export const SocialEngineering = {
  gophish: () => exec("gophish", []),
  king_phisher: () => exec("king-phisher", []),
  evilginx2: () => exec("evilginx2", []),
  socialFish: (target: string) => exec("socialfish", [target]),
};

// ── FULL TOOL AUDIT ──────────────────────────────────────────────

/** Check which Kali tools are installed */
export async function auditKaliTools(): Promise<{
  installed: string[];
  missing: string[];
  total: number;
}> {
  const allTools = [
    "nmap",
    "masscan",
    "amass",
    "sublist3r",
    "theHarvester",
    "dnsrecon",
    "dnsenum",
    "fierce",
    "shodan",
    "recon-ng",
    "whois",
    "dmitry",
    "spiderfoot",
    "enum4linux",
    "smbclient",
    "snmpwalk",
    "netdiscover",
    "arp-scan",
    "wafw00f",
    "nikto",
    "wpscan",
    "joomscan",
    "droopescan",
    "lynis",
    "sqlmap",
    "zap-cli",
    "dirb",
    "gobuster",
    "ffuf",
    "wfuzz",
    "commix",
    "xsser",
    "whatweb",
    "skipfish",
    "sslyze",
    "testssl.sh",
    "hydra",
    "hashcat",
    "john",
    "medusa",
    "ncrack",
    "cewl",
    "crunch",
    "patator",
    "airmon-ng",
    "airodump-ng",
    "aireplay-ng",
    "aircrack-ng",
    "reaver",
    "pixiewps",
    "wifite",
    "bettercap",
    "kismet",
    "mdk3",
    "msfconsole",
    "msfvenom",
    "searchsploit",
    "crackmapexec",
    "wireshark",
    "tcpdump",
    "tshark",
    "ettercap",
    "arpspoof",
    "dsniff",
    "mitmproxy",
    "responder",
    "macchanger",
    "sslstrip",
    "scapy",
    "volatility",
    "binwalk",
    "foremost",
    "exiftool",
    "steghide",
    "strings",
    "xxd",
    "ghidra",
    "r2",
    "gdb",
    "objdump",
    "strace",
    "ltrace",
    "apktool",
    "jadx",
    "gophish",
    "evilginx2",
    "lazagne",
    "bloodhound",
    "proxychains4",
    "weevely",
    "chisel",
  ];

  const installed: string[] = [];
  const missing: string[] = [];

  for (const tool of allTools) {
    try {
      await run("which", [tool]);
      installed.push(tool);
    } catch {
      missing.push(tool);
    }
  }

  return { installed, missing, total: allTools.length };
}

export { exec as runTool };
