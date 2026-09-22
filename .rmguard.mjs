// Throwaway: create N files, then rmSync the directory, timing both.
// Usage: node .rmguard.mjs <dir> <count>
import fs from "node:fs";
import path from "node:path";

const [, , dir, countArg] = process.argv;
const count = Number(countArg ?? 300);
const payload = Buffer.alloc(2048, 0x61);

fs.rmSync(dir, { recursive: true, force: true });
fs.mkdirSync(dir, { recursive: true });

const createStart = process.hrtime.bigint();
for (let i = 0; i < count; i += 1) {
  fs.writeFileSync(path.join(dir, `f${i}.js`), payload);
}
const createMs = Number(process.hrtime.bigint() - createStart) / 1e6;
console.log(`  created ${count} files in ${createMs.toFixed(0)}ms`);

const rmStart = process.hrtime.bigint();
try {
  fs.rmSync(dir, { recursive: true, force: true });
  const rmMs = Number(process.hrtime.bigint() - rmStart) / 1e6;
  console.log(`  rmSync RETURNED in ${rmMs.toFixed(0)}ms; dirExists=${fs.existsSync(dir)}`);
} catch (error) {
  const rmMs = Number(process.hrtime.bigint() - rmStart) / 1e6;
  console.log(`  rmSync THREW after ${rmMs.toFixed(0)}ms: ${error.code ?? error.name}: ${String(error.message).split("\n")[0]}`);
  console.log(`  dirExists=${fs.existsSync(dir)}`);
}
