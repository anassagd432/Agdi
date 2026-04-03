---
summary: "CLI reference for `agdi plugins` (list, install, marketplace, uninstall, enable/disable, doctor)"
read_when:
  - You want to install or manage Gateway plugins or compatible bundles
  - You want to debug plugin load failures
title: "plugins"
---

# `agdi plugins`

Manage Gateway plugins/extensions, hook packs, and compatible bundles.

Related:

- Plugin system: [Plugins](/tools/plugin)
- Bundle compatibility: [Plugin bundles](/plugins/bundles)
- Plugin manifest + schema: [Plugin manifest](/plugins/manifest)
- Security hardening: [Security](/gateway/security)

## Commands

```bash
agdi plugins list
agdi plugins install <path-or-spec>
agdi plugins inspect <id>
agdi plugins enable <id>
agdi plugins disable <id>
agdi plugins uninstall <id>
agdi plugins doctor
agdi plugins update <id>
agdi plugins update --all
agdi plugins marketplace list <marketplace>
```

Bundled plugins ship with Agdi but start disabled. Use `plugins enable` to
activate them.

Native Agdi plugins must ship `agdi.plugin.json` with an inline JSON
Schema (`configSchema`, even if empty). Compatible bundles use their own bundle
manifests instead.

`plugins list` shows `Format: agdi` or `Format: bundle`. Verbose list/info
output also shows the bundle subtype (`codex`, `claude`, or `cursor`) plus detected bundle
capabilities.

### Install

```bash
agdi plugins install <package>                      # ClawHub first, then npm
agdi plugins install clawhub:<package>              # ClawHub only
agdi plugins install <package> --pin                # pin version
agdi plugins install <path>                         # local path
agdi plugins install <plugin>@<marketplace>         # marketplace
agdi plugins install <plugin> --marketplace <name>  # marketplace (explicit)
```

Bare package names are checked against ClawHub first, then npm. Security note:
treat plugin installs like running code. Prefer pinned versions.

`plugins install` is also the install surface for hook packs that expose
`agdi.hooks` in `package.json`. Use `agdi hooks` for filtered hook
visibility and per-hook enablement, not package installation.

Npm specs are **registry-only** (package name + optional **exact version** or
**dist-tag**). Git/URL/file specs and semver ranges are rejected. Dependency
installs run with `--ignore-scripts` for safety.

Bare specs and `@latest` stay on the stable track. If npm resolves either of
those to a prerelease, Agdi stops and asks you to opt in explicitly with a
prerelease tag such as `@beta`/`@rc` or an exact prerelease version such as
`@1.2.3-beta.4`.

If a bare install spec matches a bundled plugin id (for example `diffs`), Agdi
installs the bundled plugin directly. To install an npm package with the same
name, use an explicit scoped spec (for example `@scope/diffs`).

Supported archives: `.zip`, `.tgz`, `.tar.gz`, `.tar`.

Claude marketplace installs are also supported.

ClawHub installs use an explicit `clawhub:<package>` locator:

```bash
agdi plugins install clawhub:agdi-codex-app-server
agdi plugins install clawhub:agdi-codex-app-server@1.2.3
```

Agdi now also prefers ClawHub for bare npm-safe plugin specs. It only falls
back to npm if ClawHub does not have that package or version:

```bash
agdi plugins install agdi-codex-app-server
```

Agdi downloads the package archive from ClawHub, checks the advertised
plugin API / minimum gateway compatibility, then installs it through the normal
archive path. Recorded installs keep their ClawHub source metadata for later
updates.

Use `plugin@marketplace` shorthand when the marketplace name exists in Claude's
local registry cache at `~/.claude/plugins/known_marketplaces.json`:

```bash
agdi plugins marketplace list <marketplace-name>
agdi plugins install <plugin-name>@<marketplace-name>
```

Use `--marketplace` when you want to pass the marketplace source explicitly:

```bash
agdi plugins install <plugin-name> --marketplace <marketplace-name>
agdi plugins install <plugin-name> --marketplace <owner/repo>
agdi plugins install <plugin-name> --marketplace ./my-marketplace
```

Marketplace sources can be:

- a Claude known-marketplace name from `~/.claude/plugins/known_marketplaces.json`
- a local marketplace root or `marketplace.json` path
- a GitHub repo shorthand such as `owner/repo`
- a git URL

For remote marketplaces loaded from GitHub or git, plugin entries must stay
inside the cloned marketplace repo. Agdi accepts relative path sources from
that repo and rejects external git, GitHub, URL/archive, and absolute-path
plugin sources from remote manifests.

For local paths and archives, Agdi auto-detects:

- native Agdi plugins (`agdi.plugin.json`)
- Codex-compatible bundles (`.codex-plugin/plugin.json`)
- Claude-compatible bundles (`.claude-plugin/plugin.json` or the default Claude
  component layout)
- Cursor-compatible bundles (`.cursor-plugin/plugin.json`)

Compatible bundles install into the normal extensions root and participate in
the same list/info/enable/disable flow. Today, bundle skills, Claude
command-skills, Claude `settings.json` defaults, Cursor command-skills, and compatible Codex hook
directories are supported; other detected bundle capabilities are shown in
diagnostics/info but are not yet wired into runtime execution.

Use `--link` to avoid copying a local directory (adds to `plugins.load.paths`):

```bash
agdi plugins install -l ./my-plugin
```

Use `--pin` on npm installs to save the resolved exact spec (`name@version`) in
`plugins.installs` while keeping the default behavior unpinned.

### Uninstall

```bash
agdi plugins uninstall <id>
agdi plugins uninstall <id> --dry-run
agdi plugins uninstall <id> --keep-files
```

`uninstall` removes plugin records from `plugins.entries`, `plugins.installs`,
the plugin allowlist, and linked `plugins.load.paths` entries when applicable.
For active memory plugins, the memory slot resets to `memory-core`.

By default, uninstall also removes the plugin install directory under the active
state dir extensions root (`$OPENCLAW_STATE_DIR/extensions/<id>`). Use
`--keep-files` to keep files on disk.

`--keep-config` is supported as a deprecated alias for `--keep-files`.

### Update

```bash
agdi plugins update <id-or-npm-spec>
agdi plugins update --all
agdi plugins update <id-or-npm-spec> --dry-run
agdi plugins update @agdi/voice-call@beta
```

Updates apply to tracked installs in `plugins.installs` and tracked hook-pack
installs in `hooks.internal.installs`.

When you pass a plugin id, Agdi reuses the recorded install spec for that
plugin. That means previously stored dist-tags such as `@beta` and exact pinned
versions continue to be used on later `update <id>` runs.

For npm installs, you can also pass an explicit npm package spec with a dist-tag
or exact version. Agdi resolves that package name back to the tracked plugin
record, updates that installed plugin, and records the new npm spec for future
id-based updates.

When a stored integrity hash exists and the fetched artifact hash changes,
Agdi prints a warning and asks for confirmation before proceeding. Use
global `--yes` to bypass prompts in CI/non-interactive runs.

### Inspect

```bash
agdi plugins inspect <id>
agdi plugins inspect <id> --json
```

Deep introspection for a single plugin. Shows identity, load status, source,
registered capabilities, hooks, tools, commands, services, gateway methods,
HTTP routes, policy flags, diagnostics, and install metadata.

Each plugin is classified by what it actually registers at runtime:

- **plain-capability** — one capability type (e.g. a provider-only plugin)
- **hybrid-capability** — multiple capability types (e.g. text + speech + images)
- **hook-only** — only hooks, no capabilities or surfaces
- **non-capability** — tools/commands/services but no capabilities

See [Plugin shapes](/plugins/architecture#plugin-shapes) for more on the capability model.

The `--json` flag outputs a machine-readable report suitable for scripting and
auditing.

`info` is an alias for `inspect`.
