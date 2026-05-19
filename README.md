<div align="center">

# Agdi

**A local-first AI agent runtime for assistants, automations, chat integrations, and real tool execution.**

[![npm version](https://img.shields.io/npm/v/agdi?style=flat-square&color=0ea5e9)](https://www.npmjs.com/package/agdi)
[![npm downloads](https://img.shields.io/npm/dm/agdi?style=flat-square&color=2563eb)](https://www.npmjs.com/package/agdi)
[![license](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](LICENSE)
[![node](https://img.shields.io/badge/node-%3E%3D22.14.0-brightgreen?style=flat-square)](https://nodejs.org)

**6,000+ npm downloads in the first 5 months.**

</div>

---

Agdi gives you a private agent workspace that runs on your own machine or host. It combines a local runtime, gateway APIs, chat app connectors, plugin tooling, and a workspace UI so assistants can execute useful work instead of only returning text.

Agdi is the runtime layer of the ecosystem. It is built for people who want a controllable agent backend: developers, operators, technical founders, automation teams, and anyone who needs AI workflows connected to local files, tools, services, and messaging channels.

## Install

```bash
npm install -g agdi
agdi onboard
```

Native release artifacts are also available for desktop/server installs:

| Platform | Artifact |
|---|---|
| Windows | `agdi-windows.exe` |
| macOS | `agdi-macos` |
| Linux | `agdi-linux` |

## Quick Start

Start the local runtime:

```bash
agdi gateway
```

Open the workspace:

```bash
agdi dashboard
```

Run onboarding again any time:

```bash
agdi onboard
```

## What Agdi Provides

| Area | What it does |
|---|---|
| Local runtime | Runs assistant workflows with local control over config, profiles, tools, and execution. |
| Gateway | Exposes WebSocket and HTTP surfaces for workspace, automation, and remote control flows. |
| Workspace UI | Provides a dashboard for running, inspecting, and managing agent activity. |
| Chat integrations | Connects assistants to messaging surfaces such as Slack, Discord, Telegram, WhatsApp, Matrix, and more. |
| Tool execution | Gives agents structured access to shell, files, web, media, and automation workflows. |
| Plugin SDK | Lets integrations and runtime features be built as reusable packages. |
| Self-hosting | Supports private deployment patterns on local machines, WSL, Linux hosts, and desktop environments. |

## Commands

| Command | Purpose |
|---|---|
| `agdi onboard` | Configure the runtime and provider setup. |
| `agdi gateway` | Start or manage the local gateway runtime. |
| `agdi dashboard` | Open the workspace UI. |
| `agdi doctor` | Check local environment and runtime readiness. |
| `agdi config` | Inspect and manage runtime configuration. |
| `openclaw` | Compatibility command for OpenClaw-oriented workflows. |

## Agdi vs Agdi-dev

The ecosystem now uses separate command namespaces so both tools can be installed together cleanly.

| Package | Command | Role |
|---|---|---|
| `agdi` | `agdi`, `openclaw` | Local-first agent runtime, gateway, workspace, chat integrations, and plugin execution. |
| `agdi-dev` | `agdi-build` | Autonomous app builder for generating full-stack web apps from prompts. |

Install the app-builder CLI only when you want project generation workflows:

```bash
npm install -g agdi-dev
agdi-build build "A CRM dashboard for a sales team"
```

## Configuration

Recommended Agdi-native environment variables:

| Variable | Purpose |
|---|---|
| `AGDI_GATEWAY_TOKEN` | Token for gateway access. |
| `AGDI_GATEWAY_PASSWORD` | Password-based gateway access where enabled. |
| `AGDI_PROFILE` | Selects the active runtime profile. |

Legacy `OPENCLAW_*` daemon variables are still accepted as compatibility fallbacks, but `AGDI_*` names are the public surface going forward.

## Documentation

- Getting started: https://docs.agdi.ai/start/getting-started
- Onboarding: https://docs.agdi.ai/start/wizard
- Gateway runbook: https://docs.agdi.ai/gateway
- Workspace UI: https://docs.agdi.ai/web/dashboard
- Remote access: https://docs.agdi.ai/gateway/remote
- Configuration: https://docs.agdi.ai/gateway/configuration

## Run From Source

Requirements:

- Node.js 22.14+
- pnpm

```bash
git clone https://github.com/anassagd432/Agdi.git
cd Agdi
pnpm install
pnpm build
pnpm dev
```

## Development Checks

```bash
pnpm check
pnpm test
pnpm build
```

CI runs on push and pull request paths for linting, type checks, unit tests, build smoke tests, Windows coverage, and docs validation.

## Security Model

Agdi is designed for private, operator-controlled agent execution. Treat tool access like infrastructure access:

- keep credentials out of committed files,
- scope gateway access with tokens or passwords,
- use profiles to separate environments,
- review plugin and integration permissions,
- prefer explicit runtime configuration over hidden defaults.

## License

MIT
