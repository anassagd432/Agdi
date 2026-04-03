---
summary: "CLI reference for `agdi channels` (accounts, status, login/logout, logs)"
read_when:
  - You want to add/remove channel accounts (WhatsApp/Telegram/Discord/Google Chat/Slack/Mattermost (plugin)/Signal/iMessage)
  - You want to check channel status or tail channel logs
title: "channels"
---

# `agdi channels`

Manage chat channel accounts and their runtime status on the Gateway.

Related docs:

- Channel guides: [Channels](/channels/index)
- Gateway configuration: [Configuration](/gateway/configuration)

## Common commands

```bash
agdi channels list
agdi channels status
agdi channels capabilities
agdi channels capabilities --channel discord --target channel:123
agdi channels resolve --channel slack "#general" "@jane"
agdi channels logs --channel all
```

## Add / remove accounts

```bash
agdi channels add --channel telegram --token <bot-token>
agdi channels add --channel nostr --private-key "$NOSTR_PRIVATE_KEY"
agdi channels remove --channel telegram --delete
```

Tip: `agdi channels add --help` shows per-channel flags (token, private key, app token, signal-cli paths, etc).

When you run `agdi channels add` without flags, the interactive wizard can prompt:

- account ids per selected channel
- optional display names for those accounts
- `Bind configured channel accounts to agents now?`

If you confirm bind now, the wizard asks which agent should own each configured channel account and writes account-scoped routing bindings.

You can also manage the same routing rules later with `agdi agents bindings`, `agdi agents bind`, and `agdi agents unbind` (see [agents](/cli/agents)).

When you add a non-default account to a channel that is still using single-account top-level settings (no `channels.<channel>.accounts` entries yet), Agdi moves account-scoped single-account top-level values into `channels.<channel>.accounts.default`, then writes the new account. This preserves the original account behavior while moving to the multi-account shape.

Routing behavior stays consistent:

- Existing channel-only bindings (no `accountId`) continue to match the default account.
- `channels add` does not auto-create or rewrite bindings in non-interactive mode.
- Interactive setup can optionally add account-scoped bindings.

If your config was already in a mixed state (named accounts present, missing `default`, and top-level single-account values still set), run `agdi doctor --fix` to move account-scoped values into `accounts.default`.

## Login / logout (interactive)

```bash
agdi channels login --channel whatsapp
agdi channels logout --channel whatsapp
```

## Troubleshooting

- Run `agdi status --deep` for a broad probe.
- Use `agdi doctor` for guided fixes.
- `agdi channels list` prints `Claude: HTTP 403 ... user:profile` → usage snapshot needs the `user:profile` scope. Use `--no-usage`, or provide a claude.ai session key (`CLAUDE_WEB_SESSION_KEY` / `CLAUDE_WEB_COOKIE`), or re-auth via Claude Code CLI.
- `agdi channels status` falls back to config-only summaries when the gateway is unreachable. If a supported channel credential is configured via SecretRef but unavailable in the current command path, it reports that account as configured with degraded notes instead of showing it as not configured.

## Capabilities probe

Fetch provider capability hints (intents/scopes where available) plus static feature support:

```bash
agdi channels capabilities
agdi channels capabilities --channel discord --target channel:123
```

Notes:

- `--channel` is optional; omit it to list every channel (including extensions).
- `--target` accepts `channel:<id>` or a raw numeric channel id and only applies to Discord.
- Probes are provider-specific: Discord intents + optional channel permissions; Slack bot + user scopes; Telegram bot flags + webhook; Signal daemon version; Microsoft Teams app token + Graph roles/scopes (annotated where known). Channels without probes report `Probe: unavailable`.

## Resolve names to IDs

Resolve channel/user names to IDs using the provider directory:

```bash
agdi channels resolve --channel slack "#general" "@jane"
agdi channels resolve --channel discord "My Server/#support" "@someone"
agdi channels resolve --channel matrix "Project Room"
```

Notes:

- Use `--kind user|group|auto` to force the target type.
- Resolution prefers active matches when multiple entries share the same name.
- `channels resolve` is read-only. If a selected account is configured via SecretRef but that credential is unavailable in the current command path, the command returns degraded unresolved results with notes instead of aborting the entire run.
