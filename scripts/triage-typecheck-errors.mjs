// Temporary triage helper for the Phase 1 TypeScript repair.
// Reads dist/typecheck-diagnostics.txt (UTF-8 or UTF-16), counts and groups
// tsc errors by code and by file prefix. Not part of the shipped product.
import { readFileSync } from "node:fs";

const args = process.argv.slice(2);
const full = args.includes("--full");
const path = args.find((a) => !a.startsWith("--")) ?? "dist/typecheck-diagnostics.txt";

function decode(raw) {
  // UTF-16LE BOM
  if (raw[0] === 0xff && raw[1] === 0xfe) {
    return raw.toString("utf16le").replace(/^\uFEFF/, "");
  }
  // UTF-16BE BOM
  if (raw[0] === 0xfe && raw[1] === 0xff) {
    const swapped = Buffer.from(raw);
    for (let i = 0; i + 1 < swapped.length; i += 2) {
      const t = swapped[i];
      swapped[i] = swapped[i + 1];
      swapped[i + 1] = t;
    }
    return swapped.toString("utf16le").replace(/^\uFEFF/, "");
  }
  // Heuristic: many NUL bytes => UTF-16LE without BOM
  const sample = raw.subarray(0, Math.min(raw.length, 4096));
  let nuls = 0;
  for (const byte of sample) if (byte === 0) nuls += 1;
  if (nuls > sample.length / 8) {
    return raw.toString("utf16le");
  }
  return raw.toString("utf8");
}

const text = decode(readFileSync(path));
const lines = text.split(/\r?\n/);

const errorRe = /^(?<file>[^(]+)\((?<line>\d+),(?<col>\d+)\): error (?<code>TS\d+): (?<msg>.*)$/;
const errors = [];
for (const line of lines) {
  const m = errorRe.exec(line);
  if (m) {
    errors.push({
      file: m.groups.file.trim(),
      line: Number(m.groups.line),
      col: Number(m.groups.col),
      code: m.groups.code,
      msg: m.groups.msg,
    });
  }
}

console.log(`TOTAL ERRORS: ${errors.length}`);

const byCode = new Map();
for (const e of errors) byCode.set(e.code, (byCode.get(e.code) ?? 0) + 1);
console.log("\n=== BY CODE ===");
for (const [code, count] of [...byCode.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`${String(count).padStart(4)}  ${code}`);
}

const byDir = new Map();
for (const e of errors) {
  const parts = e.file.split("/");
  const key = parts[0] === "extensions" ? `extensions/${parts[1]}` : parts.slice(0, 2).join("/");
  byDir.set(key, (byDir.get(key) ?? 0) + 1);
}
console.log("\n=== BY AREA ===");
for (const [dir, count] of [...byDir.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`${String(count).padStart(4)}  ${dir}`);
}

const byFile = new Map();
for (const e of errors) {
  byFile.set(e.file, (byFile.get(e.file) ?? 0) + 1);
}
console.log("\n=== BY FILE ===");
for (const [file, count] of [...byFile.entries()].sort(
  (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
)) {
  console.log(`${String(count).padStart(4)}  ${file}`);
}

if (full) {
  console.log("\n=== ALL ERRORS ===");
  for (const e of errors) {
    console.log(`${e.file}(${e.line},${e.col}): ${e.code}: ${e.msg}`);
  }
}
