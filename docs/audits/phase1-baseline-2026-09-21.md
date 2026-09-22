---
summary: "Pre-remediation evidence snapshot for AGDI Phase 1 provenance work"
read_when:
  - You need the commands and observations behind the provenance record
title: "Phase 1 baseline 2026-09-21"
---

# Phase 1 baseline 2026-09-21

This file records the repository condition observed before provenance notices
were added. GitHub statistics and npm download totals are observations at the
timestamps below. They are not permanent facts.

No secret-scan baseline was created or approved.

The provenance conclusions are in [Provenance](/reference/provenance).
Recipient notices are in the repository-root file `THIRD_PARTY_NOTICES.md`.

## 1. Commit and branch

Observed with `git rev-parse HEAD`, `git rev-parse --abbrev-ref HEAD`, and
`git status -sb` at 2026-09-21T21:55:07+02:00.

| Item                          | Observation                                                                                                               |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Commit                        | `c289b658b06ecf10861ff39f7af8df14c5427cc8`                                                                                |
| Branch                        | `main`                                                                                                                    |
| Tracking                      | `main...origin/main`                                                                                                      |
| Commit count                  | 34 (`git rev-list --count HEAD`)                                                                                          |
| First commit                  | `42105a2f6af1e40adda6c9e2482aec74e2a2d055` at 2026-03-27T06:51:32+01:00, message `feat: update core engine to v2026.3.24` |
| Working tree before this pass | untracked `plans/` only                                                                                                   |

## 2. Toolchain

Commands at 2026-09-21T21:55:07+02:00 unless noted.

| Tool        | Command                                         | Result                            | Exit                                                          |
| ----------- | ----------------------------------------------- | --------------------------------- | ------------------------------------------------------------- |
| OS          | `[System.Environment]::OSVersion.VersionString` | Microsoft Windows NT 10.0.26200.0 | n/a                                                           |
| Node        | `node --version`                                | v24.5.0                           | 0                                                             |
| npm         | `npm --version`                                 | 11.19.0                           | 0                                                             |
| pnpm        | `pnpm --version`                                | command not recognized            | not an executable exit; PowerShell `CommandNotFoundException` |
| pnpm lookup | `where.exe pnpm`                                | no match                          | non-zero from `where.exe`                                     |
| Git         | `git --version`                                 | git version 2.55.0.windows.2      | 0                                                             |
| GitHub CLI  | `gh --version`                                  | gh version 2.96.0 (2026-07-02)    | 0                                                             |

`package.json` `packageManager` is `pnpm@10.32.1`. `engines.node` is
`>=22.14.0`. The pnpm binary was not on PATH, so the declared version was
not executed.

## 3. Origin and default branch

| Item                  | Command                                                      | Observation                                                  |
| --------------------- | ------------------------------------------------------------ | ------------------------------------------------------------ |
| Origin                | `git remote -v`                                              | `https://github.com/anassagd432/Agdi.git` for fetch and push |
| origin/HEAD           | `git symbolic-ref refs/remotes/origin/HEAD`                  | `refs/remotes/origin/main`                                   |
| GitHub default branch | `gh api repos/anassagd432/Agdi` at 2026-09-21T22:03:43+02:00 | `main`                                                       |
| Fork flag             | same API call                                                | `fork: false`                                                |

## 4. Package identity and workspaces

`node` read of `package.json` and `pnpm-workspace.yaml`, plus a directory
walk, in the same session.

| Item            | Observation                                                      |
| --------------- | ---------------------------------------------------------------- |
| Package name    | `agdi`                                                           |
| Package version | `2026.5.9`                                                       |
| License field   | `MIT`                                                            |
| Workspace globs | `.`, `ui`, `packages/*`, `extensions/*`                          |
| Workspace count | 83 directories that match those globs and contain `package.json` |

The 83 workspaces are the repository root (`agdi@2026.5.9`), `ui`
(`agdi-control-ui`), `packages/clawdbot` (`clawdbot@2026.2.12`),
`packages/moltbot` (`moltbot@2026.2.12`), and 79 extension directories whose
`package.json` name is `openclaw` at version `2026.3.24`.

## 5. Lockfile

| Check          | Command                              | Observation                   |
| -------------- | ------------------------------------ | ----------------------------- |
| File exists    | `Test-Path pnpm-lock.yaml`           | True                          |
| Ignore rule    | `git check-ignore -v pnpm-lock.yaml` | `.gitignore:8:pnpm-lock.yaml` |
| `node_modules` | `Test-Path node_modules`             | True                          |

## 6. Extension directories

Walk of `extensions/*` excluding `node_modules`.

| Count                         | Value                  | Criterion                                                                                                          |
| ----------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Total extension directories   | 86                     | immediate child directories                                                                                        |
| Missing `package.json`        | 7                      | `anthropic-vertex`, `device-pair`, `phone-control`, `qwen-portal-auth`, `shared`, `talk-voice`, `thread-ownership` |
| Manifests named `openclaw`    | 79                     | `package.json` `"name": "openclaw"`                                                                                |
| `openclaw.plugin.json` files  | 81                     | filename match under those directories, depth at most 3                                                            |
| Plugin id exactly `openclaw`  | 0                      | parsed `id` or `name` in those plugin files                                                                        |
| Duplicate package names       | 1 name, 79 directories | the only extension package name is `openclaw`                                                                      |
| Probable root-manifest copies | 79                     | all 79 `package.json` files are byte-identical and carry root-CLI `bin`, `exports`, and `files`                    |

`git hash-object extensions/discord/package.json` is
`e5ca60933e24bf8f5ce40c60a58d2871301b0094`. That object is not the OpenClaw
`v2026.3.24` root package blob
`defdd853b4b5c908ee7b64ccc730bc00293285de` and not that tag's
`extensions/discord/package.json` blob
`3e0704d8e15dbf3fcb309f71fb5478d6d954a240`.

## 7. Failure suppression

Search of `package.json` scripts and `.github` workflow files for `|| true`,
`continue-on-error`, and `|| exit 0`.

No `continue-on-error` key was found. These scripts mask a failing exit:

| Script or step         | Mask                                                                       | Required path that inherits it                                                                             |
| ---------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `format:check`         | `oxfmt --check --threads=1 \|\| true`                                      | `check` calls it. CI job `checks-fast` can run `pnpm format:check`. CI job `check` runs `pnpm check`.      |
| `typecheck`            | `tsc --noEmit \|\| true`                                                   | `check` calls it. CI job `checks` defaults to `typecheck` and `test:unit`.                                 |
| `test:unit`            | `pnpm test \|\| true`                                                      | CI job `checks` and CI job `checks-windows` default to `test:unit`.                                        |
| `build:plugin-sdk:dts` | `tsc -p tsconfig.plugin-sdk.dts.json \|\| true`                            | `build` and `build:strict-smoke` call it. CI jobs `build-smoke` and `build-artifacts` run `pnpm build`.    |
| CI `check-additional`  | `pnpm deadcode:knip \|\| true`                                             | `.github/workflows/ci.yml` dead-code step. `deadcode:knip` itself has no mask; the workflow step adds one. |
| `deadcode:report`      | `;` between `deadcode:knip`, `deadcode:ts-prune`, and `deadcode:ts-unused` | Earlier commands can fail and the script still continues. This is not the CI step above.                   |
| `ios:run`              | `\|\| true` after `xcrun simctl boot` only                                 | Simulator boot only. Not a job in `ci.yml`.                                                                |

`checks-fast`, `checks`, and `checks-windows` also use `\|\| fromJSON(...)`
in GitHub Actions expressions. Those choose a default matrix when an output
is empty. They are not failure masks.

Shell scripts under `scripts/` contain additional `|| true` cleanup
fallbacks. They were not classified as the required-check masks above.

## 8. Non-destructive checks

### Frozen installation

Not run. `pnpm` is not installed on PATH, and a frozen install would be the
first dependency mutation attempted by this pass. The lockfile on disk was
left untouched.

### Direct typecheck

Dependencies were already present (`node_modules` and
`node_modules/.bin/tsc.cmd`). The package script was not used, because that
script appends `|| true`.

Command:

```text
node_modules\.bin\tsc.cmd --noEmit --pretty false
```

| Run           | Completed                 | Exit | Result                                 |
| ------------- | ------------------------- | ---- | -------------------------------------- |
| First         | 2026-09-21T22:05:40+02:00 | 2    | type errors, including missing modules |
| Counted rerun | 2026-09-21T22:09:48+02:00 | 2    | 137 lines matched `error TS`           |

### Production audit

Command: `npm audit --omit=dev --json`

Completed 2026-09-21T22:06:20+02:00. Exit 1. npm reported `ENOLOCK`: audit
requires an npm shrinkwrap or `package-lock.json`. `pnpm-lock.yaml` is
present and gitignored. `npm i --package-lock-only` was not run, because it
would create a lockfile. No vulnerability count was produced.

### Git status

`git status -sb` at 2026-09-21T21:55:07+02:00:

```text
## main...origin/main
?? plans/
```

## 9. Public GitHub statistics

Command: `gh api repos/anassagd432/Agdi`

Observed 2026-09-21T22:03:43+02:00. These counts are observations.

| Field             | Observation             |
| ----------------- | ----------------------- |
| visibility        | public                  |
| created_at        | 2026-02-20T06:07:20Z    |
| pushed_at         | 2026-09-20T12:04:44Z    |
| stargazers_count  | 0                       |
| forks_count       | 0                       |
| watchers_count    | 0                       |
| subscribers_count | 0                       |
| open_issues_count | 0                       |
| license metadata  | MIT                     |
| local git tags    | none (`git tag --list`) |

OpenClaw repository metadata, `gh api repos/openclaw/openclaw`, observed
2026-09-21T21:56:55+02:00: default branch `main`, license metadata
`NOASSERTION` / `Other`, `pushed_at` `2026-09-21T19:53:24Z`. The LICENSE file
text was still the MIT license; see [Provenance](/reference/provenance).

## 10. npm download window

Commands:

```text
npm view agdi version --json
npm view agdi time --json
npm view agdi versions --json
curl.exe -sS https://api.npmjs.org/downloads/point/last-week/agdi
curl.exe -sS https://api.npmjs.org/downloads/point/last-month/agdi
curl.exe -sS https://api.npmjs.org/downloads/point/2026-01-14:2026-09-21/agdi
```

Observed 2026-09-21T22:03:44+02:00 through 2026-09-21T22:04:45+02:00.
Download totals are observations.

| Measurement                                                | Window                        | Downloads or count             |
| ---------------------------------------------------------- | ----------------------------- | ------------------------------ |
| Registry version at observation                            | n/a                           | `2026.5.9`                     |
| Published version count                                    | registry `versions`           | 81, from `1.0.0` to `2026.5.9` |
| Last week                                                  | 2026-09-14 through 2026-09-20 | 59                             |
| Last month                                                 | 2026-08-22 through 2026-09-20 | 493                            |
| Range from first publish date through the observation date | 2026-01-14 through 2026-09-21 | 11795                          |

The registry `time.created` value is `2026-01-14T01:25:50.924Z`. This git
history starts on 2026-03-27. Download totals therefore include publishes
that this commit history does not contain. `time.modified` was
`2026-05-16T05:54:44.916Z`.

## 11. Upstream comparison commands

Tag resolution used `gh api repos/openclaw/openclaw/git/ref/tags/<tag>` and,
for annotated tags, `git/tags/<sha>`. Completed 2026-09-21T21:57:49+02:00.

The tree download was:

```text
gh api repos/openclaw/openclaw/git/trees/cff6dc94e30794a269eb7805b6e636c3634a088c?recursive=1
```

Completed 2026-09-21T21:58:22+02:00. Response: `truncated: false`, 10,868 tree
entries, 10,171 blobs.

Local trees used `git ls-tree -r <rev>` for the first commit, the two `up`
commits, and `HEAD`.

| AGDI revision                                     | Shared paths | Identical blobs | Identical share |
| ------------------------------------------------- | ------------ | --------------- | --------------- |
| `42105a2f6af1e40adda6c9e2482aec74e2a2d055`        | 9027         | 8763            | 97.08%          |
| `8eefba4843e821bb53b6c6c8e903cd89b4e43e64`        | 9028         | 8758            | 97.01%          |
| `c8064565f95602f96685944d8a57fe0cdea9f033`        | 9029         | 7996            | 88.56%          |
| `HEAD` `c289b658b06ecf10861ff39f7af8df14c5427cc8` | 9037         | 6386            | 70.67%          |

Import-time differing shared paths by top segment: `src` 128, `extensions`
115, `docs` 10, `test` 4, plus `AGENTS.md`, `CHANGELOG.md`, `package.json`,
`scripts` 1, and three vitest config files.

`LICENSE` and `README.md` were absent from the first commit.
`pnpm-workspace.yaml` matched the tag
(`e076fb0a4c42b3bb72e868ebf2d8acf71256028a`).

OpenClaw LICENSE at `v2026.3.24` was retrieved at 2026-09-21T21:59:54+02:00
(blob `f7b526698bb7ed2d26d96c49f2f32234c88f69bc`): MIT, Copyright (c) 2025
Peter Steinberger. OpenClaw LICENSE on `main` was retrieved at
2026-09-21T22:00:18+02:00 (blob `ebaebf7c416761a32f932ad70ebe5d1d2e214f68`):
MIT, Copyright (c) 2026 OpenClaw Foundation.

Paths checked against OpenClaw `main` at 2026-09-21T22:04:40+02:00, all HTTP
404: `src/goals/engine.ts`, `src/learning/engine.ts`, `src/mcp/client.ts`,
`src/founder-ops/agenda.ts`, `src/commands/scan.ts`, `src/cli/goals-cli.ts`,
`agdi.mjs`.

## 12. npm pack dry run

Command, completed 2026-09-21T22:14:04+02:00, exit 0:

```text
npm pack --dry-run --ignore-scripts --json
```

The dry run listed 841 files. npm warned that the project config key
`node-linker` is unknown to npm. That warning did not change the exit code.

| Path                                         | In the dry-run file list                    |
| -------------------------------------------- | ------------------------------------------- |
| `LICENSE`                                    | yes                                         |
| `README.md`                                  | yes                                         |
| `docs/reference/provenance.md`               | yes                                         |
| `docs/audits/phase1-baseline-2026-09-21.md`  | yes, because `docs/` is in `files`          |
| `skills/skill-creator/license.txt`           | yes, because `skills/` is in `files`        |
| `THIRD_PARTY_NOTICES.md`                     | no                                          |
| `extensions/open-prose/skills/prose/LICENSE` | no, because `extensions/` is not in `files` |

`package.json` was not modified. For the package and release agent, the
required `files` change is to add `THIRD_PARTY_NOTICES.md`. If published
`dist/` contains OpenProse bytes, that agent should also ship the OpenProse
MIT permission text, because the license file under `extensions/` is omitted
today. This dry run does not say whether `dist/` contains those bytes.

This result is about the npm package file list only. It is not a statement
about binary-distribution compliance.

## 13. Plugin manifest restoration

Observed 2026-09-21 after restoring the remaining extension manifests.
HEAD was still `c289b658b06ecf10861ff39f7af8df14c5427cc8`. No commit was made.

Before this pass the strict report had 240 findings: 61 duplicate package
names, 58 missing plugin metadata blocks, 58 package-name mismatches, 58
missing AGDI host-SDK declarations, and 5 plugin directories with
`openclaw.plugin.json` but no `package.json`.

After this pass:

```text
node --test scripts/check-workspace-package-invariants.test.mjs
```

Exit 0. 9 tests passed.

```text
node scripts/check-workspace-package-invariants.mjs --json
```

Exit 0. `violationCount` is 0.

`git diff --check` on the restored manifests exited 0, with CRLF warnings
only. `oxfmt --check` on the changed extension `package.json` files exited 0
after a default-format write. Oxfmt reported that the repository has no
Oxfmt config.

Method: OpenClaw tag `v2026.3.24` package manifests were the baseline when
that file existed. Local production imports that the baseline did not list
were added from versions already present in the root manifest. `agdi` was
declared only as `devDependencies.agdi = workspace:*` and optional
`peerDependencies.agdi = >=2026.3.22`. It was not added to `dependencies`.
`@buape/carbon`, when present, stayed aligned with the root range `^0.14.0`.

Families restored in this pass:

- Remaining channels: nextcloud-talk, nostr, signal, slack, synology-chat,
  telegram, tlon, twitch, voice-call, whatsapp, zalo, zalouser.
- Model providers: anthropic, openai, google, deepseek, groq, mistral,
  moonshot, minimax, openrouter, xai, ollama, together, huggingface, nvidia,
  amazon-bedrock, byteplus, chutes, cloudflare-ai-gateway, github-copilot,
  kilocode, kimi-coding, microsoft, microsoft-foundry, modelstudio, qianfan,
  sglang, synthetic, venice, vercel-ai-gateway, vllm, volcengine, xiaomi, zai,
  opencode, opencode-go.
- Search and media: brave, duckduckgo, exa, firecrawl, perplexity, tavily,
  deepgram, elevenlabs, fal.
- Auth, compatibility, and previously missing manifests: copilot-proxy,
  google-gemini-cli-auth, minimax-portal-auth, qwen-portal-auth, device-pair,
  phone-control, talk-voice, thread-ownership, helloworld, openshell.

`microsoft-foundry`, `google-gemini-cli-auth`, `minimax-portal-auth`,
`qwen-portal-auth`, `device-pair`, `phone-control`, `talk-voice`,
`thread-ownership`, and `helloworld` had no `package.json` at tag
`v2026.3.24`. Their manifests were synthesized from the local `index.ts`
entrypoint and local imports. `openclaw.plugin.json` was copied from the
existing `agdi.plugin.json` for helloworld, google-gemini-cli-auth, and
minimax-portal-auth so the loader filename matches `openclaw.plugin.json`.

Lockfile generation, honest CI repair, production audit remediation, and
release publication were not complete when the package-contract gate was
first verified. `pnpm` was not on PATH. The pinned package manager was then
invoked as `npm exec --yes --package pnpm@10.32.1 -- pnpm`.

## 14. Lockfile and production audit

`pnpm --version` reported `10.32.1`. Node remained v24.5.0.

```text
npm exec --yes --package pnpm@10.32.1 -- pnpm install --lockfile-only --ignore-scripts
```

Exit 0 in 1m 17s. The command warned about unmet peers for Vitest coverage,
oxlint, and `opusscript` under Discord voice. `pnpm-lock.yaml` was then
removed from `.gitignore`.

The first frozen install aborted with
`ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY`. A second attempt with `CI=true`
and `--ignore-scripts` exited 0 in 7m 8s and did not change the lockfile
(`git diff --exit-code -- pnpm-lock.yaml`, exit 0). That run skipped
dependency build scripts. A second consecutive install and a script-enabled
frozen install were not run.

```text
npm exec --yes --package pnpm@10.32.1 -- pnpm audit --prod --json
```

Exit 1. The report counted 2 critical, 21 high, 47 moderate, and 6 low
findings across 71 advisories. Critical modules were
`@whiskeysockets/baileys` (`GHSA-qvv5-jq5g-4cgg`, patched `>=7.0.0-rc12`) and
`tar` (`GHSA-23hp-3jrh-7fpw`, patched `>=7.5.19`). No advisory was suppressed
or patched in this pass. Overrides were not changed.

## 15. Reproducibility and honest checks

Recorded 2026-09-22. `npm exec --yes --package pnpm@10.32.1 -- pnpm --version`
exited 0 in 2146ms and printed `10.32.1`.

A second `CI=true` frozen install with `--ignore-scripts` printed
`Lockfile is up to date` and `Done in 3.5s`, then kept downloading optional
platform tarballs (sharp, esbuild, oxlint, rolldown, node-llama-cpp) at about
30 KiB/s. It had not exited when this section was written, so lockfile
identity for that run was not yet confirmed. The first no-TTY failure and the
earlier successful `CI=true` ignore-scripts install remain the completed
evidence. Script-enabled install was not started. Ubuntu was not available.

Direct `oxfmt --check --threads=1` without a config exited 1 in 20506ms:
8859 of 8979 files. After restoring `.oxfmtrc.jsonc` from OpenClaw tag
`v2026.3.24`, the same command exited 1 in 20360ms: 8866 files. `format:check`
still ends in `|| true` because the direct command does not pass.

`scripts/run-bounded-command.mjs` runs one child and, on budget expiry, stops
only that child and exits 124. `node --test scripts/run-bounded-command.test.mjs`
exited 0 (3 passed). The public `typecheck` script was not changed. An earlier
direct `tsc --noEmit` exited 2 with 137 diagnostics in about 64s across 7379
TypeScript files under `src/` and `extensions/`. That is slow, and it did
finish. It is not evidence of an infinite hang.

`npm pack --dry-run --ignore-scripts --json` exited 0 in 3122ms. The file list
includes `LICENSE` and `THIRD_PARTY_NOTICES.md`. No failure suppression was
removed in this pass.
