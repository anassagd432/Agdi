# Phase 1 — TypeScript triage

Status: **complete**. Direct TypeScript checking exits `0`, and the public `typecheck`
script is honest again.

## Before / after

| Metric | Value |
| --- | --- |
| Errors at session start | **45** |
| Errors at session end | **0** |
| Distinct errors fixed (incl. 4 latent) | **49** |
| `node .../tsc.js --noEmit` exit code | **2 → 0** |
| `tsc --noEmit` (public script) exit code | **0** |

The 4 latent errors are explained in "Category 8" below: TypeScript suppresses
declaration-emit diagnostics while the program still has semantic errors, so they only
became visible once the other 45 were fixed.

## Commands

Bounded check (8 GB heap is required on Windows):

```
NODE_OPTIONS=--max-old-space-size=8192 \
  node scripts/run-bounded-command.mjs --timeout-ms 180000 -- \
  node node_modules/typescript/lib/tsc.js --noEmit --pretty false \
  > dist/typecheck-diagnostics.txt 2>&1
```

Two operational notes:

- The documented `cmd /c "set NODE_OPTIONS=... && node ..."` form is rejected by the
  sandboxed shell, so `NODE_OPTIONS` is exported inline instead. Equivalent result.
- `tsc` output was UTF-8 in this environment, but the workflow assumes it may be
  UTF-16; `scripts/triage-typecheck-errors.mjs` decodes UTF-16 LE/BE (BOM or NUL
  heuristic) before parsing, then groups errors by code, area, and file.

Triage helper:

```
node scripts/triage-typecheck-errors.mjs [--full]
```

## Categories fixed

### 1. Cancel / unique-symbol leaks — 13 errors

Files: `src/commands/models/scan.ts` (3), `src/commands/models/auth.ts` (3),
`src/secrets/configure.ts` (7).

Root cause: `@clack/prompts`' `isCancel` is declared
`(value: unknown): value is typeof CANCEL_SYMBOL`, where `CANCEL_SYMBOL` is a
**unique symbol**. The local guards were declared as `(value: T | symbol): T`. Because
the unique symbol is assignable to the broad `symbol` type, type inference absorbed the
sentinel into `T` at every call site, and the `symbol` constituent could never be
narrowed away. Callers therefore saw `string | typeof CANCEL_SYMBOL` (and
`"json" | "singleValue" | unique symbol`, etc.) instead of `string`.

Fix: declare the parameter with the precise sentinel type
(`value: T | typeof CANCEL_SYMBOL`, via `import { type CANCEL_SYMBOL }`) and keep the
`isCancel` check. Narrowing then yields `T` exactly, so no assertion is needed. Two
redundant `as T` / `as Exclude<T, symbol>` casts were removed as a result.

### 2. Feishu onboarding credential typing — 3 errors

File: `extensions/feishu/src/onboarding.ts`.

Root cause: raw `FeishuConfig` was passed to `probeFeishu`, which takes
`FeishuClientCredentials` (resolved `appSecret: string`). `FeishuConfig.appSecret` is a
`SecretInput` (string or secret-ref object), so the raw config is genuinely not valid
input. A second site called `.trim()` on that `SecretInput`, which would throw at
runtime for secret-ref configs.

Fix: resolve credentials once (`resolveFeishuCredentials`) and pass the resolved value to
`probeFeishu`; derive `hasConfigCreds` from the resolved value instead of calling
`.trim()` on `SecretInput`. `resolveFeishuCredentials` reads config only (no implicit
env fallback), so the env-based branch is unchanged.

### 3. MS Teams onboarding `SecretInput.trim()` — 1 error

File: `extensions/msteams/src/onboarding.ts`.

Root cause: same `SecretInput` misuse as Feishu — `hasConfigCreds` called `.trim()` on
`appId` / `appPassword` / `tenantId`.

Fix: reuse the existing canonical helper `hasConfiguredMSTeamsCredentials` from
`./token.js` instead of the hand-rolled check. `resolveMSTeamsCredentials` was **not**
used here because it also falls back to `process.env`, which would have broken the
env-detection branch.

### 4. Gateway Jarvis request context — 4 errors

Files: `src/gateway/server-methods/jarvis.ts`, `src/gateway/server-methods/types.ts`.

Root cause: `jarvisHandlers` is registered and calls `context.getJarvis?.()`, but
`getJarvis` was never declared on `GatewayRequestContext`. No Jarvis service
implementation exists in the repo (only the config schema), and the handlers already
treat a missing service as "not initialized".

Fix: declare a structural `JarvisService` type (`getStatus`, `isRunning`, `start`,
`stop`, `getConfig`, `setConfig`) and add the optional
`getJarvis?: () => JarvisService | undefined` accessor to `GatewayRequestContext`. No
runtime behaviour changes: the property remains optional and unwired.

### 5. Telegram `allowed_updates` typing — 1 error

Files: `extensions/telegram/src/allowed-updates.ts`.

Root cause: a **dependency version skew**, not a code bug. The extension resolves
`grammy@1.46.0` locally (which bundles `@grammyjs/types@5.0.0`), while
`@grammyjs/runner@2.0.3` resolves `grammy/types` through root `grammy@1.40.0`
(`@grammyjs/types@3.28.0`). grammy 1.46's `ALL_UPDATE_TYPES` constant names update types
(`subscription`, `stopped_message_generation`) that the older `Update` shape behind the
runner does not model, so `ReadonlyArray<TelegramUpdateType>` was not assignable to the
runner's `allowed_updates`.

Fix: derive the accepted type from the runner's own public API
(`TelegramAllowedUpdate = NonNullable<FetchOptions["allowed_updates"]>[number]`), which
keeps the two in sync automatically, and narrow once at the return with a comment
explaining the skew. The runtime list is unchanged — those values are valid Bot API
update types, and `allowed-updates.test.ts` asserts they are present. No dependency
versions were changed.

### 6. Voice-call provider / test type mismatch — 8 errors

File: `extensions/voice-call/src/manager.test.ts`.

Root cause: the local `FakeProvider` was a stale duplicate of the shared harness fake and
never implemented `getCallStatus`, which `VoiceCallProvider` requires.

Fix: implement `getCallStatus`, mirroring the canonical `FakeProvider` in
`manager.test-harness.ts`. Behaviour of the existing tests is unchanged.

### 7. Channel test nullability — 16 errors

| File | Errors | Root cause / fix |
| --- | --- | --- |
| `extensions/googlechat/src/resolve-target.test.ts` | 6 | Discriminated union accessed without narrowing. Added `if (!result.ok) throw result.error;` / `if (result.ok) throw ...` guards, matching the sibling `extensions/whatsapp/src/resolve-target.test.ts` pattern. |
| `extensions/line/src/channel.startup.test.ts` | 6 | `linePlugin.gateway` and `gateway.startAccount` are both optional. Hoisted a single guarded `startAccount` const instead of using `!` assertions. |
| `extensions/irc/src/onboarding.test.ts` | 2 | `vi.fn(async () => "allowlist")` is not assignable to the generic `WizardPrompter["select"]`. Used the repo's established `as WizardPrompter["select"]` mock idiom. |
| `extensions/nextcloud-talk/src/monitor.read-body.test.ts` | 1 | The mock's `destroy` did not satisfy `IncomingMessage["destroy"]` (intersection of two call signatures). Gave it the compatible `(_error?: Error) => ...` shape returning the request. |
| `extensions/msteams/src/onboarding.ts` | 1 | Counted in category 3. |

### 8. Declaration-emit latent errors (revealed last) — 4 errors

Files: `src/commands/configure.shared.ts` (3), `src/terminal/prompt-select-styled.ts` (1).

Root cause: these exported prompt wrappers returned a type inferred from `@clack/prompts`
that mentions `typeof CANCEL_SYMBOL`. With `declaration: true`, TypeScript reports
`TS2527: The inferred type of 'X' references an inaccessible 'unique symbol' type. A type
annotation is necessary.` These errors were **invisible at the start of the session**:
TypeScript suppresses declaration diagnostics whenever the program still contains
semantic errors (verified experimentally — adding one unrelated type error to a probe
program makes its `TS2527` errors disappear entirely). They surfaced only once the other
45 errors were fixed.

Fix: annotate the return types as `ReturnType<typeof clackText>` /
`ReturnType<typeof clackConfirm>` / `ReturnType<typeof clackSelect<T>>`. This is
type-only (no emitted JavaScript changes), avoids hardcoding `string`/`boolean`, and does
not need to name the sentinel symbol. No behaviour change.

## Remaining categories

**None.** Direct TypeScript checking reports 0 errors.

The public `typecheck` script was changed from `tsc --noEmit || true` to `tsc --noEmit`
only after the direct command exited 0, and now exits 0 itself.

## Verification

| Check | Result |
| --- | --- |
| Bounded `tsc --noEmit` | exit `0`, 0 errors |
| `npx tsc --noEmit` (public script body) | exit `0` |
| `oxfmt --write` on changed files | clean, 15 files |
| `git diff --check` | exit `0` |
| `oxlint --type-aware` on changed files | 0 errors, 0 warnings |

Repo-wide gates (regression proof):

| Gate | Result |
| --- | --- |
| `node scripts/check-workspace-package-invariants.mjs` | `88 packages`, exit `0` |
| `npx tsc --noEmit` | exit `0` |
| `npx oxlint --type-aware` (repo-wide) | **0 errors**, 603 pre-existing warnings |
| `npx oxfmt --check` (repo-wide) | pre-existing failure: 8851/8980 files unformatted (the `.oxfmtrc.jsonc` config is newly added and the tree has not been formatted yet). All files touched here pass `oxfmt --check`. |

Focused tests run (all changed areas):

| Test file | Result |
| --- | --- |
| `src/secrets/configure.test.ts` | pass |
| `src/secrets/configure-plan.test.ts` | pass |
| `src/terminal/prompt-select-styled.test.ts` | pass |
| `src/commands/configure.wizard.test.ts` | 2 pre-existing failures (see below) |
| `src/commands/models/auth.test.ts` | 1 pre-existing failure (see below) |
| `src/commands/reset.test.ts` | 1 pre-existing failure (see below) |
| `src/commands/uninstall.test.ts` | 1 pre-existing failure (see below) |
| `extensions/feishu/src/accounts.test.ts` | pass |
| `extensions/feishu/src/setup-surface.test.ts` | pass |
| `extensions/msteams/src/setup-surface.test.ts` | pass |
| `extensions/telegram/src/allowed-updates.test.ts` | pass |
| `extensions/line/src/channel.startup.test.ts` | pass |
| `extensions/googlechat/src/resolve-target.test.ts` | pass |
| `extensions/irc/src/onboarding.test.ts` | pass |
| `extensions/nextcloud-talk/src/monitor.read-body.test.ts` | pass |
| `extensions/voice-call/src/manager.restore.test.ts` | pass |
| `extensions/voice-call/src/manager.test.ts` | pass, 7 tests (was 2 failing — see below) |

### Pre-existing failures (not caused by this work)

These were confirmed to be unrelated to the changes above:

1. **`openclaw` → `agdi` branding drift.** `src/commands/models/auth.test.ts`,
   `src/commands/reset.test.ts`, `src/commands/uninstall.test.ts` hardcode `openclaw ...`
   in CLI output. `package.json` `name` is `agdi`, and `formatCliCommand` resolves the
   prefix through `resolveCliName()`, so the source emits `agdi ...`. `openclaw` is still
   published as a compatibility `bin` alias. Aligning these expectations is a branding
   decision with its own repo check (`check:public-branding`), so it was left alone.
2. **Stale prompt copy.** `src/commands/configure.wizard.test.ts` expects
   `"Firecrawl API key (paste it here; leave blank to use FIRECRAWL_API_KEY)"` while the
   source emits `"Firecrawl API key"` plus a `placeholder`.

### Fixed while verifying (pre-existing, outside the strict error count)

3. **Voice-call test race — fixed.** `extensions/voice-call/src/manager.test.ts` called the
   async `manager.initialize(...)` without `await` at 7 sites (also flagged by oxlint's
   `no-floating-promises`). Two tests failed as a result: `initiateCall` ran before the
   provider was registered. Verified pre-existing by running the unmodified `HEAD` file.
   All 7 call sites now `await` (matching `createManagerHarness`), the callbacks that
   needed it are `async`, and all 7 tests pass with 0 lint warnings on the file.

## Files changed

Source / tests:

- `extensions/feishu/src/onboarding.ts`
- `extensions/googlechat/src/resolve-target.test.ts`
- `extensions/irc/src/onboarding.test.ts`
- `extensions/line/src/channel.startup.test.ts`
- `extensions/msteams/src/onboarding.ts`
- `extensions/nextcloud-talk/src/monitor.read-body.test.ts`
- `extensions/telegram/src/allowed-updates.ts`
- `extensions/voice-call/src/manager.test.ts`
- `src/commands/configure.shared.ts`
- `src/commands/models/auth.ts`
- `src/commands/models/scan.ts`
- `src/gateway/server-methods/types.ts`
- `src/secrets/configure.ts`
- `src/terminal/prompt-select-styled.ts`

Tooling:

- `package.json` — `typecheck` no longer swallows failures (`|| true` removed)
- `scripts/triage-typecheck-errors.mjs` — new UTF-16-aware error grouping helper

Pre-existing uncommitted work from the prior agent was preserved untouched:
`src/plugin-sdk/setup.ts`, `src/founder-ops/control-plane.ts`,
`src/wizard/clack-prompter.ts`, `src/commands/onboard-helpers.ts`,
`extensions/zalouser/src/types.ts`.

## Follow-up (not done here, out of scope)

- The `openclaw` / `agdi` branding drift and the stale Firecrawl prompt copy should be
  reconciled with the tests.
- The cancel-guard idiom now exists in three shapes across the repo
  (`T | typeof CANCEL_SYMBOL` here; `Exclude<T, symbol>` + cast in
  `src/wizard/clack-prompter.ts` and `src/commands/onboard-helpers.ts`). Consider
  consolidating on the assertion-free form.
