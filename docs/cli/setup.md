---
summary: "CLI reference for `agdi setup` (initialize config + workspace)"
read_when:
  - You’re doing first-run setup without full CLI onboarding
  - You want to set the default workspace path
title: "setup"
---

# `agdi setup`

Initialize `~/.agdi/agdi.json` and the agent workspace.

Related:

- Getting started: [Getting started](/start/getting-started)
- CLI onboarding: [Onboarding (CLI)](/start/wizard)

## Examples

```bash
agdi setup
agdi setup --workspace ~/.agdi/workspace
```

To run onboarding via setup:

```bash
agdi setup --wizard
```
