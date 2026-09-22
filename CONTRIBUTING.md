# Contributing to Agdi

Thanks for helping improve Agdi. This guide describes how the repository
actually behaves today, including the checks that are still being repaired. Keep
contributions focused, tested, and easy to review.

- **Repository:** [anassagd432/Agdi](https://github.com/anassagd432/Agdi)
- **Issues:** [Issue tracker](https://github.com/anassagd432/Agdi/issues)
- **Support routing:** [`SUPPORT.md`](SUPPORT.md)
- **Governance:** [`GOVERNANCE.md`](GOVERNANCE.md)
- **Security reports:** [`SECURITY.md`](SECURITY.md) - never a public issue
- **Vision:** [`VISION.md`](VISION.md)

Agdi is maintained by a small team, currently one maintainer. Review is
best-effort and no response time is promised.

## Prerequisites

- **Node.js >= 22.14.0** - this is `engines.node` in `package.json`.
- **pnpm 10.32.1** - this is `packageManager` in `package.json`. Use this exact
  version.
- **Git**
- Optional: **Bun**. Some repository scripts run through Bun, and `bun install`
  is supported alongside pnpm.

Confirm your toolchain before anything else:

```bash
node --version
pnpm --version
```

If `pnpm` is not on your `PATH`, either enable the pinned version with Corepack
or invoke it through npm:

```bash
corepack enable
corepack prepare pnpm@10.32.1 --activate

# Alternative when Corepack is unavailable:
npm exec --yes --package pnpm@10.32.1 -- pnpm --version
```

## Safe setup

1. Fork the repository on GitHub, then clone your fork.
2. Install dependencies from the repository root:

   ```bash
   pnpm install
   ```

   `pnpm-lock.yaml` exists in the working tree but is **not committed yet**, so a
   fresh clone resolves dependencies without a frozen dependency graph. Do not
   add `--frozen-lockfile` until the lockfile is committed.

   On Windows, pnpm can abort with `ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY`
   when it wants to recreate `node_modules` and stdin is not a terminal. Setting
   `CI=true` for that single command is the documented workaround.

3. Build once so the CLI can run from the compiled output:

   ```bash
   pnpm build
   ```

4. Run the CLI from source while developing:

   ```bash
   pnpm dev
   ```

5. Optional: pre-commit hooks. `AGENTS.md` mentions `prek install`, but this
   repository has no `prek` or pre-commit configuration checked in and
   `core.hooksPath` is unset. The only hook script present is
   `git-hooks/pre-commit`, and nothing wires it up by default. Until that
   changes, run the validation commands below yourself rather than relying on a
   hook.

Do not hand-install dependencies inside `extensions/*`; the workspace handles
resolution for you.

## Validation commands

The commands below are the ones that exist in `package.json` today. Some of them
still end in `|| true`, which means a failing check does not fail the command.
Know which is which before you trust a green result.

| Command               | What it covers                                              | Current status            |
| --------------------- | ----------------------------------------------------------- | ------------------------- |
| `pnpm lint`           | Oxlint with type-aware rules                                | Propagates failure        |
| `pnpm test`           | Vitest unit, extension, and gateway lanes                   | Propagates failure        |
| `pnpm test:coverage`  | Unit lane with V8 coverage                                  | Propagates failure        |
| `pnpm test:e2e`       | Gateway end-to-end smoke                                    | Propagates failure        |
| `pnpm test:contracts` | Plugin and channel contract suites                          | Propagates failure        |
| `pnpm check:docs`     | Docs format, docs lint, i18n glossary, docs links           | Propagates failure        |
| `pnpm build`          | Full build, including the Plugin SDK `.d.ts` step           | Partially suppressed      |
| `pnpm check`          | Aggregate gate that includes `format:check` and `typecheck` | Partially suppressed      |
| `pnpm typecheck`      | `tsc --noEmit`                                              | Suppressed (`\|\| true`)  |
| `pnpm format:check`   | `oxfmt --check`                                             | Suppressed (`\|\| true`)  |
| `pnpm test:unit`      | `pnpm test`                                                 | Suppressed (`\|\| true`)  |
| `pnpm test:live`      | Live provider and model smoke tests                         | Requires real credentials |

What this means in practice:

- **CI can be green while suppressed steps are failing.** The `CI` workflow runs
  `pnpm format:check`, `pnpm typecheck`, and `pnpm test:unit` in a matrix, and
  all three currently swallow failures at the script level. A passing workflow
  run is not proof that formatting, types, or unit tests are clean.
- **`pnpm check` is not a full green signal.** It calls `format:check` and
  `typecheck`, so those two parts of the aggregate can fail without failing the
  aggregate. Its other steps (`lint`, the Plugin SDK export check, and the
  repository boundary linters) do propagate failure.
- **Repository-wide formatting does not currently pass.** `oxfmt --check` reports
  thousands of differing files. This is known and unresolved. Do not treat it as
  something your change caused.
- **Do not claim all checks pass.** Describe exactly which commands you ran and
  what they returned.

Recommended command set for a normal change:

```bash
pnpm lint
pnpm test -- <path-or-filter>        # focused, see below
pnpm check:docs                      # only if you touched docs
pnpm build                           # only if you touched build output or SDK surfaces
```

## Focused tests

Tests are colocated with the code as `*.test.ts`; end-to-end tests use
`*.e2e.test.ts`.

- Prefer the wrapper, not raw Vitest, for targeted runs:

  ```bash
  pnpm test -- src/commands/onboard-search.test.ts -t "shows registered plugin providers"
  ```

  The wrapper applies the repository config, profile, and pool routing. Raw
  `pnpm vitest run ...` bypasses those.

- Tests changed since `origin/main`: `pnpm test:changed`
- Extension lane: `pnpm test:extension <extension-name>`; list ids with
  `pnpm test:extension --list`
- Contract suites (run when you change plugin or channel surfaces):
  `pnpm test:contracts:channels` and `pnpm test:contracts:plugins`

Expectations:

- Run the narrowest test that directly validates the behavior you changed, then
  say which tests you ran.
- If no meaningful scoped test exists, say so explicitly and use the next most
  direct validation available.
- Do not raise test workers above 16.
- `AGENTS.md` requires new test configuration to stay on the `forks` pool and
  forbids introducing another pool or execution mode without explicit approval.
  Be aware that `docs/help/testing.md` describes the wrapper lanes as running on
  `threads` with `isolate: false` today, so the repository rule and the
  documented defaults do not fully agree. Follow `AGENTS.md` for new work, and
  do not change existing pool settings as part of an unrelated change.
- Write tests that clean up timers, env vars, globals, mocks, sockets, temp
  directories, and module state so non-isolated runs stay green.
- Do not edit baseline, inventory, ignore, snapshot, or expected-failure files to
  silence a failing check.

## Formatting expectations

- Formatter: Oxfmt. Linter: Oxlint. Configuration lives in `.oxfmtrc.jsonc`.
- **Format only the files you changed.** A repository-wide `pnpm format` currently
  rewrites thousands of unrelated files and buries the real change:

  ```bash
  pnpm exec oxfmt --write <path> [<path> ...]
  ```

- Use American English in code, comments, docs, and UI strings ("color", not
  "colour").
- Avoid `@ts-nocheck`, and do not disable `no-explicit-any`. Fix the root cause.
- Keep files concise and prefer extracting helpers over adding "V2" copies.

## Documentation expectations

Documentation lives in `docs/` and is published with Mintlify.

- Internal links in `docs/**/*.md` are root-relative and omit the file
  extension. Link to `/configuration` or `/configuration#hooks`, never to
  `/configuration.md`.
- `docs/zh-CN/**` is generated. Do not edit it unless the task explicitly asks
  for targeted translation fixes.
- Translation pipeline: update English docs, update
  `docs/.i18n/glossary.zh-CN.json` for new fixed terms, run
  `pnpm docs:check-i18n-glossary`, and run the translator only when requested.
- Keep docs generic. No personal hostnames, device names, or absolute paths; use
  placeholders such as `user@gateway-host`.
- Avoid em dashes and apostrophes in headings; they break Mintlify anchors.
- After editing docs, run `pnpm docs:list` and `pnpm check:docs`.

## Control UI decorators

The Control UI uses Lit with legacy decorators. When adding reactive fields, keep
the existing style:

```ts
@state() foo = "bar";
@property({ type: Number }) count = 0;
```

The root `tsconfig.json` sets `experimentalDecorators: true` and
`useDefineForClassFields: false`. Do not change this unless you are also updating
the UI build tooling.

## Extension and plugin package contract

Agdi is a pnpm workspace. The workspace globs in `pnpm-workspace.yaml` are `.`,
`ui`, `packages/*`, and `extensions/*`.

At a high level, a bundled plugin is a workspace package that ships two files:

| File                                   | Responsibility                                                                                                                                                           |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `extensions/<id>/package.json`         | npm identity, dependency installation, and the `openclaw` block that declares entrypoints and setup or catalog metadata                                                  |
| `extensions/<id>/openclaw.plugin.json` | Discovery and config validation that Agdi reads **before** loading plugin code: plugin id, inline JSON Schema, channel and provider ids, auth env metadata, and UI hints |

The manifest filename is still `openclaw.plugin.json` for compatibility during
the Agdi transition, and `openclaw.*` keys remain in use. Keep the canonical
plugin id aligned across the manifest `id`, the `extensions/<id>` directory name,
and the package name, and keep `openclaw.install.npmSpec` equal to the package
name and `openclaw.channel.id` equal to the plugin id.

Import rules for extension code:

- Treat `plugin-sdk/*` subpaths plus the local `api.ts` / `runtime-api.ts`
  barrels as the public surface.
- Do not import core `src/**`, `src/plugin-sdk-internal/**`, or another
  extension's `src/**`.
- Do not use relative imports that resolve outside the extension's own package
  root.
- Runtime dependencies belong in `dependencies`. Avoid `workspace:*` in
  `dependencies`, because the plugin install path runs `npm install --omit=dev`
  and breaks on workspace ranges; declare the host package in `devDependencies`
  or `peerDependencies` instead.
- If a plugin depends on native modules, document the build steps and any
  package-manager build-script allowlist requirement.

Check your package metadata before opening a PR:

```bash
node scripts/check-workspace-package-invariants.mjs
```

Deeper references: `docs/plugins/manifest.md`,
`docs/plugins/building-plugins.md`, and `docs/plugins/sdk-overview.md`.

Note: `AGENTS.md` and the plugin docs currently use different prefixes for the
same SDK surface (`openclaw/plugin-sdk/*` versus `agdi/plugin-sdk/*`). Treat
`AGENTS.md` as canonical for repository work and expect the naming to converge.

## Never commit secrets

Do not commit credentials, tokens, API keys, phone numbers, session logs, or
private configuration. In particular, keep these out of commits, issues, pull
requests, and pasted logs:

- `~/.agdi/credentials/` and `~/.agdi/agdi.json`
- Session transcripts and agent session logs
- Real `.env` files and exported shell profiles
- Live channel credentials for any messaging provider

Use obviously fake placeholders in docs, tests, and examples. See
[`SECURITY.md`](SECURITY.md) for the operator trust model and local state scope.

## Reporting a reproducible bug

1. Search the existing issues first.
2. Open a bug report using the repository's bug report template.
3. Include enough detail that someone else can reproduce it:
   - Agdi version (`agdi --version`) or the exact commit SHA you built from
   - Environment: operating system, Node version, pnpm version, and how you
     installed Agdi
   - Affected surface: CLI, gateway, a specific channel or provider plugin, or
     the workspace UI
   - Exact steps to reproduce, with the smallest command sequence that shows the
     problem
   - Expected behavior and actual behavior
   - Logs and error output **with secrets removed**
4. For provider or network-specific problems, include the provider id, the model
   id, and a timestamp. Never include the API key.

Reports without reproduction steps are hard to act on and may be closed with a
request for more detail.

## Review expectations

- One concern per pull request. Explain what changed and why.
- Do not open broad cleanup or refactor-only pull requests unless a maintainer
  asked for them as part of a concrete fix.
- Do not open test-only or CI-only pull requests unless they validate a new fix or
  cover new behavior.
- Address every relevant review comment and resolve conversations only after the
  concern is actually addressed.
- If you used an AI coding agent, say so in the pull request and state the level
  of testing you performed.
- Do not commit or push with failing format, lint, type, build, or required test
  checks when those failures come from your change or plausibly relate to the
  surface you touched.
- This repository does not currently ship a `CODEOWNERS` file. If one is added
  later, do not modify paths it protects without the listed owner's involvement.

## Where to get help

- Questions and usage help: see [`SUPPORT.md`](SUPPORT.md).
- Security issues: see [`SECURITY.md`](SECURITY.md).
- Conduct concerns: see [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md).
- How decisions get made: see [`GOVERNANCE.md`](GOVERNANCE.md).
