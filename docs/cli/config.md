---
summary: "CLI reference for `agdi config` (get/set/unset config values)"
read_when:
  - You want to read or edit config non-interactively
title: "config"
---

# `agdi config`

Config helpers: get/set/unset values by path. Run without a subcommand to open
the configure wizard (same as `agdi configure`).

## Examples

```bash
agdi config get browser.executablePath
agdi config set browser.executablePath "/usr/bin/google-chrome"
agdi config set agents.defaults.heartbeat.every "2h"
agdi config set agents.list[0].tools.exec.node "node-id-or-name"
agdi config unset tools.web.search.apiKey
```

## Paths

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
Use `--json` to require JSON5 parsing.

```bash
agdi config set agents.defaults.heartbeat.every "0m"
agdi config set gateway.port 19001 --json
agdi config set channels.whatsapp.groups '["*"]' --json
```

Restart the gateway after edits.
