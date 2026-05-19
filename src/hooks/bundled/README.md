# Bundled Hooks

This directory contains hooks that ship with Agdi. These hooks are automatically discovered and can be enabled or disabled by CLI or configuration.

## Available Hooks

### session-memory

Automatically saves session context to memory when you issue `/new` or `/reset`.

**Events**: `command:new`, `command:reset`
**What it does**: Creates a dated memory file with an LLM-generated slug based on conversation content.
**Output**: `<workspace>/memory/YYYY-MM-DD-slug.md` (defaults to `~/.agdi/workspace`)

**Enable**:

```bash
agdi hooks enable session-memory
```

### bootstrap-extra-files

Injects extra bootstrap files (for example monorepo `AGENTS.md`/`TOOLS.md`) during prompt assembly.

**Events**: `agent:bootstrap`
**What it does**: Expands configured workspace glob/path patterns and appends matching bootstrap files to injected context.
**Output**: No files written; context is modified in memory only.

**Enable**:

```bash
agdi hooks enable bootstrap-extra-files
```

### command-logger

Logs all command events to a centralized audit file.

**Events**: `command` (all commands)
**What it does**: Appends JSONL entries to the command log file.
**Output**: `~/.agdi/logs/commands.log`

**Enable**:

```bash
agdi hooks enable command-logger
```

### boot-md

Runs `BOOT.md` whenever the gateway starts after channels start.

**Events**: `gateway:startup`
**What it does**: Executes BOOT.md instructions through the agent runner.
**Output**: Whatever the instructions request, such as outbound messages.

**Enable**:

```bash
agdi hooks enable boot-md
```

## Hook Structure

Each hook is a directory containing:

- **HOOK.md**: Metadata and documentation in YAML frontmatter plus Markdown.
- **handler.ts**: The hook handler function as the default export.

Example structure:

```text
session-memory/
|-- HOOK.md          # Metadata and docs
`-- handler.ts       # Handler implementation
```

## HOOK.md Format

```yaml
---
name: my-hook
description: "Short description"
homepage: https://docs.agdi.ai/automation/hooks#my-hook
metadata:
  { "openclaw": { "emoji": "link", "events": ["command:new"], "requires": { "bins": ["node"] } } }
---
# Hook Title

Documentation goes here...
```

### Metadata Fields

- **emoji**: Display marker for CLI output.
- **events**: Array of events to listen for, such as `["command:new", "session:start"]`.
- **requires**: Optional requirements.
  - **bins**: Required binaries on PATH.
  - **anyBins**: At least one of these binaries must be present.
  - **env**: Required environment variables.
  - **config**: Required config paths, such as `["workspace.dir"]`.
  - **os**: Required platforms, such as `["darwin", "linux"]`.
- **install**: Installation methods. Bundled hooks use `[{"id":"bundled","kind":"bundled"}]`.

## Creating Custom Hooks

To create your own hooks, place them in:

- **Workspace hooks**: `<workspace>/hooks/` (highest precedence)
- **Managed hooks**: `~/.agdi/hooks/` (shared across workspaces)

Custom hooks follow the same structure as bundled hooks.

## Managing Hooks

List all hooks:

```bash
agdi hooks list
```

Show hook details:

```bash
agdi hooks info session-memory
```

Check hook status:

```bash
agdi hooks check
```

Enable or disable:

```bash
agdi hooks enable session-memory
agdi hooks disable command-logger
```

## Configuration

Hooks can be configured in `~/.agdi/agdi.json`:

```json
{
  "hooks": {
    "internal": {
      "enabled": true,
      "entries": {
        "session-memory": {
          "enabled": true
        },
        "command-logger": {
          "enabled": false
        }
      }
    }
  }
}
```

## Event Types

Currently supported events:

- **command**: All command events.
- **command:new**: `/new` command specifically.
- **command:reset**: `/reset` command.
- **command:stop**: `/stop` command.
- **agent:bootstrap**: Before workspace bootstrap files are injected.
- **gateway:startup**: Gateway startup after channels start.

More event types are planned, such as session lifecycle and agent errors.

## Handler API

Hook handlers receive an `InternalHookEvent` object:

```typescript
interface InternalHookEvent {
  type: "command" | "session" | "agent" | "gateway";
  action: string;
  sessionKey: string;
  context: Record<string, unknown>;
  timestamp: Date;
  messages: string[];
}
```

Example handler:

```typescript
import type { HookHandler } from "../../src/hooks/hooks.js";

const myHandler: HookHandler = async (event) => {
  if (event.type !== "command" || event.action !== "new") {
    return;
  }

  console.log("New command triggered!");
  event.messages.push("Hook executed!");
};

export default myHandler;
```

## Testing

Test your hooks by:

1. Place the hook in the workspace hooks directory.
2. Restart the gateway.
3. Enable the hook: `agdi hooks enable my-hook`.
4. Trigger the event, such as sending `/new`.
5. Check gateway logs for hook execution.

## Documentation

Full documentation: https://docs.agdi.ai/automation/hooks
