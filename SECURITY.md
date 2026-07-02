# Security Policy

If you believe you have found a security issue in Agdi, report it privately.

## Reporting

Report vulnerabilities in the repository where the issue lives:

- **Core CLI and gateway**: https://github.com/anassagd432/Agdi
- **macOS desktop app**: https://github.com/anassagd432/Agdi (apps/macos)
- **iOS app**: https://github.com/anassagd432/Agdi (apps/ios)
- **Android app**: https://github.com/anassagd432/Agdi (apps/android)

For issues that do not fit a specific area, email **security@agdi.ai**.

For full reporting instructions, see https://trust.agdi.ai.

## Required in Reports

1. **Title**
2. **Severity assessment**
3. **Impact**
4. **Affected component**
5. **Technical reproduction**
6. **Demonstrated impact**
7. **Environment**
8. **Remediation advice**

Reports without reproduction steps, demonstrated impact, and remediation advice may be deprioritized.

## Report Acceptance Gate

For fastest triage, include:

- Exact vulnerable path, function, and line on a current revision.
- Tested version details, including Agdi version and commit SHA when possible.
- Reproducible proof of concept against latest `main` or the affected released version.
- Evidence from the shipped tag and published artifact/package when the claim targets a release.
- Demonstrated impact tied to Agdi's documented trust boundaries.
- For exposed-secret reports, proof that the credential is Agdi-owned or grants access to Agdi-operated infrastructure or services.
- A scope check explaining why the report is not covered by the out-of-scope section below.

## Common False-Positive Patterns

These are frequently closed with no code change:

- Prompt-injection-only chains without an auth, policy, sandbox, or other boundary bypass.
- Operator-intended local features presented as remote injection.
- Authorized user-triggered local actions presented as privilege escalation without a boundary bypass.
- Reports that only show a malicious plugin executing privileged actions after a trusted operator installs or enables it.
- Reports that assume per-user multi-tenant authorization on a shared gateway host or config.
- Scanner-only claims against stale or nonexistent paths.
- Missing HSTS findings on default local or loopback deployments.
- Claims that only show heuristic detection differences without demonstrating a real boundary bypass.

## Operator Trust Model

Agdi is designed as a personal assistant runtime for one trusted operator and that operator's agents. It does not model one gateway as a multi-tenant adversarial user boundary.

- Authenticated Gateway callers are treated as trusted operators for that Gateway.
- Session identifiers are routing controls, not per-user authorization boundaries.
- If multiple users need isolation, run separate gateways with separate OS users, hosts, or VPS instances.
- Exec approvals are operator guardrails to reduce accidental command execution, not a complete multi-tenant authorization system.
- The model/agent is not a trusted principal. Treat prompt and content injection as expected input risk unless it crosses a real boundary.

## Trusted Plugin Concept

Plugins are loaded in process with the Gateway and are treated as trusted code.

- Installing or enabling a plugin grants it the same trust level as local code running on that Gateway host.
- Plugin behavior such as reading env/files or running host commands is expected inside this trust boundary.
- Security reports must show a boundary bypass, not only malicious behavior from a trusted installed plugin.

## Local State Scope

Trusted local state includes Agdi state, config, and workspace files, such as:

- `~/.agdi`
- `~/.agdi/agdi.json`
- workspace files such as `AGENTS.md`, `MEMORY.md`, and `memory/*.md`

Anyone who can modify trusted local state has already crossed the trusted operator boundary.

## Web Interface Safety

Agdi's Gateway Control UI and HTTP endpoints are intended for local or trusted-network use.

- Recommended default: keep the Gateway loopback-only (`127.0.0.1` / `::1`).
- CLI: `agdi gateway run --bind loopback`.
- Do not expose the Gateway directly to the public internet.
- For remote access, prefer SSH tunnels or Tailscale with strong Gateway auth.
- Canvas and A2UI routes such as `/__agdi__/canvas/` and `/__agdi__/a2ui/` can contain sensitive workspace content. Avoid exposing them beyond loopback unless you understand the risk.

## Runtime Requirements

Agdi requires Node.js 22.14.0 or later.

Verify your Node.js version:

```bash
node --version
```

## Docker Security

When running Agdi in Docker:

1. Prefer a non-root user.
2. Use `--read-only` when possible.
3. Limit container capabilities with `--cap-drop=ALL`.

Example:

```bash
docker run --read-only --cap-drop=ALL \
  -v agdi-data:/app/data \
  agdi/agdi:latest
```

## Known Dependency Advisories

Dependency advisories are enforced through `pnpm.overrides` in `package.json`; run `pnpm audit --prod` to verify. The following advisories are currently accepted because no patched release exists upstream (all in `@mariozechner/pi-coding-agent`, the embedded Pi runner):

- GHSA-gvmj-g25r-r7wr (high) — predictable temporary extension install path. Mitigated by the single trusted-operator model: extension installs only run on the operator's own host.
- GHSA-7v5m-pr3q-6453 (low) — potential XSS in Pi HTML session exports.
- GHSA-r95r-rj6r-c39x (low) — race condition in Pi `auth.json` writes.

Re-check these on each release and remove this section once a patched Pi version ships.

## Security Scanning

This project uses `detect-secrets` for automated secret detection.

Run locally:

```bash
pip install detect-secrets==1.5.0
detect-secrets scan --baseline .secrets.baseline
```
