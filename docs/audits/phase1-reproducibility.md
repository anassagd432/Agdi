---
summary: "Measured Windows install and package-artifact evidence, the allowlist repair, and the Ubuntu run that is still pending"
read_when:
  - You need to repeat the frozen install evidence or record an Ubuntu run
  - You are deciding whether reproducibility can be claimed for a release candidate
title: "Phase 1 reproducibility"
---

# Phase 1 reproducibility

This file records what was actually executed on a Windows host, what it
returned, and what remains unproven. Nothing here is inferred from a plan or a
prior summary.

Reproducibility is **partially claimed**. See
[Claim status](#claim-status) for the exact scope.

## 1. Toolchain

Observed 2026-09-21/22 on the Windows host.

| Tool | Command                                                                           | Result                 | Exit |
| ---- | --------------------------------------------------------------------------------- | ---------------------- | ---- |
| OS   | `node -p "process.platform + ' ' + process.arch + ' ' + require('os').release()"` | `win32 x64 10.0.26200` | 0    |
| Node | `node --version`                                                                  | `v22.22.2`             | 0    |
| npm  | `npm --version`                                                                   | `10.9.7`               | 0    |
| pnpm | `npm exec --yes --package pnpm@10.32.1 -- pnpm --version`                         | `10.32.1`              | 0    |

`package.json` `packageManager` is `pnpm@10.32.1`; the executed version matches.
`engines.node` is `>=22.14.0`; `v22.22.2` satisfies it.

Two things about this host are worth stating plainly:

- `pnpm` is **not** on `PATH` as a bare command. It is invoked through
  `npm exec --yes --package pnpm@10.32.1 -- pnpm`, which resolves the pinned
  version. `corepack` also resolves `10.32.1` from `packageManager`, but its
  shim needs a Windows-style path to load.
- A system Node `v26.7.0` also exists on this machine. The earlier
  [baseline](/audits/phase1-baseline-2026-09-21) recorded Node `v24.5.0`; that
  runtime is no longer present. The Node version used for every result below is
  `v22.22.2`. A different Node major is a different toolchain and would need its
  own run.

## 2. Frozen installs, Windows

The lockfile changed **during** this pass, so the runs are split by which
lockfile they were measured against. Both are recorded; neither set is
extrapolated onto the other.

| Label      | `pnpm-lock.yaml` sha256                                            | Note                            |
| ---------- | ------------------------------------------------------------------ | ------------------------------- |
| Lockfile A | `aade9d0499cc91f2cf66ac6cc93c0fe0e7e40f500d92c3df5b11a9ff586eebbc` | State at the start of this pass |
| Lockfile B | `3181148ebf10b74a1fe01241ac88d33cae49491d22637cd0664be33f49dadb02` | Current on disk                 |

Another workstream rewrote both `package.json` and `pnpm-lock.yaml` at 02:17
local while this pass was running, applying dependency upgrades (`hono` 4.12.8
-> 4.13.8, `tar` 7.5.12 -> 7.5.22, plus `ws` 8.21.3 and `form-data` 2.5.6).
Those files are outside this agent's writable set and were not touched. The two
files are consistent with each other; the upgrade did not create a
manifest/lockfile mismatch. It did invalidate the earlier runs for the current
tree, which is why section 2.2 exists.

### 2.1 Lockfile A runs

Command shape:

```text
CI=true npm exec --yes --package pnpm@10.32.1 -- pnpm install --frozen-lockfile --ignore-scripts
```

| #   | Variant                                     | Exit | Duration                             | Lockfile before -> after   |
| --- | ------------------------------------------- | ---- | ------------------------------------ | -------------------------- |
| 1   | scripts disabled                            | 0    | 466s wall (pnpm reported `7m 15.6s`) | `aade9d04…` -> `aade9d04…` |
| 2   | scripts disabled, repeat                    | 1    | 25s                                  | `aade9d04…` -> `aade9d04…` |
| 2b  | scripts disabled, repeat again              | 1    | 9s                                   | `aade9d04…` -> `aade9d04…` |
| 2c  | scripts disabled, harness guard disabled    | 0    | 83s                                  | `aade9d04…` -> `aade9d04…` |
| 3   | scripts enabled                             | 0    | 107s                                 | `aade9d04…` -> `aade9d04…` |
| 4   | scripts enabled, after the allowlist repair | 0    | 103s                                 | `aade9d04…` -> `aade9d04…` |
| 5   | scripts disabled, confirmation              | 0    | 80s                                  | `aade9d04…` -> `aade9d04…` |

Two consecutive script-disabled frozen installs completed with exit 0 and left
the lockfile byte-identical (runs 1 and 2c). Run 1 is the slow one: it rebuilt a
`node_modules` tree that was 220 packages out of date. The later runs reused the
store.

**Peer warnings: none.** Every install log was grepped for `warn`, `peer`, and
`ignored build`. No peer-dependency warning and no ignored-build warning was
emitted in any run. This differs from the earlier lockfile-generation pass,
which warned about unmet peers for Vitest coverage, oxlint, and `opusscript`;
those warnings did not reappear here.

`CI=true` is required on this host. Without it, pnpm exits 1 with
`ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY` when it wants to recreate
`node_modules` and stdin is not a terminal.

### 2.2 Lockfile B runs

The same command, against the lockfile that is on disk now.

| #   | Variant                  | Exit | Duration | Lockfile before -> after   |
| --- | ------------------------ | ---- | -------- | -------------------------- |
| 6   | scripts disabled         | 0    | 80s      | `3181148e…` -> `3181148e…` |
| 7   | scripts disabled, repeat | 0    | 78s      | `3181148e…` -> `3181148e…` |

Both runs reused the store; the lockfile was byte-identical before and after
each. This reproduces the section 2.1 result on the upgraded graph. It does not
re-test the script-enabled path on lockfile B — that remains a gap, since the
upgrade changed four overridden packages.

### 2.3 Why runs 2 and 2b exited 1

They did not fail because of the project, the lockfile, or pnpm's own logic.
This agent host injects a `node-safe-delete` shim into every Node process and
sets `CODEBUDDY_SAFE_DELETE_BULK_THRESHOLD=50`. pnpm deletes its own scratch
directory during store connection, which crosses that threshold, and the shim
aborts the process:

```text
ERROR [safe-delete][SAFE_DELETE_BULK_CONFIRM_REQUIRED] {"count":50,"threshold":50,"scope":"turn",...}
```

Run 2c repeated the identical command with `NODE_OPTIONS` and the
`CODEBUDDY_SAFE_DELETE_*` variables unset for that child process only. It exited 0. **This is a harness workaround, not a project fix, and it means the Windows
durations above are not directly comparable to an unguarded host.** On a normal
CI runner or a developer machine the shim is absent and this failure mode does
not exist.

The two aborted runs left zero-byte `_tmp_<pid>_<hash>` marker files in the
repository root. They were removed. No repository file was affected.

## 3. Build-script allowlist: a real misclassification

`onlyBuiltDependencies` is declared twice with different contents.

| Source                                           | Entries |
| ------------------------------------------------ | ------- |
| `package.json` -> `pnpm.onlyBuiltDependencies`   | 11      |
| `pnpm-workspace.yaml` -> `onlyBuiltDependencies` | 10      |

The single difference is `@tloncorp/tlon-skill`, present only in
`package.json`.

**`pnpm-workspace.yaml` wins.** Two independent pieces of evidence:

1. Reading pnpm's shipped bundle (`pnpm@10.32.1`), the config assembly order in
   `getConfig` is: apply `getOptionsFromRootManifest(...)` from
   `package.json#pnpm` first, then, when a workspace directory exists, apply
   `getOptionsFromPnpmSettings(...)` from `pnpm-workspace.yaml` and assign each
   key over the top. The workspace file overwrites the manifest.
2. Executed on this tree:

```text
pnpm config get onlyBuiltDependencies --json
```

returned the **10-entry** list. `@tloncorp/tlon-skill` was absent. So the
declared intent in `package.json` was silently ineffective.

`@tloncorp/tlon-skill@0.3.0` is a real dependency (present in `pnpm-lock.yaml`,
`hasBin: true`) and it declares a real lifecycle script:

```json
"postinstall": "node scripts/postinstall.js"
```

That script is platform-safe. For an unsupported platform it warns and exits 0
rather than failing the install:

```js
if (!packageName) {
  console.warn(`[tlon-skill] Warning: No binary available for ${platform}-${arch}`);
  process.exit(0); // Don't fail install
}
```

### The repair

`pnpm-workspace.yaml` only, one line, alphabetically placed:

```yaml
onlyBuiltDependencies:
  - "@tloncorp/api"
  - "@tloncorp/tlon-skill"
  - "@whiskeysockets/baileys"
```

| Artifact                          | Before                                                             | After                                                              |
| --------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------ |
| `pnpm-workspace.yaml` sha256      | `1128288f79e5efe062b7b411433bbb4345ab75f134af0e27c0674493c5e995cf` | `b895ff1c42fde80de8c03d52a99f13920130520f8e608d836477c66903c3fa72` |
| effective `onlyBuiltDependencies` | 10 entries                                                         | 11 entries                                                         |

`pnpm-lock.yaml` was **not** changed by this repair. Run 4 (script-enabled,
frozen, post-repair) exited 0 and left both the lockfile and
`pnpm-workspace.yaml` byte-identical to their pre-run hashes.

### Stale entries, reported not removed

Three allowlist entries do not appear anywhere in `pnpm-lock.yaml`:
`@tloncorp/api`, `authenticate-pam`, and `@discordjs/opus`. They are inert.
They were left alone: removing them is not an allowlist _classification_ repair
and would widen scope. Someone who owns the dependency graph should decide
whether they are intentional forward-looking entries.

## 4. Script-enabled install does not execute lifecycle scripts

Run 3 (`--frozen-lockfile`, no `--ignore-scripts`) exited 0. It did **not** run
the allowlisted build scripts.

Evidence, from `node_modules/.modules.yaml` after the run:

```text
pendingBuilds: 10
  @whiskeysockets/baileys@7.0.0-rc14(jimp@1.6.1)(sharp@0.34.5)
  node-llama-cpp@3.18.1(typescript@5.9.3)
  sharp@0.34.5
  protobufjs@7.6.6
  @google/genai@1.52.0(@modelcontextprotocol/sdk@1.27.1(zod@4.6.5))
  koffi@2.16.3
  esbuild@0.28.2
  @matrix-org/matrix-sdk-crypto-nodejs@0.4.0
  @tloncorp/tlon-skill@0.3.0
  @whiskeysockets/baileys@7.0.0-rc.9(jimp@1.6.1)(sharp@0.34.5)
```

The list did not change after the allowlist repair, so `pendingBuilds` is not
driven by the allowlist. It is a queue that this install path does not drain.

A concrete consequence. `@matrix-org/matrix-sdk-crypto-nodejs` declares
`"postinstall": "node download-lib.js"`, which fetches its native library. After
the script-enabled install, the installed package contains no `.node` binary:

```text
node_modules/@matrix-org/matrix-sdk-crypto-nodejs/
  CHANGELOG.md  LICENSE  README.md  RELEASING.md
  download-lib.js  index.d.ts  index.js  package.json
```

and loading it fails. `pnpm rebuild @matrix-org/matrix-sdk-crypto-nodejs` exited
0 but produced no output and no binary.

Not every queued package is broken. These were loaded successfully after the
same install, because they ship prebuilt binaries as optional dependencies
rather than relying on a postinstall:

| Package      | Result                          |
| ------------ | ------------------------------- |
| `esbuild`    | loads, reports `0.28.2`         |
| `sharp`      | loads, reports libvips versions |
| `protobufjs` | loads                           |
| `koffi`      | loads                           |

So: **exit 0 from a script-enabled frozen install on this host is not evidence
that lifecycle scripts ran.** Treat it as "install graph resolved", not
"dependencies built". No lifecycle script _failed_ — none of the allowlisted
ones were executed.

## 5. Package artifact smoke

Script: `scripts/check-package-artifact-smoke.mjs` (new). It runs
`npm pack --dry-run --ignore-scripts --json`, scans the file list, then packs
for real, extracts the tarball into a temporary directory outside the checkout,
and resolves every declared entrypoint inside the extracted artifact.

```text
node scripts/check-package-artifact-smoke.mjs
```

The result **moved during this pass** because another workstream ran `pnpm
build` at 02:25. Both snapshots are recorded; neither replaces the other.

| Check                                           | Before build, 00:19:24Z            | After build, 00:27:46Z             |
| ----------------------------------------------- | ---------------------------------- | ---------------------------------- |
| Required provenance files present               | PASS                               | PASS                               |
| No credentials, session logs, or private config | FAIL — 5 stray files under `dist/` | FAIL — 2 stray files under `dist/` |
| Declared entrypoints resolve                    | FAIL — 271 of 274 unresolved       | FAIL — 134 of 274 unresolved       |
| Artifact contains runtime JavaScript            | PASS — 3 files                     | PASS — 1803 files                  |
| Smoke ran outside the repository checkout       | PASS                               | PASS                               |
| Dry-run file count                              | 3383                               | 2922                               |
| Script exit                                     | 1                                  | 1                                  |

The build fixed the missing-runtime problem and did not fix the stray-file
problem or the type-declaration problem. The script exits 1 in both states.

> **Superseded in part.** A later workstream (package artifact integrity) fixed
> bundled plugin staging, ran a full `pnpm build`, and repaired the smoke gate's
> rule set. The declared entrypoints now all resolve (274 of 274) and the
> violation count dropped from 13213 false positives to 1 real finding. The
> `.d.ts` files were never a declaration-build failure: `tsc` emits to
> `dist/plugin-sdk/src/plugin-sdk/*.d.ts`, and the flat paths `package.json#exports`
> declares are generated by `scripts/write-plugin-sdk-entry-dts.ts`, a later
> `pnpm build` step that had not run because the build was failing earlier.
> Current numbers and blockers: [Phase 1 package artifact integrity](/audits/phase1-package-artifact-integrity).
> The snapshots below remain the record of this pass.

### 5.1 Provenance files that ship

`LICENSE`, `THIRD_PARTY_NOTICES.md`, `README.md`, `CHANGELOG.md`,
`docs/reference/provenance.md`, and `skills/skill-creator/license.txt` are all
in the tarball in both snapshots. This closes the gap the baseline recorded,
where `THIRD_PARTY_NOTICES.md` was missing from `files`.

### 5.2 Stray artifacts under `dist/`

`dist/` is listed in `package.json` `files`, so everything under it ships.

Before the build, five non-package files were present:

```text
dist/codex-approved-security-audit.json     111191 bytes  02:17
dist/codex-typecheck-verify.stderr.log           0 bytes  01:44
dist/codex-typecheck-verify.stdout.log           0 bytes  01:44
dist/typecheck-diagnostics.txt                   0 bytes  01:37
dist/typecheck-diagnostics.utf8.txt          21823 bytes  00:42
```

After the build, two remain:

```text
dist/codex-security-build-pinned.stderr.log     899 bytes  02:25
dist/codex-security-build-pinned.stdout.log     807 bytes  02:25
```

These are diagnostic and work-product artifacts written by other workstreams on
this shared checkout. They are not this agent's files and were not touched. The
set changed twice during the pass — `codex-approved-security-audit.json`
appeared at 02:17 and was gone by 02:26; the `codex-security-build-pinned` logs
appeared at 02:25. This is a recurring pattern, not a one-off: any workstream
that writes into `dist/` silently adds to the published package.

`dist` is in `.gitignore`, but `.gitignore` has no effect on `npm pack`.

The fix belongs to whoever owns `package.json` `files` or `.npmignore`: exclude
`dist/**/*.log` and the diagnostic files, or stop writing diagnostics into
`dist/`. This agent's writable set includes neither `.npmignore` nor the `files`
field, so it was reported instead of patched.

No credential, `.env`, key, session, or private-config path was found in the
tarball in either snapshot. The files above are build noise, not a secret leak.
They are still not appropriate release content.

> **Follow-up.** Once bundled plugin runtime deps were staged into
> `dist/extensions/*/node_modules`, the tarball did gain a dotenv file:
> `dist/extensions/telegram/node_modules/bottleneck/.env`, shipped by the
> `bottleneck` package itself. It holds localhost Redis defaults, not a
> credential. Recorded in [Phase 1 package artifact integrity](/audits/phase1-package-artifact-integrity).

**A note on the check itself.** The first version of this rule flagged any file
at `dist/` root that was not a `.d.ts`, which produced 1366 false positives
against real build output. A second version using a build-extension allowlist
produced 106 more, because the build also emits `.md`, `.prose`, and `.hoon`
assets. The shipped rule flags only diagnostic extensions (`.log`, `.txt`,
`.tmp`, `.bak`, `.trace`, `.heapsnapshot`) under `dist/`, which measured against
a real build has no false positives. The cost is a stated gap: a dropped
non-diagnostic artifact, such as a `.json` report, is indistinguishable from
generated metadata by extension and will not be flagged.

> **Follow-up.** A third revision closed that gap and fixed a larger problem.
> Detection now also matches diagnostic **name suffixes** (`-report`, `-audit`,
> `-diagnostics`, and seven others), measured against a full build's 17959 files
> under `dist/` with zero false positives. `scan` and `profile` were rejected as
> suffixes because real build output ends with them. Separately, the rule that
> forbade every `node_modules/` path produced 13213 false positives once staging
> worked, because `release-check.ts` intentionally allows
> `dist/extensions/<id>/node_modules/`. The policy now lives in one shared
> module. See [Phase 1 package artifact integrity](/audits/phase1-package-artifact-integrity).

### 5.3 Entrypoint resolution

`package.json` declares 137 `exports` subpaths plus `main` and two `bin`
entries — 274 targets in total. Resolving them inside the extracted artifact:

| Snapshot                                 | Resolve | Unresolved | Cause                                                              |
| ---------------------------------------- | ------- | ---------- | ------------------------------------------------------------------ |
| 00:19:24Z, before build                  | 3       | 271        | `dist/` held only `.d.ts`; no runtime output                       |
| 00:27:46Z, after build                   | 140     | 134        | runtime `.js` exists; no `.d.ts` exists                            |
| After full `pnpm build` (follow-up pass) | **274** | **0**      | `write-plugin-sdk-entry-dts.ts` generated the 134 flat entry shims |

Before the build, `main` -> `dist/index.js` and every `exports` target were
missing because no JavaScript had been emitted.

After the build, `dist/index.js` and the `./plugin-sdk/*.js` runtime targets
resolve. The 134 remaining failures are all `types` conditions —
`exports["./plugin-sdk"].types` -> `./dist/plugin-sdk/index.d.ts`,
`exports["./plugin-sdk/core"].types` -> `./dist/plugin-sdk/core.d.ts`, and so
on. `find dist -name "*.d.ts"` returns **0** after the build: the declaration
output was removed and not regenerated. `build:plugin-sdk:dts` still ends with
`|| true`, so a failing declaration build does not fail `pnpm build`.

`npm pack` has **no** `prepack`, `prepare`, or `prepublishOnly` hook in this
package, so packing never builds. Packing depends on a separate `pnpm build`
having already run and succeeded.

Read this as: the packaging pipeline is unproven end to end, and the build that
did run produced a tarball whose type declarations do not resolve. Publishing
from the current tree would ship a package with broken `types` resolution.

> **Follow-up, corrected.** `find dist -name "*.d.ts"` returning 0 was a symptom
> of the build aborting earlier, not of a broken declaration build. `tsc` emits
> to `dist/plugin-sdk/src/plugin-sdk/*.d.ts` because `rootDir` is `.`, and
> `scripts/write-plugin-sdk-entry-dts.ts` generates the flat
> `dist/plugin-sdk/<entry>.d.ts` paths that `exports` declares. After a full
> build, all 274 declared targets resolve and 5769 `.d.ts` files exist under
> `dist/`. `tsc -p tsconfig.plugin-sdk.dts.json` exits 0 with zero diagnostics,
> so the `|| true` that used to follow it was masking nothing; another
> workstream has since removed it. `npm pack` still has no build hook.

## 6. Determinism summary

Lockfile identity across every completed frozen install on this host:

| Lockfile      | Completed runs          | Exit 0 | Hash changed |
| ------------- | ----------------------- | ------ | ------------ |
| A `aade9d04…` | 5 (runs 1, 2c, 3, 4, 5) | 5 of 5 | never        |
| B `3181148e…` | 2 (runs 6, 7)           | 2 of 2 | never        |

Seven completed frozen installs, none of which modified its lockfile. Two
attempts on lockfile A exited 1 for the environment reason in section 2.3; both
also left the lockfile untouched.

`pnpm-workspace.yaml` sha256 after the repair, unchanged across runs 4, 5, 6 and
7: `b895ff1c42fde80de8c03d52a99f13920130520f8e608d836477c66903c3fa72`.

### Other verification

```text
node scripts/check-workspace-package-invariants.mjs --json
```

Exit 0. `{"packageCount":88,"violationCount":0,"violations":[]}`.

```text
node --test scripts/check-workspace-package-invariants.test.mjs
```

Exit 0. 9 tests passed.

```text
node --test scripts/check-package-artifact-smoke.test.mjs
```

Exit 0. 8 tests passed. These pin the `dist/` classification rule against the
extensions a real build emits, because the first two versions of that rule
produced 1366 and then 106 false positives. They also cover the forbidden-content
patterns and the entrypoint expansion for `main`, `bin`, and conditional
`exports`.

```text
git diff --check
```

Exit 0. CRLF conversion notices only, on files owned by other workstreams. No
whitespace errors were introduced.

### Allowlist agreement after the rewrite

Following the 02:17 `package.json` rewrite, both files declare identical lists:

| Key                        | `package.json` | `pnpm-workspace.yaml` | Agree |
| -------------------------- | -------------- | --------------------- | ----- |
| `onlyBuiltDependencies`    | 11             | 11                    | yes   |
| `ignoredBuiltDependencies` | 2              | 2                     | yes   |

The repair is therefore consistent with the upgraded manifest. The duplication
itself remains a hazard: only the workspace file takes effect, so the two can
silently drift again.

## 7. Ubuntu status: PENDING

No Ubuntu host was available in this session. **No Ubuntu result exists, and
none is claimed.** Do not mark this section passed from the Windows log above.

Run the following on an Ubuntu machine or in the existing `ubuntu-latest` CI
job. Record the OS string, Node version, pnpm version, both exit codes, both
durations, and every warning.

```text
node --version
npm exec --yes --package pnpm@10.32.1 -- pnpm --version
sha256sum pnpm-lock.yaml

CI=true npm exec --yes --package pnpm@10.32.1 -- pnpm install --frozen-lockfile
sha256sum pnpm-lock.yaml

CI=true npm exec --yes --package pnpm@10.32.1 -- pnpm install --frozen-lockfile
sha256sum pnpm-lock.yaml

node -e "const m=require('./node_modules/.modules.yaml'); console.log(JSON.stringify(m.pendingBuilds||[]))"
node scripts/check-package-artifact-smoke.mjs
git diff --check
```

Required observations before the section can be marked passed:

- Both installs exit 0.
- `pnpm-lock.yaml` sha256 is identical across all three measurements and equals
  whatever the lockfile on the tree under test actually is. At the time of
  writing that is
  `3181148ebf10b74a1fe01241ac88d33cae49491d22637cd0664be33f49dadb02`. **Re-read
  the hash on the day you run this** — the file changed once already during this
  pass.
- The first install (scripts enabled) either drains `pendingBuilds` or explains
  why not. Compare against the Windows result in section 4, where it did not.
- `@matrix-org/matrix-sdk-crypto-nodejs` has a `.node` binary and loads.
- The smoke script's entrypoint check is expected to fail until `pnpm build`
  runs. Record the failure rather than working around it.

A proposed `workflow_dispatch` job on `ubuntu-latest` would run the two frozen
installs, upload the log, and must not publish and must not use `|| true`. That
job is a proposal, not a required check, and it does not exist yet.

## 8. Unresolved warnings and risks

| Item                                         | Status                                                                                                                                                                                                                                                                                                                 |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Peer dependency warnings                     | None observed in any Windows run. Not re-verified on Ubuntu.                                                                                                                                                                                                                                                           |
| Lifecycle script failures                    | None — but allowlisted scripts did not execute (section 4). This is the largest open question.                                                                                                                                                                                                                         |
| `pendingBuilds` not drained                  | Unexplained on Windows. 10 entries after every install.                                                                                                                                                                                                                                                                |
| Package entrypoints unresolved               | 134 of 274 after the 02:25 build, all `types` conditions. **Resolved in the follow-up pass:** a full `pnpm build` emits the 134 flat `dist/plugin-sdk/*.d.ts` entry shims and 274 of 274 declared targets resolve. See [Phase 1 package artifact integrity](/audits/phase1-package-artifact-integrity).                |
| Stray `dist/` artifacts shipped              | 2 files at the last snapshot, and the set changes as other workstreams write into `dist/`. The `codex-security-build-pinned` logs were gone after the follow-up build. One new finding replaced them: `dist/extensions/telegram/node_modules/bottleneck/.env` ships once plugin runtime deps are staged. Owner: unset. |
| `build:plugin-sdk:dts` masked by `\|\| true` | The declaration build produced nothing and `pnpm build` still reported success. **Suppression removed by another workstream.** The follow-up pass confirms `tsc -p tsconfig.plugin-sdk.dts.json` exits 0 with zero diagnostics, so it was masking nothing.                                                             |
| Stale allowlist entries                      | `@tloncorp/api`, `authenticate-pam`, `@discordjs/opus`. Reported, not changed.                                                                                                                                                                                                                                         |
| Node major version                           | `v22.22.2` here. The baseline's `v24.5.0` is gone. Other majors unverified.                                                                                                                                                                                                                                            |
| Lockfile churn mid-pass                      | `package.json` and `pnpm-lock.yaml` were rewritten by another workstream at 02:17, mid-run. Evidence is now split across two lockfile revisions.                                                                                                                                                                       |
| Harness bulk-delete guard                    | Environment-only. Makes Windows timings non-comparable to a clean host.                                                                                                                                                                                                                                                |

## 9. Claim status

**Partially claimed.**

Claimed, on Windows only, with `Node v22.22.2` and `pnpm 10.32.1`:

- A frozen, script-disabled install completes with exit 0 and does not modify
  `pnpm-lock.yaml`. Reproduced across seven completed runs, on two different
  lockfile revisions, including the current one.
- The effective build-script allowlist is now the intended 11 entries, and that
  repair does not disturb the lockfile. Both declaration sites now agree.
- The tarball includes the required license and provenance files.
- No credentials, session data, or private configuration would be published.

Not claimed:

- Cross-platform reproducibility. There is no Ubuntu run.
- That a clean checkout builds its native dependencies. The script-enabled
  install exits 0 without executing them.
- That the script-enabled path behaves the same on the upgraded graph. Runs 3
  and 4 were on lockfile A; lockfile B was only tested with scripts disabled.
- That the published tarball is correctly typed. After the build, all 134
  remaining entrypoint failures are `types` conditions and `dist/` holds no
  `.d.ts` files. The runtime entrypoints now resolve.
  **Superseded in the follow-up pass:** after a full `pnpm build`, 274 of 274
  declared targets resolve. Still not claimed end to end, because `npm pack` has
  no build hook and `release:check` cannot run in this checkout.
- That any of this holds on a Node major other than 22.
