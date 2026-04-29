# Agdi

Agdi is an open-source AI agent runtime for running long-lived agents, messaging channels, web control surfaces, and real tool execution on your own machine or gateway host.

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

## Gateway quick start

Start the Gateway locally:

```bash
agdi gateway
```

Open the dashboard:

```bash
agdi dashboard
```

Canonical Gateway auth env vars:

- `AGDI_GATEWAY_TOKEN`
- `AGDI_GATEWAY_PASSWORD`
- `AGDI_PROFILE`

Legacy `OPENCLAW_*` daemon env vars are still accepted as compatibility fallbacks, but Agdi-native names are the recommended public surface.

## What Agdi provides

- Gateway runtime with WebSocket control, HTTP APIs, and Control UI
- Messaging integrations across built-in and plugin channels
- Local and remote node execution
- Tooling for shell, files, web, and automation workflows
- Profile-aware daemon/service installs on macOS, Linux/WSL, and Windows task surfaces

## Docs

- Getting started: https://docs.openclaw.ai/start/getting-started
- Onboarding: https://docs.openclaw.ai/start/wizard
- Gateway runbook: https://docs.openclaw.ai/gateway
- Dashboard: https://docs.openclaw.ai/web/dashboard
- Remote access: https://docs.openclaw.ai/gateway/remote
- Configuration: https://docs.openclaw.ai/gateway/configuration

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

CI runs automatically via GitHub Actions on push/PR to `main` — includes lint, type-check, unit tests across Linux and Windows, build smoke tests, and docs validation.

## License

MIT
