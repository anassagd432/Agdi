---
summary: "Host Agdi on Oracle Cloud's Always Free ARM tier"
read_when:
  - Setting up Agdi on Oracle Cloud
  - Looking for free VPS hosting for Agdi
  - Want 24/7 Agdi on a small server
title: "Oracle Cloud"
---

# Oracle Cloud

Run a persistent Agdi Gateway on Oracle Cloud's **Always Free** ARM tier (up to 4 OCPU, 24 GB RAM, 200 GB storage) at no cost.

## Prerequisites

- Oracle Cloud account ([signup](https://www.oracle.com/cloud/free/)) -- see [community signup guide](https://gist.github.com/rssnyder/51e3cfedd730e7dd5f4a816143b25dbd) if you hit issues
- Tailscale account (free at [tailscale.com](https://tailscale.com))
- An SSH key pair
- About 30 minutes

## Setup

<Steps>
  <Step title="Create an OCI instance">
    1. Log into [Oracle Cloud Console](https://cloud.oracle.com/).
    2. Navigate to **Compute > Instances > Create Instance**.
    3. Configure:
       - **Name:** `agdi`
       - **Image:** Ubuntu 24.04 (aarch64)
       - **Shape:** `VM.Standard.A1.Flex` (Ampere ARM)
       - **OCPUs:** 2 (or up to 4)
       - **Memory:** 12 GB (or up to 24 GB)
       - **Boot volume:** 50 GB (up to 200 GB free)
       - **SSH key:** Add your public key
    4. Click **Create** and note the public IP address.

    <Tip>
    If instance creation fails with "Out of capacity", try a different availability domain or retry later. Free tier capacity is limited.
    </Tip>

  </Step>

  <Step title="Connect and update the system">
    ```bash
    ssh ubuntu@YOUR_PUBLIC_IP

    sudo apt update && sudo apt upgrade -y
    sudo apt install -y build-essential
    ```

    `build-essential` is required for ARM compilation of some dependencies.

  </Step>

  <Step title="Configure user and hostname">
    ```bash
    sudo hostnamectl set-hostname agdi
    sudo passwd ubuntu
    sudo loginctl enable-linger ubuntu
    ```

    Enabling linger keeps user services running after logout.

  </Step>

  <Step title="Install Tailscale">
    ```bash
    curl -fsSL https://tailscale.com/install.sh | sh
    sudo tailscale up --ssh --hostname=agdi
    ```

    From now on, connect via Tailscale: `ssh ubuntu@agdi`.

  </Step>

  <Step title="Install Agdi">
    ```bash
    curl -fsSL https://agdi.ai/install.sh | bash
    source ~/.bashrc
    ```

    When prompted "How do you want to hatch your bot?", select **Do this later**.

  </Step>

  <Step title="Configure the gateway">
    Use token auth with Tailscale Serve for secure remote access.

    ```bash
    agdi config set gateway.bind loopback
    agdi config set gateway.auth.mode token
    agdi doctor --generate-gateway-token
    agdi config set gateway.tailscale.mode serve
    agdi config set gateway.trustedProxies '["127.0.0.1"]'

    systemctl --user restart agdi-gateway
    ```

  </Step>

  <Step title="Lock down VCN security">
    Block all traffic except Tailscale at the network edge:

    1. Go to **Networking > Virtual Cloud Networks** in the OCI Console.
    2. Click your VCN, then **Security Lists > Default Security List**.
    3. **Remove** all ingress rules except `0.0.0.0/0 UDP 41641` (Tailscale).
    4. Keep default egress rules (allow all outbound).

    This blocks SSH on port 22, HTTP, HTTPS, and everything else at the network edge. You can only connect via Tailscale from this point on.

  </Step>

  <Step title="Verify">
    ```bash
    agdi --version
    systemctl --user status agdi-gateway
    tailscale serve status
    curl http://localhost:18789
    ```

    Access the Control UI from any device on your tailnet:

    ```
    https://agdi.<tailnet-name>.ts.net/
    ```

    Replace `<tailnet-name>` with your tailnet name (visible in `tailscale status`).

  </Step>
</Steps>

## Fallback: SSH tunnel

If Tailscale Serve is not working, use an SSH tunnel from your local machine:

```bash
ssh -L 18789:127.0.0.1:18789 ubuntu@agdi
```

Then open `http://localhost:18789`.

## Troubleshooting

**Instance creation fails ("Out of capacity")** -- Free tier ARM instances are popular. Try a different availability domain or retry during off-peak hours.

**Tailscale will not connect** -- Run `sudo tailscale up --ssh --hostname=agdi --reset` to re-authenticate.

**Gateway will not start** -- Run `agdi doctor --non-interactive` and check logs with `journalctl --user -u agdi-gateway -n 50`.

**ARM binary issues** -- Most npm packages work on ARM64. For native binaries, look for `linux-arm64` or `aarch64` releases. Verify architecture with `uname -m`.

## Next steps

- [Channels](/channels) -- connect Telegram, WhatsApp, Discord, and more
- [Gateway configuration](/gateway/configuration) -- all config options
- [Updating](/install/updating) -- keep Agdi up to date
