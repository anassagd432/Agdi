# Agdi

Agdi is an open-source agent workspace for running assistants, automations, connected chat apps, and real tool execution on your own machine or private host.

## Install

Native installers:

- Windows: download the latest `agdi-windows.exe` release artifact
- macOS: download the latest `agdi-macos` release artifact
- Linux: download the latest `agdi-linux` release artifact

npm:

```bash
npm install -g agdi
```

After install:

```bash
agdi onboard
```

## Command Split

Agdi and Agdi-dev now use separate command namespaces.

- This repo (`Agdi`) keeps the runtime commands `agdi` and `openclaw`.
- The `Agdi-dev` repo uses `agdi-build` for the app-builder CLI.

Install the app-builder CLI separately if you need it:

```bash
npm install -g agdi-dev
agdi-build build "A CRM dashboard"
```

## Workspace quick start

Start the local runtime:

```bash
agdi gateway
```

Open the workspace:

```bash
agdi dashboard
```

Canonical workspace auth env vars:

- `AGDI_GATEWAY_TOKEN`
- `AGDI_GATEWAY_PASSWORD`
- `AGDI_PROFILE`

Legacy `OPENCLAW_*` daemon env vars are still accepted as compatibility fallbacks, but Agdi-native names are the recommended public surface.

## What Agdi provides

- Local runtime with WebSocket control, HTTP APIs, and a workspace UI
- Connections across built-in and plugin chat apps
- Local and remote node execution
- Tooling for shell, files, web, and automation workflows
- Profile-aware daemon/service installs on macOS, Linux/WSL, and Windows task surfaces

## Docs

- Getting started: https://docs.agdi.ai/start/getting-started
- Onboarding: https://docs.agdi.ai/start/wizard
- Runtime runbook: https://docs.agdi.ai/gateway
- Workspace UI: https://docs.agdi.ai/web/dashboard
- Remote access: https://docs.agdi.ai/gateway/remote
- Configuration: https://docs.agdi.ai/gateway/configuration

## Run from source

Prerequisites:

- Node.js 22+
- pnpm

Setup:

```bash
git clone https://github.com/anassagd432/Agdi.git
cd Agdi
pnpm install
pnpm build
pnpm dev
```

## Development checks

```bash
pnpm check      # lint, format, branding, boundary checks
pnpm test       # unit, gateway, channel, and extension tests
pnpm build      # tsdown bundle + postbuild
```

CI runs automatically via GitHub Actions on push/PR to `main`; it includes lint, type-check, unit tests across Linux and Windows, build smoke tests, and docs validation.

## License

MIT
