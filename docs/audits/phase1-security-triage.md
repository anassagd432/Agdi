---
summary: "Critical/high production advisory triage with reachability, fix class, and release recommendation"
read_when:
  - You are deciding whether the locked dependency graph can ship
  - You need the exact dependency changes that require approval
  - You are reviewing security posture claims in documentation
title: "Phase 1 security triage"
---

# Phase 1 security triage

This document is a decision aid. It does not upgrade, patch, suppress, or
approve anything. No dependency change described here has been applied, and no
exception in this document is granted. Approval is Anass's call.

## 1. Provenance

The audit was run against the working tree on disk, not against a committed
SHA. The working tree carries uncommitted changes owned by other workstreams,
including a modified root `package.json`.

| Item             | Value                                                                                                               |
| ---------------- | ------------------------------------------------------------------------------------------------------------------- |
| Command          | `npm exec --yes --package pnpm@10.32.1 -- pnpm audit --prod --json`                                                 |
| Observed         | 2026-09-22T01:48+02:00                                                                                              |
| Exit code        | 1 (advisories present)                                                                                              |
| `HEAD`           | `c289b658b06ecf10861ff39f7af8df14c5427cc8`                                                                          |
| Branch           | `main`                                                                                                              |
| Node             | v22.22.2                                                                                                            |
| pnpm             | 10.32.1 (via `npm exec`, matching `packageManager`)                                                                 |
| `pnpm-lock.yaml` | untracked; `sha256 aade9d0499cc91f2cf66ac6cc93c0fe0e7e40f500d92c3df5b11a9ff586eebbc`                                |
| `package.json`   | tracked and modified in the working tree; `sha256 2e3f2cc9b9d2151583055144cea8951cc3395485a459c43c4df2ed1683940246` |
| Graph size       | 1128 production dependencies, 0 dev dependencies in scope (`--prod`)                                                |

`pnpm audit` was run with `--prod`, so dev-only advisories are out of scope.
The `--prod` flag does not exclude transitive production dependencies, which is
where most findings live.

## 2. Counts

| Severity  | Advisories | Affected package instances |
| --------- | ---------- | -------------------------- |
| Critical  | 2          | 2                          |
| High      | 18         | 21                         |
| Moderate  | 45         | 47                         |
| Low       | 6          | 6                          |
| **Total** | **71**     | **76**                     |

These reproduce the counts recorded in
[Phase 1 baseline 2026-09-21](/audits/phase1-baseline-2026-09-21) and the
[Phase 1 release candidate checklist](/audits/phase1-release-candidate-checklist)
(2 / 21 / 47 / 6).

The high-severity instance count (21) is larger than the high advisory count
(18) because three advisories each affect two installed copies of the same
module: `@opentelemetry/sdk-node`, `@opentelemetry/exporter-prometheus`, and
`@opentelemetry/propagator-jaeger` each resolve at two versions.

## 3. Complete critical/high table

Paths use pnpm's importer labels. `.` is the repository root; `extensions__x`
is the workspace package `extensions/x`.

| #   | Sev      | Module                               | Advisory                             | Installed        | Patched      | Path                                                                         | Direct?                                      |
| --- | -------- | ------------------------------------ | ------------------------------------ | ---------------- | ------------ | ---------------------------------------------------------------------------- | -------------------------------------------- |
| 1   | Critical | `@whiskeysockets/baileys`            | GHSA-qvv5-jq5g-4cgg (CVE-2026-48063) | 7.0.0-rc.9       | >=7.0.0-rc12 | `extensions__whatsapp > @whiskeysockets/baileys`                             | via workspace dep                            |
| 2   | Critical | `tar`                                | GHSA-23hp-3jrh-7fpw (CVE-2026-59873) | 7.5.12           | >=7.5.19     | `. > tar`                                                                    | direct                                       |
| 3   | High     | `@mariozechner/pi-coding-agent`      | GHSA-jfgx-wxx8-mp94 (CVE-2026-54328) | 0.61.1           | none         | `. > @mariozechner/pi-coding-agent`                                          | direct                                       |
| 4   | High     | `@opentelemetry/exporter-prometheus` | GHSA-q7rr-3cgh-j5r3 (CVE-2026-44902) | 0.214.0, 0.213.0 | >=0.217.0    | `. > @opentelemetry/sdk-node > ...` and `extensions__diagnostics-otel > ...` | transitive                                   |
| 5   | High     | `@opentelemetry/propagator-jaeger`   | GHSA-45rx-2jwx-cxfr (CVE-2026-59892) | 2.6.1, 2.6.0     | >=2.9.0      | `. > @opentelemetry/sdk-node > ...` and `extensions__diagnostics-otel > ...` | transitive                                   |
| 6   | High     | `@opentelemetry/sdk-node`            | GHSA-q7rr-3cgh-j5r3 (CVE-2026-44902) | 0.214.0, 0.213.0 | >=0.217.0    | `. > @opentelemetry/sdk-node` and `extensions__diagnostics-otel > ...`       | direct                                       |
| 7   | High     | `extract-zip`                        | GHSA-jmr9-qjv8-65gv (CVE-2026-56876) | 2.0.1            | none         | `. > @mariozechner/pi-coding-agent > extract-zip`                            | transitive                                   |
| 8   | High     | `extract-zip`                        | GHSA-7pqw-9j4j-h8q3 (CVE-2026-19693) | 2.0.1            | none         | `. > @mariozechner/pi-coding-agent > extract-zip`                            | transitive                                   |
| 9   | High     | `form-data`                          | GHSA-hmw2-7cc7-3qxx (CVE-2026-12143) | 2.5.4            | >=2.5.6      | `. > @larksuiteoapi/node-sdk > axios > form-data`                            | transitive                                   |
| 10  | High     | `hono`                               | GHSA-88fw-hqm2-52qc (CVE-2026-54290) | 4.12.8           | >=4.12.25    | `. > hono`                                                                   | direct                                       |
| 11  | High     | `pdfjs-dist`                         | GHSA-hq66-cqwq-w95j (CVE-2026-16633) | 5.7.284          | >=6.2.108    | `. > pdfjs-dist`                                                             | direct                                       |
| 12  | High     | `sharp`                              | GHSA-f88m-g3jw-g9cj                  | 0.34.5           | >=0.35.0     | `. > sharp`                                                                  | direct                                       |
| 13  | High     | `sharp`                              | GHSA-rgj7-g3m4-5g8c                  | 0.34.5           | >=0.35.4     | `. > sharp`                                                                  | direct                                       |
| 14  | High     | `tar`                                | GHSA-8x88-c5mf-7j5w (CVE-2026-59874) | 7.5.12           | >=7.5.18     | `. > tar`                                                                    | direct                                       |
| 15  | High     | `tar`                                | GHSA-r292-9mhp-454m (CVE-2026-73566) | 7.5.12           | >=7.5.21     | `. > tar`                                                                    | direct                                       |
| 16  | High     | `undici`                             | GHSA-vmh5-mc38-953g (CVE-2026-9697)  | 7.24.5           | >=7.28.0     | `extensions__zalo > undici`                                                  | direct (in `extensions/zalo`)                |
| 17  | High     | `undici`                             | GHSA-vxpw-j846-p89q (CVE-2026-12151) | 7.24.5           | >=7.28.0     | `extensions__zalo > undici`                                                  | direct (in `extensions/zalo`)                |
| 18  | High     | `undici`                             | GHSA-hm92-r4w5-c3mj (CVE-2026-6734)  | 7.24.5           | >=7.28.0     | `extensions__zalo > undici`                                                  | direct (in `extensions/zalo`)                |
| 19  | High     | `undici`                             | GHSA-4cwx-7wf7-3272 (CVE-2026-13697) | 7.24.5           | >=7.29.0     | `extensions__zalo > undici`                                                  | direct (in `extensions/zalo`)                |
| 20  | High     | `ws`                                 | GHSA-96hv-2xvq-fx4p (CVE-2026-48779) | 8.19.0           | >=8.21.0     | `. > @buape/carbon > ws`                                                     | transitive (optional dep of `@buape/carbon`) |

## 4. Root cause: the lockfile already contains patched copies

The most important structural finding is that for four of the twenty
advisories the lockfile already resolves a **patched** copy for one consumer
while an unpatched copy is resolved for another. The fix is a version range or
override change, not an upstream release.

| Module                    | Vulnerable copy                          | Patched copy already in the graph                                 | Why the vulnerable copy exists                                        |
| ------------------------- | ---------------------------------------- | ----------------------------------------------------------------- | --------------------------------------------------------------------- |
| `@whiskeysockets/baileys` | 7.0.0-rc.9 (from `extensions/whatsapp`)  | 7.0.0-rc14 (from root, range `^7.0.0-rc.9`)                       | `extensions/whatsapp` pins the exact version `7.0.0-rc.9`             |
| `undici`                  | 7.24.5 (from `extensions/zalo`)          | 7.29.1 (from root, `extensions/discord`, `extensions/telegram`)   | `extensions/zalo` pins the exact version `7.24.5`                     |
| `ws`                      | 8.19.0 (optional dep of `@buape/carbon`) | 8.21.3 (from root, `extensions/discord`, `extensions/voice-call`) | `@buape/carbon` pins `ws: 8.19.0` in `optionalDependencies`           |
| `form-data`               | 2.5.4 (forced by `pnpm.overrides`)       | none present                                                      | the `pnpm.overrides` entry `form-data: 2.5.4` pins below the fix line |

A second structural finding: several `pnpm.overrides` entries pin **vulnerable**
versions and are therefore the reason the advisory persists, not a mitigation
against it.

| Override                   | Pinned value | Advisory it holds open                                                   |
| -------------------------- | ------------ | ------------------------------------------------------------------------ |
| `pnpm.overrides.tar`       | `7.5.12`     | GHSA-23hp-3jrh-7fpw (critical), GHSA-8x88-c5mf-7j5w, GHSA-r292-9mhp-454m |
| `pnpm.overrides.form-data` | `2.5.4`      | GHSA-hmw2-7cc7-3qxx                                                      |
| `pnpm.overrides.hono`      | `4.12.8`     | GHSA-88fw-hqm2-52qc plus 27 moderate and 2 low `hono` advisories         |

`tar` is pinned in two places at once: `dependencies.tar` is the exact string
`7.5.12`, and `pnpm.overrides.tar` is also `7.5.12`. Both must move together or
the override will silently re-pin the old version.

## 5. Reachability and exposure

Reachability below is based on imports found in the working tree. It is a
statement about AGDI's own code, not about the advisory's general severity.

| Module                               | Reachable in AGDI code?        | Evidence                                                                                                                         | Exposure notes                                                                                                                                                                                                                                                                                                                                             |
| ------------------------------------ | ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tar`                                | Yes                            | `src/infra/archive.ts:10`, `src/infra/backup-create.ts:6` import the module                                                      | Parses archives for archive and backup paths. Advisory classes are input-driven DoS (unlimited input, negative size, recursion). Also pulled by `cmake-js@8.0.0`.                                                                                                                                                                                          |
| `@whiskeysockets/baileys`            | Yes                            | `extensions/whatsapp/src/session.ts:9`, `login.ts:1`, `login-qr.ts:2`, `inbound/monitor.ts:2`, `inbound/media.ts:2`              | The advisory concerns spoofing from a malicious `protocolMessage` payload. Exposure requires the WhatsApp channel to be enabled and connected to a hostile peer.                                                                                                                                                                                           |
| `@mariozechner/pi-coding-agent`      | Yes                            | `src/agents/compaction.ts:3`, `src/auto-reply/reply/session-fork.runtime.ts:4`, `src/config/sessions/transcript.ts:3` and others | Core agent runtime. The advisory is local privilege escalation via predictable temp extension install paths, scoped to shared Linux hosts.                                                                                                                                                                                                                 |
| `extract-zip`                        | Transitively                   | No import in `src/` or `extensions/`; reached only through `@mariozechner/pi-coding-agent`                                       | Reachable only if the pi agent extracts an untrusted zip.                                                                                                                                                                                                                                                                                                  |
| `@opentelemetry/sdk-node`            | Yes                            | `extensions/diagnostics-otel/src/service.ts:9` (`NodeSDK`); root also declares `^0.214.0`                                        | The advisory is a process crash via a malformed HTTP request to the Prometheus exporter. Exposure requires the Prometheus exporter endpoint to be listening and reachable.                                                                                                                                                                                 |
| `@opentelemetry/exporter-prometheus` | Transitively                   | via `@opentelemetry/sdk-node`                                                                                                    | Same crash vector as above.                                                                                                                                                                                                                                                                                                                                |
| `@opentelemetry/propagator-jaeger`   | Transitively                   | via `@opentelemetry/sdk-node`                                                                                                    | DoS on a malformed Jaeger header. Exposure requires Jaeger propagation in use.                                                                                                                                                                                                                                                                             |
| `form-data`                          | Transitively                   | `@larksuiteoapi/node-sdk > axios > form-data`; also consumed by `@slack/web-api` and `zca-js`                                    | CRLF injection via unescaped multipart field names and filenames. Exposure requires AGDI to send multipart bodies with attacker-influenced field names through these clients.                                                                                                                                                                              |
| `hono`                               | **No import found**            | No `hono` import in `src/`, `extensions/`, `ui/`, `packages/`, `scripts/`, or `test/`                                            | Present as a root dependency and as a resolved peer of `@buape/carbon`. The advisory (CORS middleware reflecting any Origin with credentials) only triggers if `hono`'s CORS middleware is used with a default wildcard origin. AGDI's Discord extension uses the carbon gateway (WebSocket) and starts no HTTP server, so this appears unreachable today. |
| `pdfjs-dist`                         | Yes                            | `src/media/pdf-extract.ts:21` (lazy `import("pdfjs-dist/legacy/build/pdf.mjs")`)                                                 | Arbitrary JavaScript execution on opening a malicious PDF. This is the highest-impact reachable vector in the list because PDFs commonly arrive from untrusted senders.                                                                                                                                                                                    |
| `sharp`                              | **No production import found** | Imports only in tests: `src/browser/screenshot.test.ts:1`, `src/agents/tool-images.test.ts:1`                                    | Declared as a direct dependency and resolved as a peer of `@whiskeysockets/baileys`. Native `libvips`/`libheif` code paths. Exposure is through WhatsApp media handling rather than AGDI's own image code.                                                                                                                                                 |
| `undici`                             | Yes, in `extensions/zalo` only | `extensions/zalo/src/proxy.ts:2` uses the 7.24.5 copy; `extensions/discord` and `extensions/telegram` use the patched 7.29.1     | Advisories cover SOCKS5 proxy TLS validation, cross-origin routing, WebSocket fragment DoS, and cache-directive crashes. Exposure requires the Zalo channel with a proxy configuration.                                                                                                                                                                    |
| `ws`                                 | Yes, in `extensions/discord`   | `@buape/carbon` is used throughout `extensions/discord/src`; the vulnerable `ws` is carbon's optional dependency                 | Memory-exhaustion DoS from tiny fragments. Reachable when the Discord gateway WebSocket is connected.                                                                                                                                                                                                                                                      |

## 6. Classification

### 6.1 Approve-now candidates (low regression risk)

Same-major, patch-level moves. Each target version was confirmed to exist on
the registry on 2026-09-22.

| Module          | Change                                                                      | Clears                           | Risk argument                                                                                                                                  |
| --------------- | --------------------------------------------------------------------------- | -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `tar`           | `7.5.12` → `7.5.22` in **both** `dependencies.tar` and `pnpm.overrides.tar` | 1 critical + 2 high + 3 moderate | Patch release on the same major. The advisory classes are input-validation fixes. Affects the root package and `cmake-js`.                     |
| `undici` (zalo) | `7.24.5` → `^7.29.0` in `extensions/zalo/package.json`                      | 4 high + 6 moderate + 2 low      | Root, Discord, and Telegram already resolve 7.29.1 and are unaffected. Patch release on the same major.                                        |
| `ws`            | add `pnpm.overrides.ws = 8.21.3`                                            | 1 high + 1 moderate              | Root, Discord, and voice-call already resolve 8.21.3. The override only lifts carbon's pinned optional copy.                                   |
| `form-data`     | `pnpm.overrides.form-data` `2.5.4` → `2.5.6`                                | 1 high                           | Patch release within the same 2.5.x line. See the caveat in section 8 before approving.                                                        |
| `hono`          | `4.12.8` → `4.13.8` in `dependencies.hono` and `pnpm.overrides.hono`        | 1 high + 27 moderate + 2 low     | `hono` is not imported by AGDI code, so the code-level regression surface is minimal. This single change clears the largest block of findings. |

### 6.2 Candidates requiring compatibility testing

| Module                               | Change                                                                              | Clears     | Why testing is required                                                                                                                                                                                                                                                  |
| ------------------------------------ | ----------------------------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `@whiskeysockets/baileys` (whatsapp) | exact `7.0.0-rc.9` → `7.0.0-rc14` in `extensions/whatsapp/package.json`             | 1 critical | Pre-release bump across five release candidates of a WhatsApp protocol library. The root package already resolves `rc14`, so the artifact is already present in the tree, but the WhatsApp channel's session, login, and media paths must be exercised before approving. |
| `@opentelemetry/sdk-node`            | root `^0.214.0` → `^0.222.0`; `extensions/diagnostics-otel` `^0.213.0` → `^0.222.0` | 2 high     | Pre-1.0 package where minor bumps are breaking by convention. Telemetry wiring should be re-verified.                                                                                                                                                                    |
| `@opentelemetry/propagator-jaeger`   | resolved `2.6.x` → `^2.11.0`                                                        | 1 high     | Transitive through `sdk-node`; moves with the `sdk-node` bump.                                                                                                                                                                                                           |
| `sharp`                              | `^0.34.5` → `^0.35.4`                                                               | 2 high     | 0.x minor bump plus a native `libvips`/`libheif` rebuild. Requires a working native build on each target platform.                                                                                                                                                       |
| `pdfjs-dist`                         | `^5.5.207` → `^6.3.289`                                                             | 1 high     | Major version bump. `src/media/pdf-extract.ts` is written against the legacy build path and must be re-validated.                                                                                                                                                        |

### 6.3 No upstream fix available

These cannot be closed by approving an upgrade. Each needs a mitigation, a
time-bounded exception, or a release block.

| Module                          | Advisory                                                                   | Installed | Latest available | Why there is no fix                                                                                                               |
| ------------------------------- | -------------------------------------------------------------------------- | --------- | ---------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `@mariozechner/pi-coding-agent` | GHSA-jfgx-wxx8-mp94 (CVE-2026-54328)                                       | 0.61.1    | 0.73.1           | The advisory range is `>=0.50.0 <=0.73.1` and no patched version is published. Upgrading to the latest release does not clear it. |
| `extract-zip`                   | GHSA-jmr9-qjv8-65gv (CVE-2026-56876), GHSA-7pqw-9j4j-h8q3 (CVE-2026-19693) | 2.0.1     | 2.0.1            | `2.0.1` is the latest published version and no patched version exists. Transitive through `@mariozechner/pi-coding-agent`.        |

## 7. Exact dependency upgrades requiring approval

Approving means editing files this task is not permitted to touch. Nothing
below has been applied.

1. `package.json` → `dependencies.tar`: `7.5.12` → `7.5.22`
2. `package.json` → `pnpm.overrides.tar`: `7.5.12` → `7.5.22`
3. `package.json` → `pnpm.overrides.form-data`: `2.5.4` → `2.5.6`
4. `package.json` → `dependencies.hono`: `4.12.8` → `4.13.8`
5. `package.json` → `pnpm.overrides.hono`: `4.12.8` → `4.13.8`
6. `package.json` → `pnpm.overrides`: add `ws: 8.21.3`
7. `package.json` → `dependencies.@opentelemetry/sdk-node`: `^0.214.0` → `^0.222.0` (testing required)
8. `package.json` → `dependencies.sharp`: `^0.34.5` → `^0.35.4` (testing required)
9. `package.json` → `dependencies.pdfjs-dist`: `^5.5.207` → `^6.3.289` (testing required)
10. `extensions/whatsapp/package.json` → `dependencies.@whiskeysockets/baileys`: `7.0.0-rc.9` → `7.0.0-rc14` (testing required)
11. `extensions/zalo/package.json` → `dependencies.undici`: `7.24.5` → `^7.29.0`
12. `extensions/diagnostics-otel/package.json` → `dependencies.@opentelemetry/sdk-node`: `^0.213.0` → `^0.222.0` (testing required)

Each approval must be followed by a lockfile regeneration and a rerun of
`pnpm audit --prod --json` to confirm the finding count actually dropped.

## 8. Caveat on the `form-data` override

The override `form-data: 2.5.4` forces a version that is **below the range its
consumers declare**. `axios@1.20.0` declares `form-data: ^4.0.6` in its own
manifest, yet the lockfile resolves `form-data: 2.5.4` for it. The same
override applies to `@slack/web-api` and `zca-js`.

Bumping the override to `2.5.6` clears the advisory with the smallest possible
behavioral delta, because the tree is already running the 2.x line. It does not
address the pre-existing range mismatch. Whether to keep pinning `form-data`
to 2.x at all, or to drop the override and let each consumer resolve its
declared range, is a separate decision that needs its own compatibility review.

## 9. Release-blocking findings

Presented as blocking unless Anass grants a time-bounded exception using the
template in [Phase 1 security exceptions](/audits/phase1-security-exceptions).
No exception is granted here.

| Finding                                                    | Why it blocks                                                                                                        |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `@whiskeysockets/baileys` GHSA-qvv5-jq5g-4cgg (critical)   | A direct dependency of the WhatsApp channel, reachable in session and inbound message paths.                         |
| `@mariozechner/pi-coding-agent` GHSA-jfgx-wxx8-mp94 (high) | Core agent runtime, no upstream fix, and the latest release is still affected.                                       |
| `extract-zip` (2 high)                                     | No upstream fix; transitive through the same runtime.                                                                |
| `pdfjs-dist` GHSA-hq66-cqwq-w95j (high)                    | Reachable through a lazy import on an untrusted input path (PDF), with arbitrary JavaScript execution as the impact. |

## 10. Mitigations that do not require dependency upgrades

These reduce exposure while upgrades or exceptions are pending. None of them
closes an advisory; they are compensating controls.

- **Archive extraction.** Even with a patched `tar`, enforce a maximum archive
  size and a wall-clock timeout before extracting, and reject archives above a
  configured entry count. `src/agents/skills-install-extract.ts` already shells
  out to the system `tar` binary rather than the node module.
- **`pdfjs-dist` (high).** `src/media/pdf-extract.ts` imports PDF.js lazily.
  Until the major bump lands, either disable PDF text extraction or run it
  inside the existing sandbox so that a malicious PDF cannot execute in the
  gateway process.
- **`@mariozechner/pi-coding-agent` (high).** The advisory is local privilege
  escalation via predictable temporary extension install paths on shared Linux
  hosts. Run the gateway as a single-user host, or in a container or service
  unit with a private `/tmp` (for example `PrivateTmp=yes`), and avoid
  multi-tenant shared hosts. This is a deployment control, not a code fix.
- **`@whiskeysockets/baileys` (critical).** Keep the WhatsApp channel disabled
  unless it is actively needed, and pair only with accounts the operator
  controls. Treat inbound WhatsApp content as untrusted.
- **`sharp` / `@whiskeysockets/baileys` media paths.** Limit ingestion of
  untrusted images until `sharp` is upgraded.
- **`@opentelemetry/*` (high).** Do not expose the Prometheus exporter endpoint
  beyond loopback. The advisory is a crash triggered by a malformed HTTP
  request to that endpoint.
- **Zalo proxy transport.** Keep proxy behavior covered by focused tests when
  updating `undici`; Zalo now resolves the patched shared Undici line instead
  of retaining its previous exact vulnerable pin.

## 11. Documentation posture review

Claims were checked against the working tree and, where they referenced
external resources, against live HTTP responses on 2026-09-22.

| Document                                                                                         | Claim                                                                                                                                                            | Finding                                                                                                                                                                                                                                                                    |
| ------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SECURITY.md`                                                                                    | "This document does not claim that the project is free of known vulnerabilities."                                                                                | **Accurate.** It names the unresolved critical and high production advisories and points at the baseline audit. No change needed.                                                                                                                                          |
| `docs/security/formal-verification.md`                                                           | Frontmatter summary: "Machine-checked security models for Agdi's highest-risk paths"; body instructs `git clone https://github.com/vignesh07/agdi-formal-models` | **Overstated and unverifiable.** That URL returns HTTP 404. There is no evidence the models were ever run against this tree. The page's own caveats are honest, but the summary and the reproduction steps assert artifacts that could not be retrieved.                   |
| `docs/security/CONTRIBUTING-THREAT-MODEL.md`                                                     | "We review new submissions within 48 hours"                                                                                                                      | **Contradicts `SECURITY.md`**, which states there is "no response-time SLA, no guaranteed acknowledgement window, and no guaranteed fix."                                                                                                                                  |
| `docs/security/CONTRIBUTING-THREAT-MODEL.md`                                                     | Reporting pointers to `https://trust.agdi.ai` and `https://github.com/agdi/trust`                                                                                | **Broken.** `trust.agdi.ai` does not resolve (curl transport failure), and `github.com/agdi/trust` returns HTTP 404. `SECURITY.md` directs reporters to GitHub private vulnerability reporting instead.                                                                    |
| `docs/security/CONTRIBUTING-THREAT-MODEL.md`                                                     | "Agdi security hall of fame", "Agdi community", "Discord #security channel"                                                                                      | **Unverifiable.** No evidence these exist for this repository.                                                                                                                                                                                                             |
| `docs/security/THREAT-MODEL-ATLAS.md`                                                            | "Report security issues to security@agdi.ai"                                                                                                                     | **Contradicts `SECURITY.md`**, which states there is no published security email address and that an `@agdi.ai` address should not be assumed to reach a maintainer.                                                                                                       |
| `docs/gateway/security/index.md:142`                                                             | Out-of-scope link to `https://github.com/agdi/agdi/blob/main/SECURITY.md#out-of-scope`                                                                           | **Broken.** Both `github.com/agdi/agdi` and the file path return HTTP 404. **Flagged only — not corrected**, because `docs/gateway/**` is outside the file boundary for this task. Owner should repoint it at `https://github.com/anassagd432/Agdi/blob/main/SECURITY.md`. |
| `docs/audits/phase1-baseline-2026-09-21.md`, `docs/audits/phase1-release-candidate-checklist.md` | Recorded audit counts and the two critical modules                                                                                                               | **Accurate.** Both match this triage.                                                                                                                                                                                                                                      |

## 12. Approved low-risk remediation outcome

On 2026-09-22, Anass approved a low-risk dependency-only remediation batch.
The root dependency and override for `tar` moved from `7.5.12` to `7.5.22`;
the `form-data` and `hono` overrides moved to `2.5.6` and `4.13.8`;
`ws` is now overridden to `8.21.3`; and Zalo's exact `undici@7.24.5` pin became
`^7.29.0`. The lockfile was regenerated with pnpm 10.32.1.

The production audit fell from 2 critical, 21 high, 47 moderate, and 6 low to
1 critical, 16 high, 16 moderate, and 4 low. The patched packages no longer
appear as advisory modules. A vulnerable `undici@7.24.5` remains only through
the separate `@mariozechner/pi-ai` dependency chain and is outside this batch.

Focused archive tests passed (39 passed, 4 skipped). Zalo, Discord, and
Telegram transport tests passed (47 passed). The backup command test group has
one unrelated failure before archive creation because no configuration file is
present. The normal build is blocked by a separate package-smoke defect:
`scripts/stage-bundled-plugin-runtime-deps.mjs` strips only legacy `openclaw`
host references, while repaired plugin manifests use `agdi`, causing staged
Discord `npm install --omit=dev` to reject `workspace:*`. That defect was not
changed as part of this dependency-remediation scope.

## 13. Files changed

| File                                         | Change                                                                         |
| -------------------------------------------- | ------------------------------------------------------------------------------ |
| `docs/audits/phase1-security-triage.md`      | New. This document.                                                            |
| `docs/audits/phase1-security-exceptions.md`  | New. Time-bounded exception template and empty registry.                       |
| `docs/security/CONTRIBUTING-THREAT-MODEL.md` | Corrected false reporting pointers and the contradictory 48-hour triage claim. |
| `docs/security/THREAT-MODEL-ATLAS.md`        | Corrected the `security@agdi.ai` reporting line.                               |
| `docs/security/formal-verification.md`       | Corrected the unverifiable models-repository claim.                            |

No file listed under "Do not modify" was touched. `package.json`,
`pnpm-lock.yaml`, overrides, dependencies, patches, source code, CI workflows,
release files, and `SECURITY.md` are unchanged by this task.

## 14. Release recommendation

**No-go for a public release in the current state.**

Reasoning:

1. One critical advisory (`@whiskeysockets/baileys`) remains in the production
   graph and is reachable through the WhatsApp channel.
2. Two high advisories (`@mariozechner/pi-coding-agent`, `extract-zip`) have no
   upstream fix and sit on the core agent runtime path.
3. The approved patch-level batch closed the direct `tar`, `form-data`, `hono`,
   `ws`, and Zalo `undici` resolution issues, but the remaining high-severity
   items still require compatibility work or an explicit exception decision.

The shortest credible path to a go decision is:

1. Repair the plugin runtime-staging host-name migration so packaged plugins
   can install their production dependencies.
2. Schedule compatibility testing for the remaining Baileys, OpenTelemetry,
   Sharp, and PDF.js upgrades.
3. For the no-fix Pi-agent and `extract-zip` items, either apply the
   compensating controls in
   section 10 and grant a time-bounded exception, or hold the release.

This is a recommendation, not an approval. The decision is Anass's.
