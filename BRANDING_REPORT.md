# Agdi Branding Report

This report is meant to save analysis tokens for future Claude Code sessions. It summarizes known brand state, likely rebrand gaps, and a practical audit checklist for Agdi.

## Executive Summary

Agdi appears to be a rebranded distribution or fork of the OpenClaw project. The runtime concept, project structure, and many contributor guardrails still match OpenClaw, while public docs and examples show `Agdi`, `agdi`, `~/.agdi/agdi.json`, and the `agdi` browser profile.

The brand transition is partially complete. Future work should avoid blind replacement because several OpenClaw references may still be deliberate:

- upstream repository lineage
- compatibility env vars
- inherited plugin SDK paths
- old config migration paths
- public docs URLs that have not moved to a canonical Agdi domain
- release/install infrastructure still hosted in an OpenClaw-named sibling repo

The safest approach is a surface-by-surface rebrand audit with compatibility decisions documented before changing code.

## Brand Vocabulary

Preferred:

- Product/app/docs heading: `Agdi`
- CLI/binary/config/profile/code spelling: `agdi`
- Assistant/control plane: `Gateway`
- Extension ecosystem wording: `plugin` / `plugins`
- Internal plugin package path: `extensions/*`
- User-owned config: `~/.agdi/agdi.json`
- User workspace: `~/.agdi/workspace`
- Managed browser profile: `agdi`
- Existing signed-in browser profile: `user`

Avoid unless intentionally preserved:

- `OpenClaw` in new user-facing Agdi docs or UI
- `openclaw` in new command examples after canonical `agdi` CLI is confirmed
- OpenClaw mascot/tagline language
- legacy personal paths, hostnames, device names, real phone numbers, or live secrets

## Product Positioning

Current implied positioning:

Agdi is a self-hosted, local-first AI assistant gateway. It connects everyday messaging channels, browser automation, local device nodes, model providers, and plugins so the user can command an assistant from channels they already use.

Core value pillars:

- Local-first control: runs on the user's own machines or private servers.
- Multi-channel access: messaging apps and WebChat reach the same assistant.
- Real automation: files, browser, shell, media, and integrations through tools.
- Extensibility: bundled and external plugins.
- Private operation: Gateway auth, loopback defaults, node pairing, Tailscale/private-network deployment patterns.

Recommended one-line description:

Agdi is a local-first AI assistant gateway that connects your chat apps, browser, devices, and tools to one self-hosted agent.

## Architecture Branding State

Known renamed or Agdi-facing surfaces:

- Docs examples use `agdi gateway`, `agdi browser`, `agdi status`, `agdi doctor`, and similar command examples.
- Config examples reference `~/.agdi/agdi.json`.
- Browser docs use an isolated `agdi` profile by default.
- Plugin examples use `@agdi/my-plugin` in newer docs.
- Release docs describe public Agdi release lanes.
- Browser docs describe "Agdi-managed" browser control.
- macOS Peekaboo docs describe `Agdi.app` as a thin bridge host.

Known inherited OpenClaw-facing surfaces from repo instructions:

- GitHub repo guideline references `https://github.com/openclaw/openclaw`.
- Source paths remain the OpenClaw structure.
- Docs domain guidance still references `docs.openclaw.ai`.
- Installer sibling repo is `../openclaw.ai`.
- Some commands in existing instructions still say `pnpm openclaw ...`.
- Env/config guardrails mention `OPENCLAW_*`.
- Plugin SDK paths may still be `openclaw/plugin-sdk/*`.
- Package names in repo-owned plugins may still be `@openclaw/<id>`.

Brand risk:

The project can easily drift into mixed public copy: Agdi command examples inside pages titled OpenClaw, OpenClaw docs URLs under Agdi content, or plugin/package names mixing `@agdi` with `@openclaw`.

## Public Surface Audit

Audit these before shipping brand-sensitive changes.

### CLI and Terminal

Check:

- Binary names.
- `package.json` `bin`, scripts, name, description, repository, bugs, homepage.
- CLI help text.
- Command examples in tests and docs.
- Error messages and onboarding prompts.
- TTY palette naming and comments.
- Status output and tables.
- Daemon/service names.

Search terms:

```text
OpenClaw
openclaw
OPENCLAW
Moltbot
Molty
Clawdbot
lobster
claw
```

Decision needed:

- Keep compatibility env vars such as `OPENCLAW_*` if existing installs depend on them.
- Introduce `AGDI_*` aliases only with migration tests and docs.
- Avoid renaming internal service identifiers if OS service migration is not implemented.

### Config and Data Paths

Agdi-facing target:

- Config: `~/.agdi/agdi.json`
- Workspace: `~/.agdi/workspace`
- Credentials/session/cache paths under `~/.agdi/`

Audit:

- default path constants
- migration code
- doctor checks
- backup/clobber protection code
- JSON schema and generated docs
- tests asserting path strings
- docs examples

Compatibility question:

Should the app read old `~/.openclaw/openclaw.json` automatically, migrate it once, or only document manual migration? This should be explicit because config loss is high impact.

### Docs and Site

Current state:

- Mintlify docs are indexed on an Agdi-themed preview domain, but page chrome/title may still say OpenClaw.
- Repo guidance still references `docs.openclaw.ai`.

Audit:

- `docs/index.md`
- Mintlify config/navigation
- frontmatter `title`, `summary`, and `description`
- README absolute links
- root-relative docs links
- install/update docs
- screenshots and alt text
- generated config reference
- provider/channel lists
- docs search metadata
- `docs/zh-CN/**` glossary and generated translations

Rules:

- Do not edit `docs/zh-CN/**` directly unless explicitly requested.
- English docs first, glossary next, i18n pipeline last.
- Internal doc links should be root-relative and omit extensions.
- When answering with docs links, use full URLs.

### UI and Apps

Audit:

- macOS display name, menu bar labels, bundle identifiers, Info.plists, appcast, Sparkle metadata.
- iOS display name, bundle IDs, Info.plists, tests Info.plist.
- Android `versionName`, app labels, package IDs, resources.
- Control UI titles, empty states, settings, onboarding, provider/channel picker labels.
- WebChat titles and metadata.
- Browser profile UI tint/name defaults.

Risk:

Changing bundle IDs or appcast feeds is a release and migration task, not a copy-only task.

### Plugins and SDK

Repo guidance says "plugin" is the user-facing term while `extensions/*` stays as the internal directory path.

Audit:

- `openclaw.plugin.json` ids.
- `package.json` package names.
- `openclaw.install.npmSpec`.
- `openclaw.channel.id`.
- public SDK subpaths.
- invariant tests around bundled plugin naming.
- docs examples for plugin authoring.

Decision needed:

Choose whether public package namespace remains `@openclaw/*` for compatibility or moves to `@agdi/*`. A namespace move affects package publishing, docs, install commands, and plugin resolution.

### Channels and Providers

When changing branding in shared channel logic, check all built-in and plugin channels:

- Discord
- Google Chat
- iMessage / BlueBubbles
- Matrix
- Microsoft Teams
- Signal
- Slack
- Telegram
- WhatsApp / Web
- Zalo / Zalo Personal
- voice-call and other channel plugins under `extensions/*`

Audit:

- onboarding labels
- `channels status` output
- auth setup copy
- config examples
- routing docs
- allowlist and pairing messages
- group activation prompts
- provider picker ordering

### Release and Install

Known version and release surfaces:

- `package.json`
- Android Gradle version fields
- iOS Info.plists
- macOS Info.plist
- docs install/update pages
- Peekaboo Xcode projects and Info.plists
- appcast only when cutting a macOS Sparkle release

Audit:

- npm package name and dist-tags
- Git tags and release names
- installer scripts in `../openclaw.ai`
- Homebrew or other package managers
- GitHub Actions names
- release notes and changelog
- public release policy docs

Release guardrail:

Do not change version numbers or publish/release without explicit operator approval.

## Suggested Search Plan

Run these when the shell is healthy:

```bash
rg --files
git status --short
rg -n "OpenClaw|openclaw|OPENCLAW|Moltbot|Molty|Clawdbot|lobster|claw" .
rg -n "Agdi|agdi|AGDI" .
rg -n "~/.openclaw|openclaw\\.json|~/.agdi|agdi\\.json" .
rg -n "docs\\.openclaw\\.ai|openclaw\\.ai|agdiai|agdi" docs README.md package.json .github
rg -n "openclaw/plugin-sdk|@openclaw|@agdi|agdi/plugin-sdk" src extensions
```

Follow-up focused searches:

```bash
rg -n "OPENCLAW_" src docs extensions apps package.json
rg -n "bundle|CFBundle|PRODUCT_BUNDLE_IDENTIFIER|MARKETING_VERSION|CURRENT_PROJECT_VERSION" apps
rg -n "appcast|Sparkle|install\\.sh|install\\.ps1|Homebrew|brew" . docs scripts
rg -n "plugin|extension|extensions|openclaw\\.plugin\\.json|npmSpec|channel\\.id" extensions src docs
```

## Recommended Rebrand Strategy

1. Inventory public surfaces first.
2. Classify each `OpenClaw` occurrence:
   - intentional upstream/history
   - compatibility alias
   - migration code
   - user-facing bug
   - internal implementation detail
3. Change only one surface class at a time.
4. Add or update tests for each migration-sensitive change.
5. Update generated baselines only through the repo's generator commands.
6. Keep changelog entries user-facing only.
7. Run scoped tests first, then full gates appropriate to the surface.

## High-Risk Branding Changes

Avoid doing these casually:

- Renaming package names or npm scopes.
- Renaming binary names without shims.
- Renaming config directories without migration.
- Renaming OS service names without doctor/repair support.
- Changing bundle IDs.
- Changing plugin SDK import paths.
- Replacing env var names without aliases.
- Mass replacement across generated docs/translations.
- Updating release/appcast/install surfaces without release approval.

## Low-Risk Branding Changes

Usually safe if verified with tests:

- New docs prose from `OpenClaw` to `Agdi`.
- New screenshots or alt text using Agdi.
- CLI help text that is not part of a stable parseable contract.
- UI titles and labels that do not affect persisted IDs.
- README descriptions once canonical URLs are confirmed.
- Provider/channel list display names if ids remain unchanged.

## Token-Saving Notes for Future Agents

- Start from `CLAUDE.md`.
- Use this file for branding context.
- Use targeted `rg` searches rather than reading the whole repo.
- Do not infer from one renamed doc page that all runtime paths are renamed.
- Treat config, package, service, and SDK names as compatibility-sensitive.
- Treat docs and UI copy as brand-sensitive but usually lower migration risk.

## Current Evidence Used

This report was prepared from repository instructions and publicly indexed Agdi/OpenClaw documentation. The local shell failed to start PowerShell in this session, so local file contents were not directly inspected. Verify the actual worktree before using this report to make broad edits.
