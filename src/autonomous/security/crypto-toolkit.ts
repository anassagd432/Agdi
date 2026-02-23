/**
 * AGDI Crypto & Hash Toolkit
 * Hash cracking, encoding/decoding, password generation, certificate tools.
 */

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import * as crypto from "node:crypto";

const run = promisify(execFile);

export interface HashResult { original: string; hash: string; algorithm: string; }
export interface CrackResult { cracked: boolean; hash: string; plaintext?: string; algorithm?: string; }
export interface PasswordConfig { length?: number; uppercase?: boolean; lowercase?: boolean; digits?: boolean; symbols?: boolean; count?: number; }

export class CryptoToolkit {

  // ── Hashing ───────────────────────────────────────────────
  hash(input: string, algo: string = "sha256"): HashResult {
    return { original: input, hash: crypto.createHash(algo).update(input).digest("hex"), algorithm: algo };
  }

  hashAll(input: string): HashResult[] {
    return ["md5", "sha1", "sha256", "sha512", "sha3-256", "sha3-512"].map(a => this.hash(input, a));
  }

  identifyHash(hash: string): string[] {
    const len = hash.length;
    const candidates: string[] = [];
    if (len === 32) candidates.push("MD5", "NTLM");
    if (len === 40) candidates.push("SHA-1");
    if (len === 56) candidates.push("SHA-224");
    if (len === 64) candidates.push("SHA-256", "SHA3-256", "BLAKE2s");
    if (len === 96) candidates.push("SHA-384");
    if (len === 128) candidates.push("SHA-512", "SHA3-512", "BLAKE2b");
    if (hash.startsWith("$2")) candidates.push("bcrypt");
    if (hash.startsWith("$6$")) candidates.push("SHA-512 crypt");
    if (hash.startsWith("$5$")) candidates.push("SHA-256 crypt");
    if (hash.startsWith("$1$")) candidates.push("MD5 crypt");
    if (hash.startsWith("$apr1$")) candidates.push("Apache MD5");
    if (hash.startsWith("$argon2")) candidates.push("Argon2");
    return candidates.length ? candidates : ["Unknown"];
  }

  // ── Cracking ──────────────────────────────────────────────
  async crackWithHashcat(hash: string, mode: number, wordlist = "/usr/share/wordlists/rockyou.txt"): Promise<CrackResult> {
    try {
      const { stdout } = await run("hashcat", ["-m", String(mode), "-a", "0", hash, wordlist, "--force", "--quiet"], { timeout: 300_000 });
      const match = stdout.match(new RegExp(`${hash.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}:(.+)`));
      return { cracked: !!match, hash, plaintext: match?.[1], algorithm: `hashcat mode ${mode}` };
    } catch { return { cracked: false, hash }; }
  }

  async crackWithJohn(hashFile: string, wordlist = "/usr/share/wordlists/rockyou.txt"): Promise<CrackResult[]> {
    const results: CrackResult[] = [];
    try {
      await run("john", ["--wordlist=" + wordlist, hashFile], { timeout: 300_000 }).catch(() => {});
      const { stdout } = await run("john", ["--show", hashFile], { timeout: 10_000 });
      for (const line of stdout.split("\n")) {
        const m = line.match(/^([^:]+):(.+)/);
        if (m) results.push({ cracked: true, hash: m[1], plaintext: m[2] });
      }
    } catch {}
    return results;
  }

  // ── Encoding ──────────────────────────────────────────────
  base64Encode(input: string): string { return Buffer.from(input).toString("base64"); }
  base64Decode(input: string): string { return Buffer.from(input, "base64").toString("utf-8"); }
  hexEncode(input: string): string { return Buffer.from(input).toString("hex"); }
  hexDecode(input: string): string { return Buffer.from(input, "hex").toString("utf-8"); }
  urlEncode(input: string): string { return encodeURIComponent(input); }
  urlDecode(input: string): string { return decodeURIComponent(input); }
  rot13(input: string): string { return input.replace(/[a-zA-Z]/g, c => String.fromCharCode(c.charCodeAt(0) + (c.toLowerCase() < "n" ? 13 : -13))); }

  // ── Password Generation ───────────────────────────────────
  generatePasswords(config: PasswordConfig = {}): string[] {
    const { length = 16, uppercase = true, lowercase = true, digits = true, symbols = true, count = 5 } = config;
    let charset = "";
    if (uppercase) charset += "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    if (lowercase) charset += "abcdefghijklmnopqrstuvwxyz";
    if (digits) charset += "0123456789";
    if (symbols) charset += "!@#$%^&*()_+-=[]{}|;:,.<>?";
    if (!charset) charset = "abcdefghijklmnopqrstuvwxyz0123456789";
    const passwords: string[] = [];
    for (let i = 0; i < count; i++) {
      const bytes = crypto.randomBytes(length);
      passwords.push(Array.from(bytes).map(b => charset[b % charset.length]).join(""));
    }
    return passwords;
  }

  // ── Certificate Tools ─────────────────────────────────────
  async inspectCert(host: string, port = 443): Promise<string> {
    try {
      const { stdout } = await run("openssl", ["s_client", "-connect", `${host}:${port}`, "-servername", host], { timeout: 10_000 });
      return stdout;
    } catch (e) { return `Error: ${e}`; }
  }

  async checkDependencies(): Promise<{ available: string[]; missing: string[] }> {
    const tools = ["hashcat", "john", "openssl", "base64"];
    const available: string[] = []; const missing: string[] = [];
    for (const t of tools) { try { await run("which", [t]); available.push(t); } catch { missing.push(t); } }
    return { available, missing };
  }
}

export default CryptoToolkit;
