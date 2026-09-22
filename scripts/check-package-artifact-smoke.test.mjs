/**
 * Unit tests for the package artifact smoke check's pure helpers.
 *
 * The `dist/` classification rule was wrong twice during development — once
 * flagging 1366 real build outputs, once flagging 106 — and a third time after
 * bundled plugin runtime deps started shipping under
 * `dist/extensions/<id>/node_modules/`, which produced 13213 false positives.
 * The cases below pin the measured shape of a real build.
 *
 * Run: node --test scripts/check-package-artifact-smoke.test.mjs
 */

import assert from "node:assert/strict";
import { test } from "node:test";
import {
  classifyForbidden,
  collectEntrypointTargets,
  isStrayDistDiagnostic,
} from "./check-package-artifact-smoke.mjs";

test("isStrayDistDiagnostic: real build output under dist/ is allowed", () => {
  // Extensions observed in a real `pnpm build` of this repository.
  const realBuildOutput = [
    "dist/index.js",
    "dist/abap-Bjme9sjz.js",
    "dist/extensionAPI.js",
    "dist/channel-catalog.json",
    "dist/plugin-sdk/core.js",
    "dist/plugin-sdk/core.d.ts",
    "dist/plugin-sdk/src/config/types.secrets.d.ts",
    "dist/extensions/open-prose/skills/prose/alt-borges.md",
    "dist/extensions/open-prose/skills/prose/LICENSE",
    "dist/telegram/foo.hoon",
    "dist/cli/index.cjs",
    "dist/index.js.map",
  ];
  for (const file of realBuildOutput) {
    assert.equal(isStrayDistDiagnostic(file), false, `expected allowed: ${file}`);
  }
});

test("isStrayDistDiagnostic: diagnostic files under dist/ are flagged", () => {
  const strays = [
    "dist/codex-typecheck-verify.stderr.log",
    "dist/codex-typecheck-verify.stdout.log",
    "dist/codex-security-build-pinned.stderr.log",
    "dist/typecheck-diagnostics.txt",
    "dist/typecheck-diagnostics.utf8.txt",
    "dist/scratch.tmp",
    "dist/old.bak",
    "dist/heap.heapsnapshot",
  ];
  for (const file of strays) {
    assert.equal(isStrayDistDiagnostic(file), true, `expected flagged: ${file}`);
  }
});

test("isStrayDistDiagnostic: only applies under dist/", () => {
  assert.equal(isStrayDistDiagnostic("docs/notes.log"), false);
  assert.equal(isStrayDistDiagnostic("skills/skill-creator/license.txt"), false);
  assert.equal(isStrayDistDiagnostic("dist-other/notes.log"), false);
});

test("isStrayDistDiagnostic: flags tool-written reports that carry a normal extension", () => {
  const strays = [
    // Observed under dist/ on 2026-09-22; extension-only detection missed it.
    "dist/codex-approved-security-audit.json",
    "dist/security-report.json",
    "dist/typecheck-diagnostics.json",
    "dist/heap-dump.json",
    "dist/build-summary.json",
    "dist/troubleshoot-report.md",
  ];
  for (const file of strays) {
    assert.equal(isStrayDistDiagnostic(file), true, `expected flagged: ${file}`);
  }
});

test("isStrayDistDiagnostic: real build output is not caught by the name-suffix rule", () => {
  // Both stems were rejected as diagnostic suffixes because they occur in a real build.
  const allowed = [
    "dist/extensions/open-prose/skills/prose/examples/38-skill-scan.prose",
    "dist/extensions/slack/node_modules/@slack/types/dist/common/bot-profile.js",
    "dist/plugin-sdk/diagnostics-otel.js",
    "dist/extensions/diagnostics-otel/index.js",
    "dist/build-info.json",
    "dist/channel-catalog.json",
    "dist/protocol.schema.json",
    "dist/plugin-sdk/index.d.ts",
  ];
  for (const file of allowed) {
    assert.equal(isStrayDistDiagnostic(file), false, `expected allowed: ${file}`);
  }
});

test("classifyForbidden: bundled plugin runtime deps are allowed", () => {
  const allowed = [
    "dist/extensions/discord/node_modules/@buape/carbon/dist/src/abstracts/Base.js",
    "dist/extensions/slack/node_modules/@slack/bolt/dist/App.js",
    // Vendored packages legitimately ship their own license text and build info.
    "dist/extensions/discord/node_modules/tslib/LICENSE.txt",
    "dist/extensions/discord/node_modules/@buape/carbon/dist/tsconfig.tsbuildinfo",
  ];
  for (const file of allowed) {
    assert.deepEqual(classifyForbidden(file), [], `expected clean: ${file}`);
  }
});

test("classifyForbidden: node_modules outside bundled plugins is still forbidden", () => {
  const forbidden = [
    "node_modules/foo/index.js",
    "extensions/tlon/node_modules/.bin/tlon",
    "docs/node_modules/foo/index.js",
  ];
  for (const file of forbidden) {
    assert.ok(
      classifyForbidden(file).includes("vendored dependencies"),
      `expected vendored dependencies for ${file}`,
    );
  }
});

test("classifyForbidden: secrets are still flagged inside vendored packages", () => {
  const cases = [
    ["dist/extensions/discord/node_modules/foo/.env", "dotenv file"],
    ["dist/extensions/discord/node_modules/foo/.npmrc", "npm/registry credentials"],
    ["dist/extensions/discord/node_modules/foo/id_rsa", "ssh private key"],
    ["dist/extensions/discord/node_modules/foo/credentials.json", "credential dump"],
  ];
  for (const [file, expectedLabel] of cases) {
    assert.ok(
      classifyForbidden(file).includes(expectedLabel),
      `expected ${file} to match "${expectedLabel}", got ${JSON.stringify(classifyForbidden(file))}`,
    );
  }
});

test("classifyForbidden: first-party strays are still flagged under dist/", () => {
  const cases = [
    ["dist/codex-security-build-pinned.stderr.log", "diagnostic file under dist/"],
    ["dist/typecheck-diagnostics.txt", "diagnostic file under dist/"],
    ["dist/codex-approved-security-audit.json", "diagnostic file under dist/"],
    ["dist/plugin-sdk/.tsbuildinfo", "typescript build info"],
  ];
  for (const [file, expectedLabel] of cases) {
    assert.ok(
      classifyForbidden(file).includes(expectedLabel),
      `expected ${file} to match "${expectedLabel}", got ${JSON.stringify(classifyForbidden(file))}`,
    );
  }
});

test("classifyForbidden: flags credentials, keys, and session state", () => {
  const cases = [
    [".env", "dotenv file"],
    ["config/.env.local", "dotenv file"],
    [".npmrc", "npm/registry credentials"],
    ["certs/server.pem", "private key material"],
    ["certs/server.key", "private key material"],
    ["keys/id_rsa", "ssh private key"],
    [".ssh/config", "ssh directory"],
    ["state/session.json", "session state"],
    ["state/sessions.json", "session state"],
    ["auth/credentials.json", "credential dump"],
    ["build.log", "build/session log"],
    ["tsconfig.tsbuildinfo", "typescript build info"],
    ["node_modules/foo/index.js", "vendored dependencies"],
    [".git/config", "git internals"],
    ["coverage/lcov.info", "coverage output"],
    [".workbuddy-ai/memory/2026-09-22.md", "local agent state"],
    [".DS_Store", "editor/OS noise"],
  ];
  for (const [file, expectedLabel] of cases) {
    assert.ok(
      classifyForbidden(file).includes(expectedLabel),
      `expected ${file} to match "${expectedLabel}", got ${JSON.stringify(classifyForbidden(file))}`,
    );
  }
});

test("classifyForbidden: legitimate package content is clean", () => {
  const allowed = [
    "LICENSE",
    "THIRD_PARTY_NOTICES.md",
    "README.md",
    "CHANGELOG.md",
    "agdi.mjs",
    "openclaw.mjs",
    "docs/reference/provenance.md",
    "docs/reference/secretref-user-supplied-credentials-matrix.json",
    "skills/skill-creator/license.txt",
    "dist/index.js",
    "dist/plugin-sdk/core.js",
    "dist/channel-catalog.json",
    "assets/avatar-placeholder.svg",
  ];
  for (const file of allowed) {
    assert.deepEqual(classifyForbidden(file), [], `expected clean: ${file}`);
  }
});

test("collectEntrypointTargets: expands main, bin, and conditional exports", () => {
  const manifest = {
    main: "dist/index.js",
    bin: { agdi: "agdi.mjs", openclaw: "openclaw.mjs" },
    exports: {
      ".": "./dist/index.js",
      "./plugin-sdk": {
        types: "./dist/plugin-sdk/index.d.ts",
        default: "./dist/plugin-sdk/index.js",
      },
    },
  };

  const targets = collectEntrypointTargets(manifest);
  const byField = new Map(targets.map((item) => [item.field, item.target]));

  assert.equal(targets.length, 6);
  assert.equal(byField.get("main"), "dist/index.js");
  assert.equal(byField.get("bin.agdi"), "agdi.mjs");
  assert.equal(byField.get("bin.openclaw"), "openclaw.mjs");
  assert.equal(byField.get('exports["."]'), "./dist/index.js");
  assert.equal(byField.get('exports["./plugin-sdk"].types'), "./dist/plugin-sdk/index.d.ts");
  assert.equal(byField.get('exports["./plugin-sdk"].default'), "./dist/plugin-sdk/index.js");
});

test("collectEntrypointTargets: tolerates a bare string bin and no exports", () => {
  assert.deepEqual(collectEntrypointTargets({ bin: "cli.js" }), [
    { field: "bin", target: "cli.js", kind: "file" },
  ]);
  assert.deepEqual(collectEntrypointTargets({}), []);
});

test("collectEntrypointTargets: normalizes Windows separators", () => {
  const targets = collectEntrypointTargets({ main: "dist\\index.js" });
  assert.deepEqual(targets, [{ field: "main", target: "dist/index.js", kind: "file" }]);
});
