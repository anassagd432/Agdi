---
summary: "CLI reference for `agdi agents` (list/add/delete/set identity)"
read_when:
  - You want multiple isolated agents (workspaces + routing + auth)
title: "agents"
---

# `agdi agents`

Manage isolated agents (workspaces + auth + routing).

Related:

- Multi-agent routing: [Multi-Agent Routing](/concepts/multi-agent)
- Agent workspace: [Agent workspace](/concepts/agent-workspace)

## Examples

```bash
agdi agents list
agdi agents add work --workspace ~/.agdi/workspace-work
agdi agents set-identity --workspace ~/.agdi/workspace --from-identity
agdi agents set-identity --agent main --avatar avatars/agdi.png
agdi agents delete work
```

## Identity files

Each agent workspace can include an `IDENTITY.md` at the workspace root:

- Example path: `~/.agdi/workspace/IDENTITY.md`
- `set-identity --from-identity` reads from the workspace root (or an explicit `--identity-file`)

Avatar paths resolve relative to the workspace root.

## Set identity

`set-identity` writes fields into `agents.list[].identity`:

- `name`
- `theme`
- `emoji`
- `avatar` (workspace-relative path, http(s) URL, or data URI)

Load from `IDENTITY.md`:

```bash
agdi agents set-identity --workspace ~/.agdi/workspace --from-identity
```

Override fields explicitly:

```bash
agdi agents set-identity --agent main --name "AGDI" --emoji "🦞" --avatar avatars/agdi.png
```

Config sample:

```json5
{
  agents: {
    list: [
      {
        id: "main",
        identity: {
          name: "AGDI",
          theme: "space lobster",
          emoji: "🦞",
          avatar: "avatars/agdi.png",
        },
      },
    ],
  },
}
```
