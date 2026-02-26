# AGDI Security & Trust

**Live:** [trust.agdi.ai](https://trust.agdi.ai)

## Documents

- [Threat Model](./THREAT-MODEL-ATLAS.md) - MITRE ATLAS-based threat model for the AGDI ecosystem
- [Contributing to the Threat Model](./CONTRIBUTING-THREAT-MODEL.md) - How to add threats, mitigations, and attack chains

## Reporting Vulnerabilities

See the [Trust page](https://trust.agdi.ai) for full reporting instructions covering all repos.

## Contact

- **Jamieson O'Reilly** ([@theonejvo](https://twitter.com/theonejvo)) - Security & Trust
- Discord: #security channel

## CI Required Checks

| Check                 | Script           | What it gates                       |
| --------------------- | ---------------- | ----------------------------------- |
| Types + Lint + Format | `pnpm check`     | `format:check` + `tsgo` + `lint:ci` |
| Tests (Node + Bun)    | `pnpm test`      | Unit and integration tests          |
| Build                 | `pnpm build`     | Backend dist compilation            |
| Secret Detection      | `detect-secrets` | Leaked secrets baseline             |

## Scheduled Security Scans

A [weekly workflow](../../.github/workflows/security-scans.yml) runs:
`pnpm audit --prod`, `gitleaks`, `trivy fs`, `osv-scanner`.
Results are uploaded as CI artifacts for 30 days.

## Lint Ceiling Policy

We use a **lint ceiling** to freeze existing lint debt while preventing new violations.

- **Ceiling file**: `.oxlint-ceiling.json`
- **CI script**: `pnpm lint:ci` — passes if errors ≤ ceiling, fails if errors increase
- **Lowering**: Fix lint errors, then → `pnpm lint:freeze`
- **Policy**: The ceiling must never increase

## Vulnerability Acceptance Policy

**Not accepted**: High/Critical in direct prod deps reachable in default configs; any auth/session vuln; committed secrets.

**May be accepted (with waiver)**: Optional extensions not loaded by default; dev-only deps; low-severity with impractical exploitation.

Waivers are documented in `.security-waivers.json` with 6-month expiry dates. See the file for format.

## Branch Protection

The `main` branch requires: `check`, `checks (node, test)`, `build-artifacts`, `secrets` to pass. Configure via Repository → Settings → Branches → Branch protection rules.

## Audits

- [audit-2026-02-26.md](./audit-2026-02-26.md) — Initial security audit with full vulnerability triage
