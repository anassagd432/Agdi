---
summary: "CLI reference for `agdi config` (get/set/unset/file/schema/validate)"
read_when:
  - You want to read or edit config non-interactively
title: "config"
---

# `agdi config`

Config helpers for non-interactive edits in `agdi.json`: get/set/unset/file/schema/validate
values by path and print the active config file. Run without a subcommand to
open the configure wizard (same as `agdi configure`).

## Examples

```bash
agdi config file
agdi config schema
agdi config get browser.executablePath
agdi config set browser.executablePath "/usr/bin/google-chrome"
agdi config set agents.defaults.heartbeat.every "2h"
agdi config set agents.list[0].tools.exec.node "node-id-or-name"
agdi config set channels.discord.token --ref-provider default --ref-source env --ref-id DISCORD_BOT_TOKEN
agdi config set secrets.providers.vaultfile --provider-source file --provider-path /etc/agdi/secrets.json --provider-mode json
agdi config unset plugins.entries.brave.config.webSearch.apiKey
agdi config set channels.discord.token --ref-provider default --ref-source env --ref-id DISCORD_BOT_TOKEN --dry-run
agdi config validate
agdi config validate --json
```

### `config schema`

Print the generated JSON schema for `agdi.json` to stdout as plain text.

```bash
agdi config schema
```

Pipe it into a file when you want to inspect or validate it with other tools:

```bash
agdi config schema > agdi.schema.json
```

### Paths

Paths use dot or bracket notation:

```bash
agdi config get agents.defaults.workspace
agdi config get agents.list[0].id
```

Use the agent list index to target a specific agent:

```bash
agdi config get agents.list
agdi config set agents.list[1].tools.exec.node "node-id-or-name"
```

## Values

Values are parsed as JSON5 when possible; otherwise they are treated as strings.
Use `--strict-json` to require JSON5 parsing. `--json` remains supported as a legacy alias.

```bash
agdi config set agents.defaults.heartbeat.every "0m"
agdi config set gateway.port 19001 --strict-json
agdi config set channels.whatsapp.groups '["*"]' --strict-json
```

## `config set` modes

`agdi config set` supports four assignment styles:

1. Value mode: `agdi config set <path> <value>`
2. SecretRef builder mode:

```bash
agdi config set channels.discord.token \
  --ref-provider default \
  --ref-source env \
  --ref-id DISCORD_BOT_TOKEN
```

3. Provider builder mode (`secrets.providers.<alias>` path only):

```bash
agdi config set secrets.providers.vault \
  --provider-source exec \
  --provider-command /usr/local/bin/agdi-vault \
  --provider-arg read \
  --provider-arg openai/api-key \
  --provider-timeout-ms 5000
```

4. Batch mode (`--batch-json` or `--batch-file`):

```bash
agdi config set --batch-json '[
  {
    "path": "secrets.providers.default",
    "provider": { "source": "env" }
  },
  {
    "path": "channels.discord.token",
    "ref": { "source": "env", "provider": "default", "id": "DISCORD_BOT_TOKEN" }
  }
]'
```

```bash
agdi config set --batch-file ./config-set.batch.json --dry-run
```

Batch parsing always uses the batch payload (`--batch-json`/`--batch-file`) as the source of truth.
`--strict-json` / `--json` do not change batch parsing behavior.

JSON path/value mode remains supported for both SecretRefs and providers:

```bash
agdi config set channels.discord.token \
  '{"source":"env","provider":"default","id":"DISCORD_BOT_TOKEN"}' \
  --strict-json

agdi config set secrets.providers.vaultfile \
  '{"source":"file","path":"/etc/agdi/secrets.json","mode":"json"}' \
  --strict-json
```

## Provider Builder Flags

Provider builder targets must use `secrets.providers.<alias>` as the path.

Common flags:

- `--provider-source <env|file|exec>`
- `--provider-timeout-ms <ms>` (`file`, `exec`)

Env provider (`--provider-source env`):

- `--provider-allowlist <ENV_VAR>` (repeatable)

File provider (`--provider-source file`):

- `--provider-path <path>` (required)
- `--provider-mode <singleValue|json>`
- `--provider-max-bytes <bytes>`

Exec provider (`--provider-source exec`):

- `--provider-command <path>` (required)
- `--provider-arg <arg>` (repeatable)
- `--provider-no-output-timeout-ms <ms>`
- `--provider-max-output-bytes <bytes>`
- `--provider-json-only`
- `--provider-env <KEY=VALUE>` (repeatable)
- `--provider-pass-env <ENV_VAR>` (repeatable)
- `--provider-trusted-dir <path>` (repeatable)
- `--provider-allow-insecure-path`
- `--provider-allow-symlink-command`

Hardened exec provider example:

```bash
agdi config set secrets.providers.vault \
  --provider-source exec \
  --provider-command /usr/local/bin/agdi-vault \
  --provider-arg read \
  --provider-arg openai/api-key \
  --provider-json-only \
  --provider-pass-env VAULT_TOKEN \
  --provider-trusted-dir /usr/local/bin \
  --provider-timeout-ms 5000
```

## Dry run

Use `--dry-run` to validate changes without writing `agdi.json`.

```bash
agdi config set channels.discord.token \
  --ref-provider default \
  --ref-source env \
  --ref-id DISCORD_BOT_TOKEN \
  --dry-run

agdi config set channels.discord.token \
  --ref-provider default \
  --ref-source env \
  --ref-id DISCORD_BOT_TOKEN \
  --dry-run \
  --json

agdi config set channels.discord.token \
  --ref-provider vault \
  --ref-source exec \
  --ref-id discord/token \
  --dry-run \
  --allow-exec
```

Dry-run behavior:

- Builder mode: runs SecretRef resolvability checks for changed refs/providers.
- JSON mode (`--strict-json`, `--json`, or batch mode): runs schema validation plus SecretRef resolvability checks.
- Exec SecretRef checks are skipped by default during dry-run to avoid command side effects.
- Use `--allow-exec` with `--dry-run` to opt in to exec SecretRef checks (this may execute provider commands).
- `--allow-exec` is dry-run only and errors if used without `--dry-run`.

`--dry-run --json` prints a machine-readable report:

- `ok`: whether dry-run passed
- `operations`: number of assignments evaluated
- `checks`: whether schema/resolvability checks ran
- `checks.resolvabilityComplete`: whether resolvability checks ran to completion (false when exec refs are skipped)
- `refsChecked`: number of refs actually resolved during dry-run
- `skippedExecRefs`: number of exec refs skipped because `--allow-exec` was not set
- `errors`: structured schema/resolvability failures when `ok=false`

### JSON Output Shape

```json5
{
  ok: boolean,
  operations: number,
  configPath: string,
  inputModes: ["value" | "json" | "builder", ...],
  checks: {
    schema: boolean,
    resolvability: boolean,
    resolvabilityComplete: boolean,
  },
  refsChecked: number,
  skippedExecRefs: number,
  errors?: [
    {
      kind: "schema" | "resolvability",
      message: string,
      ref?: string, // present for resolvability errors
    },
  ],
}
```

Success example:

```json
{
  "ok": true,
  "operations": 1,
  "configPath": "~/.agdi/agdi.json",
  "inputModes": ["builder"],
  "checks": {
    "schema": false,
    "resolvability": true,
    "resolvabilityComplete": true
  },
  "refsChecked": 1,
  "skippedExecRefs": 0
}
```

Failure example:

```json
{
  "ok": false,
  "operations": 1,
  "configPath": "~/.agdi/agdi.json",
  "inputModes": ["builder"],
  "checks": {
    "schema": false,
    "resolvability": true,
    "resolvabilityComplete": true
  },
  "refsChecked": 1,
  "skippedExecRefs": 0,
  "errors": [
    {
      "kind": "resolvability",
      "message": "Error: Environment variable \"MISSING_TEST_SECRET\" is not set.",
      "ref": "env:default:MISSING_TEST_SECRET"
    }
  ]
}
```

If dry-run fails:

- `config schema validation failed`: your post-change config shape is invalid; fix path/value or provider/ref object shape.
- `SecretRef assignment(s) could not be resolved`: referenced provider/ref currently cannot resolve (missing env var, invalid file pointer, exec provider failure, or provider/source mismatch).
- `Dry run note: skipped <n> exec SecretRef resolvability check(s)`: dry-run skipped exec refs; rerun with `--allow-exec` if you need exec resolvability validation.
- For batch mode, fix failing entries and rerun `--dry-run` before writing.

## Subcommands

- `config file`: Print the active config file path (resolved from `OPENCLAW_CONFIG_PATH` or default location).

Restart the gateway after edits.

## Validate

Validate the current config against the active schema without starting the
gateway.

```bash
agdi config validate
agdi config validate --json
```
