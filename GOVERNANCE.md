# Governance

This document describes how Agdi is actually governed today. It is deliberately
short and operational. It does not describe committees, elections, or voting
systems, because none of those exist.

## Current reality

- Agdi is a **maintainer-led** project. One maintainer,
  [@anassagd432](https://github.com/anassagd432), holds final decision authority
  over the repository.
- There is **no steering committee, no technical committee, no elected body, no
  voting process, no foundation, and no sponsoring organization**.
- There is **no `CODEOWNERS` file** and no per-area ownership map. Review is
  handled by the maintainer.
- Public signals are currently minimal: the repository has no published GitHub
  releases and no external contributors yet. Nothing in this document should be
  read as a claim of an established governance process.

## How decisions are made

- Decisions are made **in public, reviewable issues and pull requests**. The
  discussion and the merged commit are the record of the decision.
- The maintainer makes the final call on whether a change is merged, whether a
  breaking change is acceptable, and when a release happens.
- There is no separate request-for-comments or design-document process today. A
  design issue with a clear problem statement, the proposed approach, and the
  affected surfaces is the way to propose something non-trivial.
- Agreement in an issue is not a merge commitment. A change still has to pass
  review and whatever checks currently apply. See
  [`CONTRIBUTING.md`](CONTRIBUTING.md) for the honest state of those checks.

## Roles

| Role        | Who                                            | Responsibility                                               |
| ----------- | ---------------------------------------------- | ------------------------------------------------------------ |
| Maintainer  | [@anassagd432](https://github.com/anassagd432) | Final decisions, review, merges, releases, security response |
| Contributor | Anyone                                         | Issues, pull requests, reviews, documentation                |

No other roles exist. This table will be updated if that changes.

## Earning responsibility over time

There is **no promotion ladder and no promised path to a role**. The maintainer
may grant additional responsibility to a contributor who has consistently
demonstrated it, for example by:

- Submitting focused, well-tested changes that land with little rework
- Reproducing and triaging other people's bug reports
- Reviewing pull requests thoughtfully and constructively
- Owning a specific area (a channel plugin, a provider, the docs) and keeping it
  healthy over time
- Helping other users in issues

Any change in responsibility would be announced in a public issue or pull
request. No timeline, level, or permission set is promised in advance.

## Proposing different kinds of change

**Normal changes.** Open a pull request. One concern per pull request, with the
reasoning and the tests you ran. See [`CONTRIBUTING.md`](CONTRIBUTING.md).

**Breaking changes.** Open an issue **before** implementing. State what breaks,
which documented surfaces are affected (CLI flags, config keys, environment
variables, plugin SDK subpaths, gateway protocol), who is affected, and what the
migration path looks like. Wait for the maintainer to agree on the approach. The
project does not yet operate a formal deprecation policy or a deprecation window
guarantee, so do not assume one exists.

**Security-sensitive changes.** Never open a public pull request or issue for an
unpatched vulnerability. Follow [`SECURITY.md`](SECURITY.md) and use the private
reporting form. Security hardening that does not reveal an exploitable defect can
be proposed as a normal pull request, but do not publish exploit details before a
fix has shipped.

**Releases.** Releases are made by the maintainer only. Contributors must not
tag, publish to npm, or create GitHub releases. Version naming and release lanes
are documented in [`docs/reference/RELEASING.md`](docs/reference/RELEASING.md);
the release procedure, credentials, and approvals are maintainer-only. As of this
writing, no release or tag has been published from this repository.

**Repository settings and labels.** Only the maintainer changes repository
settings, branch protection, labels, and workflow permissions.

## Conflict and conduct

Conduct issues are handled under [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md). If a
decision is disputed, the maintainer decides and explains the reasoning in the
relevant issue or pull request.

## Changing this document

Governance changes are proposed the same way as any other change: open a pull
request against this file with the rationale. The maintainer decides whether to
merge it.
