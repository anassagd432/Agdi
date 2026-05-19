# Claude Code Context for Agdi

Use this file as the first low-token project context before doing deeper analysis.

## Project Identity

- Product name: Agdi.
- CLI/package/config command spelling: `agdi`.
- User-facing app name: Agdi.
- This repository appears to keep the OpenClaw architecture and documentation lineage while rebranding runtime, CLI, config, and docs surfaces to Agdi.
- Treat remaining `OpenClaw` references as either upstream heritage, intentional compatibility, or incomplete rebrand work. Verify before changing broad surfaces.

## Core Product Model

Agdi is a self-hosted personal AI assistant and gateway. It connects chat channels, browser control, local/remote nodes, apps, and model providers through a Gateway control plane. The main user value is an always-available assistant that can receive messages from many channels and execute real work on the user's own machines.

High-level architecture:

- Gateway: WebSocket control plane for channels, nodes, sessions, hooks, config, browser, and app integrations.
- CLI: `agdi ...` commands for setup, gateway, status, channels, browser, provider config, diagnostics, and operations.
- Config: `~/.agdi/agdi.json` using JSON5 style examples in docs.
- Workspace: `~/.agdi/workspace` for user tailoring and agent context.
- Channels: built-in and plugin-backed messaging surfaces.
- Plugins: repo-owned workspace plugins live under `extensions/*`.
- Browser: Agdi-managed isolated Chromium profile named `agdi`, plus optional `user` profile attaching to the user's signed-in Chromium session via Chrome DevTools MCP.
- Apps/nodes: optional macOS, iOS, Android, and remote node hosts extend the Gateway.

## Important Repo Map

Expected source layout from repo guidelines:

- `src/cli`: CLI wiring.
- `src/commands`: command implementations.
- `src/provider-web.ts`: web provider.
- `src/infra`: infrastructure helpers.
- `src/media`: media pipeline.
- `src/telegram`, `src/discord`, `src/slack`, `src/signal`, `src/imessage`, `src/web`, `src/channels`, `src/routing`: built-in channel and routing surfaces.
- `extensions/*`: bundled plugins/workspace extension packages.
- `docs/`: Mintlify docs.
- `dist/`: built output.
- colocated `*.test.ts`: unit/integration tests.

## Commands

Use the repo-defined package manager and checks:

- Install: `pnpm install`.
- Dev CLI: `pnpm openclaw ...` may still exist in inherited scripts; prefer `pnpm agdi ...` only after confirming scripts.
- Dev gateway: `pnpm gateway:watch`.
- Build: `pnpm build`.
- TypeScript checks: `pnpm tsgo`.
- Lint/format: `pnpm check`.
- Format check: `pnpm format`.
- Format fix: `pnpm format:fix`.
- Tests: `pnpm test`.
- Scoped tests: `pnpm test -- <path-or-filter> [vitest args...]`.

Node baseline is Node 22+. Prefer Bun for direct TypeScript script execution when the repo already supports it, but preserve Node production paths.

## Coding Guardrails

- TypeScript ESM.
- Avoid `any`; never add `@ts-nocheck`.
- Use existing dependency injection patterns such as `createDefaultDeps`.
- Keep runtime dependencies for plugins in the plugin package under `extensions/<id>/package.json`.
- Extension production code should import `agdi/plugin-sdk/*` or local extension barrels once the public surface is rebranded; inherited `openclaw/plugin-sdk/*` may remain for compatibility until verified.
- Do not import from core `src/**` inside extension production code.
- Do not use prototype mutation for shared class behavior.
- Do not patch dependencies or update Carbon without explicit approval.
- Do not edit security-owned paths from `CODEOWNERS` unless an owner asked or is already reviewing.

## Testing Guardrails

- Vitest is the test framework.
- Use the wrapper: `pnpm test -- ...`; do not bypass with raw `pnpm vitest run`.
- Keep Vitest on `forks` only.
- Do not modify snapshots, baselines, inventories, ignores, or expected-failure files just to silence checks unless explicitly approved.
- If build output, packaging, lazy loading, module boundaries, or public surfaces are touched, run `pnpm build`.

## Docs Guardrails

- Docs are Mintlify under `docs/`.
- Internal docs links in `docs/**/*.md` must be root-relative and omit `.md` or `.mdx`.
- README links should use absolute `https://docs.openclaw.ai/...` or the current Agdi docs domain after the canonical domain is confirmed.
- `docs/zh-CN/**` is generated. Do not edit unless explicitly asked.
- Docs content should be generic; avoid personal names, hostnames, local paths, real phone numbers, videos, or live config values.
- For docs, UI copy, and picker lists, order services/providers alphabetically unless the section describes runtime behavior.

## Branding Rules

- Use `Agdi` for the product/app/docs headings.
- Use `agdi` for CLI commands, package/binary names, paths, config keys, profile names, and code identifiers.
- Legacy `OpenClaw` references may be intentional in upstream URLs, compatibility surfaces, and historical docs. Do not mass-replace without a targeted audit.
- Avoid animal/mascot language from OpenClaw unless the rebrand intentionally keeps it.
- Prefer neutral agent/product language: assistant, Gateway, channel, node, plugin, workspace, browser profile, provider.
- Use "plugin" in docs, UI, changelogs, and contributor guidance. Keep `extensions/*` as the internal directory/package path unless the repo explicitly renames it.

## Branding Hotspots To Check Before Any Rebrand Work

- `package.json` scripts, package name, binary names, repository metadata.
- CLI help strings and command examples in `src/cli` and `src/commands`.
- Config defaults and migration paths for `~/.agdi/agdi.json` versus `~/.openclaw/openclaw.json`.
- Environment variables such as `OPENCLAW_*`; decide compatibility versus new `AGDI_*` equivalents.
- Docs frontmatter, page titles, nav labels, code examples, and absolute URLs.
- Installer scripts in sibling repo `../openclaw.ai` if install URLs are touched.
- macOS/iOS/Android bundle names, Info.plists, app display names, appcast, and signing metadata.
- Browser profile defaults: `agdi` versus `user`.
- Plugin metadata: ids, package names, install npm specs, channel ids, and invariant tests.
- GitHub labels and `.github/labeler.yml` when adding channels/extensions/apps/docs.

## Operational Notes

- Gateway default port is usually `18789`.
- Gateway should not bind beyond loopback without auth.
- Browser control is loopback-only and should flow through Gateway auth or node pairing.
- Treat remote CDP URLs, tokens, channel tokens, and provider API keys as secrets.
- Troubleshooting ladder:
  - `agdi status`
  - `agdi status --all`
  - `agdi gateway probe`
  - `agdi gateway status`
  - `agdi doctor`
  - `agdi channels status --probe`
  - `agdi logs --follow`

## Current Analysis Caveat

This context was prepared from repository instructions and publicly indexed Agdi/OpenClaw documentation because the local PowerShell host failed before file-reading commands could run in this session. Before making broad edits, verify current local files with `rg --files`, `git status --short`, and targeted `rg "OpenClaw|openclaw|Agdi|agdi"` searches.
