---
summary: "Status of AGDI's required CI gates: which suppressions were removed, which are retained, and exactly what still blocks them"
read_when:
  - You are deciding whether AGDI's required CI checks can be trusted
  - You are about to remove a `|| true` from a package.json gate
  - You are triaging a failing format, unit-test, or plugin-sdk declaration job
title: "Phase 1 CI gate integrity"
---

# Phase 1 CI gate integrity

This document records which required CI gates were masked with `|| true`, what
each one actually does when run directly, and what still blocks the ones that
remain masked. Every number here comes from a command run on this working tree;
anything not verified is labelled as unverified.

## Method

Each gate was run directly, without its wrapper, capturing exit code, duration,
and the first actionable error. A suppression is only removed once its direct
command passes. Nothing was committed, pushed, tagged, or published.

## Baseline: direct command results

| Gate             | Direct command                              | Exit | Duration         | Result                                     |
| ---------------- | ------------------------------------------- | ---- | ---------------- | ------------------------------------------ |
| Format           | `oxfmt --check --threads=1`                 | 1    | 27s              | 8,850 of 8,980 files differ (working tree) |
| Format           | same, against committed LF content          | 1    | 39s              | 284 of 8,839 files differ                  |
| Format           | same, default config (no repo config)       | 1    | 27s              | 219 of 8,839 files differ                  |
| Unit tests       | `node scripts/test-parallel.mjs`            | 1    | 2s               | `pnpm.cmd` not on PATH on this host        |
| Unit tests       | `vitest run --config vitest.unit.config.ts` | 1    | did not complete | real assertion failures, see below         |
| Declaration emit | `tsc -p tsconfig.plugin-sdk.dts.json`       | 0    | 89s              | clean                                      |
| Declaration emit | same, fresh buildinfo and temp outDir       | 0    | 110s             | clean, zero diagnostics                    |
| Public typecheck | `tsc --noEmit`                              | 0    | -                | already honest, no wrapper                 |

`build:plugin-sdk:dts` was masked but passing. The other two are masked and
failing.

The working-tree format count is not stable and should not be quoted as a single
figure: it moved between 8,850/8,980, 8,934/9,089, and 9,016/9,203 across runs on
the same tree, because it depends on which files exist at that moment (other
workstreams were writing), on Oxfmt's `.gitignore`-based ignore handling, and on
whether `-c .oxfmtrc.jsonc` is passed explicitly. The committed-content figures
(284 and 219) are the stable, reproducible ones.

## Suppression ledger

| Script                 | Before                                          | After                                  | Why                                                                             |
| ---------------------- | ----------------------------------------------- | -------------------------------------- | ------------------------------------------------------------------------------- |
| `build:plugin-sdk:dts` | `tsc -p tsconfig.plugin-sdk.dts.json \|\| true` | `tsc -p tsconfig.plugin-sdk.dts.json`  | Direct command exits 0, including from a clean buildinfo. The mask hid nothing. |
| `format:check`         | `oxfmt --check --threads=1 \|\| true`           | unchanged                              | 219-284 tracked files genuinely differ. Mass formatting is not approved.        |
| `test:unit`            | `pnpm test \|\| true`                           | unchanged                              | The unit suite has real assertion failures.                                     |
| CI dead-code step      | `pnpm deadcode:knip \|\| true`                  | `continue-on-error: true`, job renamed | Not ready to gate; now explicitly informational.                                |

One suppression was removed, three were deliberately retained.

### What the retained masks actually look like

Run through the public script (so the mask is in play), the failure is printed and
then swallowed:

```
$ pnpm format:check
...
Format issues found in above 9016 files. Run without `--check` to fix.
$ echo $?
0
```

The direct command exits 1; the public script exits 0. That is the false green in
one line. `pnpm test:unit` behaves the same way: it forwards to `pnpm test` and
returns 0 regardless of the failures listed above.

For contrast, the un-suppressed gate now reports honestly through the same path:

```
$ pnpm build:plugin-sdk:dts
> tsc -p tsconfig.plugin-sdk.dts.json
$ echo $?
0
```

## Format: the "8,800 differing files" figure is mostly a checkout artifact

The headline number is misleading and the root cause is not a config error.

**What is actually happening.** The working tree on this host has CRLF line
endings (`git config core.autocrlf` is `true`, and the repository has no
`.gitattributes`). Oxfmt normalises to LF. Byte-level inspection of
`src/acp/commands.ts` shows `\r\n` in the working tree and `\n` in Oxfmt output,
which makes Oxfmt report _every_ text file as differing.

To separate the artifact from a real backlog, the committed blob content for all
8,839 flagged tracked files was materialised with `git cat-file --batch` into a
scratch tree (committed blobs are LF) and re-checked:

| Target                                          | Files differing  |
| ----------------------------------------------- | ---------------- |
| Working tree as-is (CRLF)                       | 8,934 of 9,089   |
| Committed LF content, restored `.oxfmtrc.jsonc` | **284** of 8,839 |
| Committed LF content, Oxfmt defaults            | **219** of 8,839 |
| Committed LF content, experimental options off  | **219** of 8,839 |

So roughly 97% of the reported 8,850 is a Windows checkout artifact, and the
genuine backlog is 219 files under the settings CI would actually use.

**Is the restored Oxfmt config correct for AGDI?** Unproven, and it makes the
gate further from green rather than closer:

- `.oxfmtrc.jsonc` is **untracked** (`git ls-files` returns nothing for it). It
  exists only in this working tree. A fresh CI checkout therefore runs Oxfmt with
  defaults, which is the 219-file column, not the 284-file column.
- Its `ignorePatterns` were copied from OpenClaw `v2026.3.24` and reference
  directories AGDI does not have (`apps/`, `Swabble/`, `vendor/`,
  `docs/_layouts/`) while omitting directories AGDI does have (`website/`,
  `ui/`, `plans/`, `.workbuddy-ai/`, `tmp/`). Oxfmt flagged
  `.workbuddy-ai/memory/2026-09-22.md` and `website/.vercel/project.json` as a
  result.
- `experimentalSortImports` accounts for the difference between 284 and 219: it
  adds 65 files of import reordering on top of the default backlog.
- The config is self-consistent once applied: writing with it and re-checking
  converges to "All matched files use the correct format".

**Counter-evidence that Oxfmt is the intended formatter.** The repository
already ships `scripts/lib/format-generated-module.mjs`, which runs Oxfmt on
generated output, and it is used by `generate-base-config-schema.ts` and
`generate-bundled-plugin-metadata.mjs`. Those generated files are Oxfmt-clean.
So Oxfmt is the intended tool; the config was simply never committed and the
backlog was never applied.

**What the diffs are.** Every sampled difference is mechanical: collapsing short
arrays onto one line, re-wrapping argument lists, padding markdown tables,
collapsing import lists. No sampled diff changed program behaviour. Applying
Oxfmt to the committed LF content changed **284 files / 17,181 lines**, of which
`docs/.generated/config-baseline.json` alone accounts for 10,236 lines and three
`ui/src/translations/*.json` files account for 2,094 more.

**Incidental finding.** Oxfmt 0.41.0 panics on Windows when writing in parallel
(`thread panicked ... Failed to write to ...`, exit 127) partway through the
tree. Writing with `--threads=1` succeeds. Anyone applying a formatting commit on
Windows should use `--threads=1`.

**Proposal (requires approval; suppression retained until then).** Do not
mass-format. In order:

1. Commit a `.gitattributes` that pins `* text=auto eol=lf` (or equivalent) so
   `format:check` gives the same answer on Windows and Linux. Without this, the
   gate is not deterministic across platforms. _This file is outside the scope of
   this task and was not created._
2. Decide the target config explicitly: either commit `.oxfmtrc.jsonc` as-is
   (284-file backlog) or trim `experimentalSortImports` first (219-file
   backlog). The default-config column is what CI evaluates today.
3. Land one mechanical formatting commit produced with
   `oxfmt --write --threads=1`, reviewed as formatting-only. Regenerate
   `docs/.generated/config-baseline.json` through `pnpm config:docs:gen` rather
   than formatting it by hand, so the generator and the formatter agree.
4. Only then remove `|| true` from `format:check`.

## Unit tests: retained suppression, real failures

`test:unit` is `pnpm test || true`, and `pnpm test` is
`node scripts/test-parallel.mjs`. Two separate problems:

**The body is wrong for a unit gate.** `git show 26afa72` shows `test:unit` was
changed from `vitest run --config vitest.unit.config.ts` to `pnpm test || true`
in a commit titled "fix(test): configure test:unit to delegate through test
runner". That change both widened the script from unit tests to the entire
parallel test run and added the mask. Restoring the original body is a
behavioural decision and was not made here.

**The suite genuinely fails.** Running the unit config directly
(`vitest run --config vitest.unit.config.ts`) produced real assertion failures.
Confirmed by reproduction, not inferred:

| Test file                                         | Failing tests |
| ------------------------------------------------- | ------------- |
| `src/config/schema.base.generated.test.ts`        | 1             |
| `src/cli/update-cli/restart-helper.test.ts`       | 6             |
| `src/plugins/contracts/registry.contract.test.ts` | 2             |
| `src/secrets/runtime.integration.test.ts`         | 1             |
| `src/canvas-host/server.test.ts`                  | 1             |
| plus one env-var inheritance case                 | 1             |

Across the bounded run that did complete its file sweep, **136 individual test
cases failed**. These are not environment-dependent: the failures are assertion
mismatches in committed code. Example, reproduced in isolation:

```
FAIL src/cli/update-cli/restart-helper.test.ts > restart-helper
     > prepareRestartScript > creates a systemd restart script on Linux
AssertionError: expected '...' to contain 'systemctl --user restart \'openclaw-g…'
- systemctl --user restart 'openclaw-gateway.service'   (asserted by the test)
+ systemctl --user restart 'agdi-gateway.service'       (emitted by the code)
```

That is rename drift: the implementation moved to `agdi-gateway.service` while
the test still encodes the pre-rename `openclaw-gateway.service`. The same
pattern appears in the macOS launchd and Windows schtasks cases. These need the
owning workstream to decide which side is authoritative; they are not fixable by
adjusting a CI gate.

The first actionable failure, reproduced in isolation in 31s:

```
FAIL src/config/schema.base.generated.test.ts > generated base config schema
     > matches the computed base config schema payload
- "version": "2026.3.24"          (committed baseline)
+ "version": "2026.5.9"           (computed from current source)
```

The committed baseline also carries `anyOf: [{type: string}, ...]` where the
current generator emits `type: ["string", "number", "boolean"]`. The baseline
was generated on 2026-03-22 and the package version has since moved to
`2026.5.9`; it is stale in at least two ways.

Fixing this means regenerating `src/config/schema.base.generated.ts`, which is
outside the file boundaries of this task. `src/config/` has no uncommitted
changes, so this drift is in the committed state, not another workstream's
in-progress work.

**The suite does not complete, and that is a separate blocker.** Three
independent runs of the unit config all stalled at the same point — immediately
after `src/config/schema.base.generated.test.ts`:

| Attempt | Invocation                                         | Ceiling | Outcome                                   |
| ------- | -------------------------------------------------- | ------- | ----------------------------------------- |
| 1       | `--pool=forks --isolate=false`                     | none    | stalled, killed at ~48 min                |
| 2       | default isolation, bounded                         | 25 min  | stalled, killed at ceiling, no summary    |
| 3       | `--testTimeout=15000 --hookTimeout=15000`, bounded | 15 min  | `EXIT=124`, killed at ceiling, no summary |

Attempt 3 matters: raising `--testTimeout` and `--hookTimeout` to 15s did not get
past the stall, so the hang is not a test-level await that Vitest can time out.
Something outside the test timeout machinery blocks the run — a worker that never
exits, a blocking `spawnSync`, or a leaked handle. **`pnpm test` cannot complete
on this tree at all**, which means `test:unit` is not merely failing, it is
hanging. That needs the owning workstream to find the blocking test; it is not
fixable from a CI gate.

Because no run reached the summary line, the **136 failing test cases** counted in
attempt 2 are a lower bound and the total test count is unknown. Per-file
attribution beyond the table above was not completed.

## Working tree context

This task ran against a shared checkout with other workstreams active.
`package.json` already carried uncommitted changes that are **not** mine,
including dependency pin bumps (`hono`, `tar`, `form-data`, a new `ws`
override), a `THIRD_PARTY_NOTICES.md` entry in `files`, and an Oxfmt-driven
alphabetical re-sort of `scripts`. The same working tree also already had
`typecheck` un-suppressed (`tsc --noEmit`) before this task began. Those changes
were left untouched. Only the three `package.json` edits listed under "Files
changed" below are attributable to this task.

## Declaration emit: suppression removed

`tsc -p tsconfig.plugin-sdk.dts.json` exits 0 both incrementally (89s) and from a
clean buildinfo with a temporary `outDir` (110s, zero diagnostics). Note that
`tsconfig.plugin-sdk.dts.json` sets `noEmitOnError: false`, so TypeScript would
still emit declarations while exiting non-zero; the exit code is the signal that
matters, and it is now honest.

## CI dead code: explicitly informational

The job was named `check-additional`, which reads like a required check, and it
was simultaneously listed in the planner's `requiredCheckNames`. It ran
`pnpm deadcode:knip || true`, so it could not fail.

Changes:

- Job id renamed `check-additional` -> `deadcode-informational`.
- Step renamed `Dead code report (informational, non-blocking)`.
- `|| true` replaced with `continue-on-error: true`, so the non-blocking status
  is visible in the workflow run instead of hidden in the command.
- Removed from `requiredCheckNames` in `scripts/test-planner/planner.mjs`, so CI
  no longer advertises a required check that cannot fail.

`knip` itself still needs triage before it can gate; it has not been evaluated
here.

## Additional finding: `check:base-config-schema` is a silent no-op

Found while investigating the unit-test failure. Not fixed here, because fixing
it makes `pnpm check` red and the remediation is outside this task's file
boundaries.

`scripts/generate-base-config-schema.ts` only runs its CLI block when:

```js
import.meta.url === new URL(process.argv[1] ?? "", "file://").href;
```

That comparison can never succeed:

- Relative invocation (what `pnpm check:base-config-schema` does): `argv[1]` is
  `scripts/generate-base-config-schema.ts`, which resolves to
  `file:///scripts/...`, while `import.meta.url` is
  `file:///<repo>/scripts/...`.
- Windows absolute path: `C:/...` is parsed as a URL _scheme_, producing
  `c:/Users/...`, which is not a `file:` URL.

Measured directly: `writeBaseConfigSchemaModule({ check: true })` returns
`changed: true`, but `node --import tsx scripts/generate-base-config-schema.ts
--check` exits 0 and prints nothing. The correct idiom is
`pathToFileURL(process.argv[1]).href`, which is what the new checker uses.

`pnpm check` chains this script, so `pnpm check` is green partly because one of
its members never runs.

## `pnpm check` is red before it reaches any of this

Running the full chain (`pnpm check`) stops at the second step, `pnpm
check:public-branding`, which exits 1:

```
Public branding leaks detected:
- README.md:1 -> OpenClaw string literal
```

This is **not** caused by anything in this task, and it is not a real branding
leak. Two things combine:

1. Another workstream added an attribution line to `README.md` (line 25):
   `Agdi is independently maintained. ... derived substantially from
[OpenClaw](https://github.com/openclaw/openclaw).` That is prose containing a
   markdown link — no quoted string literal. `HEAD`'s `README.md` contains zero
   occurrences of `OpenClaw`; the working tree contains one.
2. `scripts/check-public-branding.mjs` matches quoted `OpenClaw` literals with
   `"(?:\\.|[^"\\])*\bOpenClaw\b(?:\\.|[^"\\])*"`. The negated class
   `[^"\\]` includes `\n`, so the pattern treats _any_ two quote characters as a
   string delimiter regardless of distance. Measured: the single match in
   `README.md` starts at the quote in `align="center"` on line 1 and runs to a
   quote inside a Mermaid block — **a 42-line span**. That is why the reported
   line number (1) does not match the actual occurrence (25).

Net effect: `pnpm check` cannot be green on this working tree, and the chain
never reaches `check:ci-gate-integrity` or `test:ci-gate-integrity`. Those two
were therefore verified through their own public scripts
(`pnpm check:ci-gate-integrity`, `pnpm test:ci-gate-integrity`), not through the
chain.

**Not fixed here.** Bounding the regex to a single line would stop it flagging a
prose mention of `OpenClaw`, which is indistinguishable from weakening a branding
check — explicitly out of bounds for this task. The owning workstream should
decide which is correct: line-bound the regex (it is clearly matching across
lines today), or keep `README.md` free of the name in prose. Either way the
decision is theirs, not a CI-gate decision.

## Every `check` step, measured individually

Because `pnpm check` short-circuits, the state of the later gates is invisible
from a chain run. Each step was therefore executed on its own, in chain order.
This is the honest gate picture, and it is worse than the three-gate summary
elsewhere in this document.

| Step                                   | Exit    | Nature                                                                      |
| -------------------------------------- | ------- | --------------------------------------------------------------------------- |
| `check:no-conflict-markers`            | 0       | ok                                                                          |
| `check:public-branding`                | **1**   | see above; regex spans 42 lines                                             |
| `check:host-env-policy:swift`          | 0       | ok                                                                          |
| `check:base-config-schema`             | 0       | **silent no-op** — should be 1                                              |
| `check:bundled-plugin-metadata`        | **1**   | committed baseline is `[] as const`; the generator now finds **84** entries |
| `check:bundled-provider-auth-env-vars` | 0       | ok                                                                          |
| `check:ci-gate-integrity`              | 0       | added by this task                                                          |
| `test:ci-gate-integrity`               | 0       | added by this task                                                          |
| `format:check`                         | 0       | **masked**; direct command exits 1                                          |
| `typecheck`                            | **134** | **out of memory** — see below                                               |
| `plugin-sdk:check-exports`             | 0       | ok                                                                          |
| `lint`                                 | 0       | ok                                                                          |
| 13 × `lint:*`                          | 0       | ok                                                                          |

So `pnpm check` contains **five** distinct problems, not two: three steps that
fail honestly, one masked, one that never runs.

### `typecheck` is not reliably green

`tsc --noEmit` **crashes with an out-of-memory abort on this host**:

```
FATAL ERROR: Ineffective mark-compacts near heap limit Allocation failed - JavaScript heap out of memory
ELIFECYCLE  Command failed with exit code 134.
```

Measured both ways on the same tree:

| Invocation                                            | Exit    | Duration |
| ----------------------------------------------------- | ------- | -------- |
| `tsc --noEmit` (default heap)                         | **134** | 83s      |
| `NODE_OPTIONS=--max-old-space-size=8192 tsc --noEmit` | **0**   | 72s      |

The host has 31.9 GB of RAM with 18.1 GB free, so this is not a starved machine —
the type-checking program simply exceeds Node's default old-space.

**This contradicts the working assumption that `typecheck` is "honest and green".**
It is green only when an 8 GB heap is supplied via `NODE_OPTIONS`, and
`.github/` contains **no** `NODE_OPTIONS` or `max-old-space-size` setting
anywhere (verified by grep across `.github/`). CI therefore runs `tsc --noEmit`
at the default heap. Whether a GitHub runner OOMs the same way is **unverified**
— it depends on the runner's memory and Node's default sizing — but nothing in
the repository makes the 8 GB heap the default, so the green result is
environment-dependent rather than guaranteed.

Removing `|| true` from `typecheck` (done by an earlier workstream, not this one)
was correct, but it only makes the gate honest; it does not make it pass
everywhere. A `NODE_OPTIONS` setting in the CI environment, or splitting the
program, is needed before this gate can be called green.

## Regression protection

`scripts/check-ci-gate-integrity.mjs` runs in the `check` chain (and therefore
in CI) and fails with exit 1 when:

- any script uses `|| true` without being explicitly classified;
- a documented gate suppression lacks a reason, an owner, or a documentation
  path that exists on disk;
- a documented gate suppression no longer masks anything, which forces the
  allowlist to shrink as gates are fixed;
- the dead-code job is not named `*-informational`, is masked with `|| true`, or
  lacks `continue-on-error: true`;
- an informational job appears in `requiredCheckNames`.

`scripts/check-ci-gate-integrity.test.mjs` covers each rule, including the
invariant that the real repository currently satisfies all of them. It is wired
into the same chain as `pnpm test:ci-gate-integrity`, so the regression tests
actually execute in CI rather than existing as a command someone has to remember
to run.

**Pre-existing gap, not fixed here.** Three other script-level test suites never
run in CI either, because `vitest.config.ts` does not include
`scripts/**/*.test.mjs` and no workflow invokes `node --test`:

| Suite                                                 | Tests | Status when run manually |
| ----------------------------------------------------- | ----- | ------------------------ |
| `scripts/check-package-artifact-smoke.test.mjs`       | 14    | pass                     |
| `scripts/check-workspace-package-invariants.test.mjs` | 9     | pass                     |
| `scripts/run-bounded-command.test.mjs`                | 3     | pass                     |

All 35 tests across the four suites pass on this working tree. Wiring the other
three in would be a one-line addition to the same chain, but they belong to other
workstreams and making them blocking is a decision for their owners, so it was
left as a recommendation.

## Files changed

- `package.json`: removed `|| true` from `build:plugin-sdk:dts`; added
  `check:ci-gate-integrity` and `test:ci-gate-integrity`, and wired both into
  `check`.
- `scripts/check-ci-gate-integrity.mjs`: new gate-integrity checker.
- `scripts/check-ci-gate-integrity.test.mjs`: new focused tests.
- `scripts/test-planner/planner.mjs`: removed the informational job from
  `requiredCheckNames`.
- `.github/workflows/ci.yml`: renamed the dead-code job and step, replaced
  `|| true` with `continue-on-error`.
- `docs/audits/phase1-ci-integrity.md`: this document.

## Can CI honestly claim required checks are green?

No, not yet. Two statements are true and two are not:

- True: `build:plugin-sdk:dts` is now honest and green.
- True: the dead-code job can no longer be mistaken for a required green check.
- **Not true: `typecheck` is honest and green.** It is green only with an 8 GB
  `NODE_OPTIONS` heap; at the default heap it aborts with exit 134 (out of
  memory), and nothing in `.github/` supplies that heap.
- **Not true: `format:check` and `test:unit` pass.** Both are still masked
  because both genuinely fail. Required checks cannot be described as green
  while two of them swallow their exit code.

And the strongest statement is false too: **`pnpm check` does not pass.** It
exits 1 at `check:public-branding`, so the CI `check` job is red independently of
everything in this document. Measured step by step, it contains five distinct
problems: three honest failures, one masked gate, and one gate that never runs.

The blockers, in priority order:

1. `check:public-branding` fails, so `pnpm check` dies at step 2 and no later gate
   is even evaluated. Two candidate causes, both needing the owning workstream: a
   multi-line regex in the branding checker, and a prose `OpenClaw` mention in
   `README.md`.
2. `typecheck` aborts with exit 134 at the default heap. Needs a heap setting in
   the CI environment (or a smaller program) before it can be called green.
3. `check:bundled-plugin-metadata` fails: the committed baseline is `[] as const`
   while the generator now finds 84 entries. Needs regeneration.
4. Stale `src/config/schema.base.generated.ts` (blocks `test:unit`; needs
   regeneration, out of scope here).
5. The unit suite **hangs** and never reaches a summary line (blocks
   `test:unit`; three runs, reproducible stall point, unaffected by
   `--testTimeout`). Needs the owning workstream.
6. 136 unit-test failures, dominated by incomplete `openclaw` -> `agdi` rename
   drift in assertions (blocks `test:unit`; lower bound, per-file inventory
   incomplete).
7. Missing `.gitattributes` plus an unapproved formatting backlog of 219-284
   files (blocks `format:check`).
8. Uncommitted `.oxfmtrc.jsonc` (blocks `format:check` being deterministic).
9. `check:base-config-schema` silent no-op (a false green inside `pnpm check`).

## Stale documentation to correct

`docs/audits/phase1-release-candidate-checklist.md` is now out of date in two
rows and is outside this task's file boundaries, so it was not edited:

- It reports `typecheck` as still ending with `|| true`. It does not; the
  working tree already had `tsc --noEmit` un-suppressed.
- It reports the format failure as "8866 files differ from Oxfmt" without
  distinguishing the CRLF artifact from the genuine 219-284 file backlog.
- Its Build row says `build:plugin-sdk:dts` still ends with `|| true`; that
  suppression was removed by this task.

`docs/audits/phase1-baseline-2026-09-21.md` line 120 also describes
`check-additional` running `pnpm deadcode:knip || true`; that job is now
`deadcode-informational` and uses `continue-on-error`.
