---
summary: "Time-bounded vulnerability exception template and the (currently empty) exception registry"
read_when:
  - You are considering granting or renewing a security exception
  - You need the fields a time-bounded exception must carry
title: "Phase 1 security exceptions"
---

# Phase 1 security exceptions

This document defines how an unresolved security finding may be accepted on a
temporary, explicit basis. It contains a template and an empty registry.

**No exception is granted by this document.** Every entry in the registry below
is empty because Anass has not granted any. Filling a row is a decision for
Anass, not for an agent.

## Rules

1. An exception is per finding, not per severity class. "All criticals are
   accepted" is not a valid exception.
2. Every exception carries a named owner and an explicit expiry date. There is
   no open-ended exception.
3. An exception without a compensating control is a release block, not an
   exception.
4. Expiry is a hard stop. At expiry the finding returns to release-blocking
   status unless the exception is renewed with fresh evidence.
5. An exception records the advisory as it was understood on the date it was
   granted. If the advisory changes, the exception must be re-reviewed.
6. Renewal requires the same fields as the original grant, plus a note on what
   changed.

## Template

Copy this block into the registry for each finding that is accepted.

```markdown
### EXC-<number>: <module> — <GHSA/CVE>

- **Advisory:** GHSA-xxxx-xxxx-xxxx (CVE-xxxx-xxxxx)
- **Severity:** critical | high
- **Module and installed version:** <module>@<version>
- **Dependency path:** <importer path from the triage table>
- **Fix status:** no upstream fix | fix available but deferred | fix deferred pending testing
- **Why not fixed now:** <one or two sentences. Name the concrete blocker.>
- **Reachability and exposure:** <what an attacker must control to trigger it, and what they gain>
- **Compensating control:** <the specific control that reduces exposure. Not "monitor".>
- **Residual risk after the control:** <what remains, stated plainly>
- **Owner:** <name>
- **Granted on:** <YYYY-MM-DD>
- **Expires on:** <YYYY-MM-DD>
- **Review cadence:** <e.g. re-check for an upstream fix at each release candidate>
- **Evidence reviewed:** <command output, advisory URL, date observed>
- **Release impact:** <does a release ship with this exception, or is the release held?>
```

## Registry

_Empty. No exceptions have been granted._

| ID | Module | Advisory | Severity | Owner | Granted | Expires | Compensating control |
| --- | --- | --- | --- | --- | --- | --- | --- |
| — | — | — | — | — | — | — | — |

## Findings currently without an exception

These are the findings from
[Phase 1 security triage](/audits/phase1-security-triage) that cannot be closed
by an approved upgrade. They are release-blocking until either a fix lands or a
row is added to the registry above.

| Module | Advisory | Severity | Status |
| --- | --- | --- | --- |
| `@mariozechner/pi-coding-agent` | GHSA-jfgx-wxx8-mp94 | high | No upstream fix. Latest release (0.73.1) is still affected. |
| `extract-zip` | GHSA-jmr9-qjv8-65gv, GHSA-7pqw-9j4j-h8q3 | high | No upstream fix. 2.0.1 is the latest published version. |
| `tar` | GHSA-23hp-3jrh-7fpw | critical | Fix available (>=7.5.19). Held open by the `pnpm.overrides.tar` pin. |
| `@whiskeysockets/baileys` | GHSA-qvv5-jq5g-4cgg | critical | Fix available (>=7.0.0-rc12). Held open by the exact pin in `extensions/whatsapp`. |
