---
summary: "Draft application text for the Codex for Open Source offer, shaped as the real form fields"
read_when:
  - You are drafting or reviewing the Agdi application
  - You need the dated evidence behind an application claim
title: "OpenAI Codex for Open Source application"
---

# OpenAI Codex for Open Source application

This replaces the previous version of this file, which was a marketing pitch
rather than an application. See [Corrections](#corrections-made-2026-09-22) for
what was removed and why.

Official source: <https://openai.com/form/codex-for-oss/> (accessed 2026-09-21).

**Program facts, stated accurately.** Selected maintainers receive six months of
ChatGPT Pro including Codex, and API credits may be provided. OpenAI does not
promise selection or a response date, and it does not publish a cash grant
amount. Do not make payment decisions based on an expected award.

**Do not submit yet.** Seven of nine mandatory gates in
`plans/agdi-openai-oss-readiness-master-plan.md` fail. The current blocker list is
`plans/agdi-submission-readiness-gap-report.md`.

---

## Field 1 — Why this repository qualifies

> Agdi is a local-first AI agent runtime: a TypeScript pnpm workspace of 88
> packages with a gateway, CLI, dashboard, and messaging-channel plugins. It is
> independently maintained and derived substantially from OpenClaw, which
> README.md discloses. As of 2026-09-22 the public repository has 1 contributor,
> 0 stars, 0 forks, and no tagged release, so adoption evidence does not yet
> exist. One maintainer carries the full dependency graph, security triage, and
> review load.

Characters: 468

## Field 2 — How API credits would be used

> Credits would fund Codex-assisted maintenance of the existing runtime, not new
> product scope: reviewing pull requests across 88 workspace packages; triaging
> the 1 critical and 16 high production advisories that currently block release;
> validating the exact-SHA release candidate workflow (frozen install, pack,
> install smoke, SBOM, attestation); and automating issue triage. Every use maps
> to a CI job or audit document already in the repository.

Characters: 446

## Field 3 — Anything else

> Honest limitations: no public release, one maintainer, no external users, and an
> unfinished migration from inherited OpenClaw naming. Four provenance questions
> remain open for legal review. Engineering is gated rather than asserted: a
> security workflow, an audit exception policy, and a candidate release workflow
> landed 2026-09-22, but two gates still fail honestly and are not yet enforced.
> No adoption number here is estimated or projected.

Characters: 443

All three fields are within the form's 500-character limit. Counts are measured
on the field text with line breaks collapsed to single spaces; re-measure after
any edit rather than assuming the number is still valid.

---

## Dated evidence behind each claim

Every row was verified on 2026-09-22 against `HEAD`
`c289b658b06ecf10861ff39f7af8df14c5427cc8`. Nothing is projected.

| Claim | Evidence | Source |
| ----- | -------- | ------ |
| 88 workspace packages | `node scripts/check-workspace-package-invariants.mjs --report` prints "passed for 88 packages" | command output |
| 1 contributor | contributors API returns one account, 34 commits | GitHub API |
| 0 stars, 0 forks | repository API | GitHub API |
| No tagged release | `git tag` returns nothing; releases API returns `[]` | git, GitHub API |
| 1 critical, 16 high advisories | `pnpm audit --prod --json` | command output |
| Derived from OpenClaw | `README.md` attribution line | repository |
| Two gates still fail | `format:check` and `test:unit` both end in `\|\| true` | `package.json` |
| Four provenance questions open | notice questions listed with no owner or expiry | `docs/audits/phase1-release-candidate-checklist.md` |
| Security and candidate workflows landed | `.github/workflows/security.yml`, `.github/workflows/release-candidate.yml` | repository |

## Corrections made 2026-09-22

| Removed or changed | Why |
| ------------------ | --- |
| "$25,000 Allocation Plan" with four budget lines | Invented. The program provides ChatGPT Pro and API credits, not a published cash amount. |
| "100% Green Matrix CI" | False. `check:public-branding` failed at the time, `format:check` and `test:unit` were masked, and `typecheck` aborted with exit 134 at the default heap. |
| "security scans across Linux, macOS, and Windows runners" | No macOS runner and no security-scan job existed. |
| "Built from the ground up" | Contradicted the repository's own attribution to OpenClaw. |
| "production-grade", "premium", "zero-latency" | Unverifiable adjectives with no measurement behind them. |
| Free-form pitch structure | Replaced with the three narrative fields the form actually asks for, each within its 500-character limit. |
| Grant-credit figure framing | Reframed as API-credit use, which is what the programme offers. |

## Codex Security interest

Request Codex Security only after the threat model and the security workflow have
produced evidence. Both now exist as files, but neither has run against a public
release. Relevant surfaces: archive extraction, PDF ingestion, messaging-channel
ingress, MCP server output, and credential handling. See
`docs/audits/phase1-security-triage.md` for reachability per finding.

## Submission record

Fill this in at submission time. Do not pre-fill it with an expected date.

| Item | Value |
| ---- | ----- |
| Submitted on | _(not submitted)_ |
| Repository SHA | _(unset)_ |
| Public release URL | _(none exists)_ |
| Exact submitted text | _(unset)_ |
| Account email used | _(unset)_ |
