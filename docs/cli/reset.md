---
summary: "CLI reference for `agdi reset` (reset local state/config)"
read_when:
  - You want to wipe local state while keeping the CLI installed
  - You want a dry-run of what would be removed
title: "reset"
---

# `agdi reset`

Reset local config/state (keeps the CLI installed).

```bash
agdi backup create
agdi reset
agdi reset --dry-run
agdi reset --scope config+creds+sessions --yes --non-interactive
```

Run `agdi backup create` first if you want a restorable snapshot before removing local state.
