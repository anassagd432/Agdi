#!/usr/bin/env node
/**
 * Generate a CycloneDX 1.5 SBOM from `pnpm-lock.yaml`.
 *
 * Why not `npm sbom`: this repository is a pnpm workspace whose `pnpm.overrides`
 * deliberately resolve versions outside their consumers' declared ranges (for
 * example `form-data` is pinned to 2.x while `axios` declares `^4`). npm's tree
 * validator rejects that as `ESBOMPROBLEMS`, so `npm sbom` cannot run here.
 *
 * Why not a YAML library: the only YAML parser in `node_modules` is a transitive
 * dependency, and a release tool must not depend on a package another dependency
 * happens to hoist. The lockfile's `packages:` block is a flat list of
 * two-space-indented `'<name>@<version>':` keys, which is parsed directly here.
 *
 * Scope: the whole locked graph, including dev dependencies. Determining the
 * production-only closure requires resolving the `importers` and `snapshots`
 * graphs, which this generator deliberately does not attempt. The metadata
 * properties below record that scope so a consumer is not misled.
 *
 * Usage:
 *   node scripts/generate-sbom.mjs
 *   node scripts/generate-sbom.mjs --output sbom.cdx.json
 *   node scripts/generate-sbom.mjs --lockfile pnpm-lock.yaml --json
 *
 * Exit codes: 0 = SBOM written, 1 = the lockfile could not be read or parsed.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function parseArgs(argv) {
  const options = { output: null, lockfile: path.join(REPO_ROOT, "pnpm-lock.yaml"), asJson: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--json") {
      options.asJson = true;
      continue;
    }
    if (arg === "--output") {
      options.output = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === "--lockfile") {
      options.lockfile = argv[index + 1];
      index += 1;
      continue;
    }
    throw new Error(`unknown argument: ${arg}`);
  }
  return options;
}

/**
 * Extract `name` and `version` from a lockfile package key.
 *
 * Keys look like `'@scope/name@1.2.3'` or `name@1.2.3`, and may carry a peer
 * suffix such as `@whiskeysockets/baileys@7.0.0-rc14(jimp@1.6.1)(sharp@0.34.5)`.
 * The version is therefore taken as everything after the last `@` with any
 * trailing parenthesised peer set removed.
 */
function parsePackageKey(rawKey) {
  const key = rawKey.replace(/^'/, "").replace(/':$/, "").replace(/'$/, "");
  const withoutPeers = key.replace(/\(.*\)$/, "");
  const at = withoutPeers.lastIndexOf("@");
  if (at <= 0) {
    return null;
  }
  const name = withoutPeers.slice(0, at);
  const version = withoutPeers.slice(at + 1);
  if (!name || !version) {
    return null;
  }
  return { name, version };
}

function toPurl(name, version) {
  const encodedName = name.startsWith("@")
    ? `%40${name.slice(1)}`
    : encodeURIComponent(name);
  return `pkg:npm/${encodedName}@${encodeURIComponent(version)}`;
}

function collectPackages(lockfileText) {
  const lines = lockfileText.split("\n");
  let inPackages = false;
  const packages = new Map();

  for (const line of lines) {
    if (/^packages:\s*$/u.test(line)) {
      inPackages = true;
      continue;
    }
    if (inPackages && /^\S/u.test(line)) {
      // A new top-level key ends the packages block.
      break;
    }
    if (!inPackages) {
      continue;
    }
    const match = /^ {2}(\S.*):\s*$/u.exec(line);
    if (!match) {
      continue;
    }
    const parsed = parsePackageKey(match[1]);
    if (parsed) {
      packages.set(`${parsed.name}@${parsed.version}`, parsed);
    }
  }

  return [...packages.values()].toSorted(
    (left, right) =>
      left.name.localeCompare(right.name) || left.version.localeCompare(right.version),
  );
}

function readRootPackage() {
  const manifest = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, "package.json"), "utf8"));
  return {
    name: manifest.name ?? "unknown",
    version: manifest.version ?? "0.0.0",
    license: manifest.license ?? null,
  };
}

function main() {
  const options = parseArgs(process.argv.slice(2));

  if (!fs.existsSync(options.lockfile)) {
    throw new Error(
      `lockfile not found: ${path.relative(REPO_ROOT, options.lockfile)}. ` +
        "An SBOM is only meaningful for a committed lockfile.",
    );
  }

  const lockfileText = fs.readFileSync(options.lockfile, "utf8");
  const lockfileVersion = /^lockfileVersion:\s*'?([^'\n]+)'?/mu.exec(lockfileText)?.[1] ?? null;
  const packages = collectPackages(lockfileText);
  const root = readRootPackage();

  if (packages.length === 0) {
    throw new Error(
      "parsed zero packages from the lockfile. The lockfile layout may have changed; " +
        "this generator needs updating rather than silently emitting an empty SBOM.",
    );
  }

  const bom = {
    bomFormat: "CycloneDX",
    specVersion: "1.5",
    version: 1,
    metadata: {
      timestamp: new Date().toISOString(),
      component: {
        type: "application",
        name: root.name,
        version: root.version,
        ...(root.license ? { licenses: [{ license: { id: root.license } }] } : {}),
        "bom-ref": toPurl(root.name, root.version),
      },
      tools: [
        {
          vendor: "agdi",
          name: "generate-sbom.mjs",
          version: "1",
        },
      ],
      properties: [
        { name: "agdi:sbom:source", value: path.relative(REPO_ROOT, options.lockfile).split(path.sep).join("/") },
        { name: "agdi:sbom:lockfileVersion", value: lockfileVersion ?? "unknown" },
        {
          name: "agdi:sbom:scope",
          value:
            "full locked graph including dev dependencies; the production-only closure is not resolved",
        },
        { name: "agdi:sbom:componentCount", value: String(packages.length) },
      ],
    },
    components: packages.map((entry) => ({
      type: "library",
      name: entry.name,
      version: entry.version,
      purl: toPurl(entry.name, entry.version),
      "bom-ref": toPurl(entry.name, entry.version),
    })),
  };

  const serialized = `${JSON.stringify(bom, null, 2)}\n`;

  if (options.output) {
    fs.writeFileSync(options.output, serialized, "utf8");
    if (!options.asJson) {
      console.log(
        `Wrote ${path.relative(REPO_ROOT, options.output).split(path.sep).join("/")} ` +
          `with ${packages.length} component(s) (lockfileVersion ${lockfileVersion ?? "unknown"}).`,
      );
    }
  } else {
    process.stdout.write(serialized);
  }
}

try {
  main();
} catch (error) {
  console.error(`generate-sbom: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
