---
summary: "Run AGDI in a rootless Podman container"
read_when:
  - You want a containerized gateway with Podman instead of Docker
title: "Podman"
---

# Podman

Run the AGDI gateway in a **rootless** Podman container. Uses the same image as Docker (build from the repo [Dockerfile](https://github.com/agdi/agdi/blob/main/Dockerfile)).

## Requirements

- Podman (rootless)
- Sudo for one-time setup (create user, build image)

## Quick start

**1. One-time setup** (from repo root; creates user, builds image, installs launch script):

```bash
./setup-podman.sh
```

This also creates a minimal `~agdi/.agdi/agdi.json` (sets `gateway.mode="local"`) so the gateway can start without running the wizard.

By default the container is **not** installed as a systemd service, you start it manually (see below). For a production-style setup with auto-start and restarts, install it as a systemd Quadlet user service instead:

```bash
./setup-podman.sh --quadlet
```

(Or set `AGDI_PODMAN_QUADLET=1`; use `--container` to install only the container and launch script.)

**2. Start gateway** (manual, for quick smoke testing):

```bash
./scripts/run-agdi-podman.sh launch
```

**3. Onboarding wizard** (e.g. to add channels or providers):

```bash
./scripts/run-agdi-podman.sh launch setup
```

Then open `http://127.0.0.1:18789/` and use the token from `~agdi/.agdi/.env` (or the value printed by setup).

## Systemd (Quadlet, optional)

If you ran `./setup-podman.sh --quadlet` (or `AGDI_PODMAN_QUADLET=1`), a [Podman Quadlet](https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html) unit is installed so the gateway runs as a systemd user service for the agdi user. The service is enabled and started at the end of setup.

- **Start:** `sudo systemctl --machine agdi@ --user start agdi.service`
- **Stop:** `sudo systemctl --machine agdi@ --user stop agdi.service`
- **Status:** `sudo systemctl --machine agdi@ --user status agdi.service`
- **Logs:** `sudo journalctl --machine agdi@ --user -u agdi.service -f`

The quadlet file lives at `~agdi/.config/containers/systemd/agdi.container`. To change ports or env, edit that file (or the `.env` it sources), then `sudo systemctl --machine agdi@ --user daemon-reload` and restart the service. On boot, the service starts automatically if lingering is enabled for agdi (setup does this when loginctl is available).

To add quadlet **after** an initial setup that did not use it, re-run: `./setup-podman.sh --quadlet`.

## The agdi user (non-login)

`setup-podman.sh` creates a dedicated system user `agdi`:

- **Shell:** `nologin` — no interactive login; reduces attack surface.
- **Home:** e.g. `/home/agdi` — holds `~/.agdi` (config, workspace) and the launch script `run-agdi-podman.sh`.
- **Rootless Podman:** The user must have a **subuid** and **subgid** range. Many distros assign these automatically when the user is created. If setup prints a warning, add lines to `/etc/subuid` and `/etc/subgid`:

  ```text
  agdi:100000:65536
  ```

  Then start the gateway as that user (e.g. from cron or systemd):

  ```bash
  sudo -u agdi /home/agdi/run-agdi-podman.sh
  sudo -u agdi /home/agdi/run-agdi-podman.sh setup
  ```

- **Config:** Only `agdi` and root can access `/home/agdi/.agdi`. To edit config: use the Control UI once the gateway is running, or `sudo -u agdi $EDITOR /home/agdi/.agdi/agdi.json`.

## Environment and config

- **Token:** Stored in `~agdi/.agdi/.env` as `AGDI_GATEWAY_TOKEN`. `setup-podman.sh` and `run-agdi-podman.sh` generate it if missing (uses `openssl`, `python3`, or `od`).
- **Optional:** In that `.env` you can set provider keys (e.g. `GROQ_API_KEY`, `OLLAMA_API_KEY`) and other AGDI env vars.
- **Host ports:** By default the script maps `18789` (gateway) and `18790` (bridge). Override the **host** port mapping with `AGDI_PODMAN_GATEWAY_HOST_PORT` and `AGDI_PODMAN_BRIDGE_HOST_PORT` when launching.
- **Paths:** Host config and workspace default to `~agdi/.agdi` and `~agdi/.agdi/workspace`. Override the host paths used by the launch script with `AGDI_CONFIG_DIR` and `AGDI_WORKSPACE_DIR`.

## Useful commands

- **Logs:** With quadlet: `sudo journalctl --machine agdi@ --user -u agdi.service -f`. With script: `sudo -u agdi podman logs -f agdi`
- **Stop:** With quadlet: `sudo systemctl --machine agdi@ --user stop agdi.service`. With script: `sudo -u agdi podman stop agdi`
- **Start again:** With quadlet: `sudo systemctl --machine agdi@ --user start agdi.service`. With script: re-run the launch script or `podman start agdi`
- **Remove container:** `sudo -u agdi podman rm -f agdi` — config and workspace on the host are kept

## Troubleshooting

- **Permission denied (EACCES) on config or auth-profiles:** The container defaults to `--userns=keep-id` and runs as the same uid/gid as the host user running the script. Ensure your host `AGDI_CONFIG_DIR` and `AGDI_WORKSPACE_DIR` are owned by that user.
- **Gateway start blocked (missing `gateway.mode=local`):** Ensure `~agdi/.agdi/agdi.json` exists and sets `gateway.mode="local"`. `setup-podman.sh` creates this file if missing.
- **Rootless Podman fails for user agdi:** Check `/etc/subuid` and `/etc/subgid` contain a line for `agdi` (e.g. `agdi:100000:65536`). Add it if missing and restart.
- **Container name in use:** The launch script uses `podman run --replace`, so the existing container is replaced when you start again. To clean up manually: `podman rm -f agdi`.
- **Script not found when running as agdi:** Ensure `setup-podman.sh` was run so that `run-agdi-podman.sh` is copied to agdi’s home (e.g. `/home/agdi/run-agdi-podman.sh`).
- **Quadlet service not found or fails to start:** Run `sudo systemctl --machine agdi@ --user daemon-reload` after editing the `.container` file. Quadlet requires cgroups v2: `podman info --format '{{.Host.CgroupsVersion}}'` should show `2`.

## Optional: run as your own user

To run the gateway as your normal user (no dedicated agdi user): build the image, create `~/.agdi/.env` with `AGDI_GATEWAY_TOKEN`, and run the container with `--userns=keep-id` and mounts to your `~/.agdi`. The launch script is designed for the agdi-user flow; for a single-user setup you can instead run the `podman run` command from the script manually, pointing config and workspace to your home. Recommended for most users: use `setup-podman.sh` and run as the agdi user so config and process are isolated.
