# Third-party notices

This file records provenance for source and assets incorporated into this
repository. It is a notice record for maintainers and recipients. It is not a
legal opinion. Items marked for review need maintainer or legal confirmation
before they are removed or treated as settled.

## OpenClaw

- Project: OpenClaw
- Canonical repository: https://github.com/openclaw/openclaw
- License name in the upstream LICENSE file: MIT License
- Copyright notice preserved from tag `v2026.3.24`: Copyright (c) 2025 Peter Steinberger
- Incorporated scope: the gateway, CLI, channel implementations, plugin
  layout, docs, and most other paths that exist both here and in that tag.
  At the first AGDI commit, 8,763 of 9,027 shared paths were byte-identical
  to that tag. See [Provenance](docs/reference/provenance.md).
- Best-known baseline: OpenClaw tag `v2026.3.24`, commit
  `cff6dc94e30794a269eb7805b6e636c3634a088c`, tagger date
  `2026-03-25T16:35:44Z`
- Exact baseline commit: unresolved. The AGDI history begins with an imported
  tree, and that tree is not identical to the tag.

The MIT permission and warranty text is in `LICENSE`. Both the OpenClaw
copyright notice and the AGDI modification notice sit above that text.

### Later upstream copyright notice

On 2026-09-21, the LICENSE file on OpenClaw `main` read
`Copyright (c) 2026 OpenClaw Foundation`. That text differs from tag
`v2026.3.24`. This repository's closest verified baseline predates that
wording, and no later OpenClaw commit was proven to have been re-imported.
The Foundation notice is recorded here for maintainer and legal review. It
was not substituted for the Peter Steinberger notice.

GitHub's repository license metadata for `openclaw/openclaw` reported
`NOASSERTION` / `Other` at 2026-09-21T21:56:55+02:00. The LICENSE file text
retrieved at the same time was the MIT license. The file text is the notice
used here.

## Pi / pi-mono

OpenClaw's `THIRD_PARTY_NOTICES.md` on `main`, retrieved
2026-09-21T22:10:31+02:00, says portions of OpenClaw were adapted from Pi /
pi-mono.

- Upstream: https://github.com/earendil-works/pi-mono
- License stated by that OpenClaw notice: MIT
- Copyright stated by that OpenClaw notice: Copyright (c) 2025 Mario Zechner
- Package family named in the current OpenClaw notice: `@earendil-works/pi-*`
- Packages declared in this repository's root manifest: `@mariozechner/pi-agent-core`,
  `@mariozechner/pi-ai`, `@mariozechner/pi-coding-agent`, and
  `@mariozechner/pi-tui`, each at `0.61.1`

This repository still contains `src/agents/pi-*` paths that were present in
OpenClaw `v2026.3.24`. The OpenClaw notice file itself was not in that tag.
The notice is preserved because OpenClaw attributes those portions to Pi.
Maintainer or legal review should confirm that this later notice applies to
the `@mariozechner/pi-*` dependencies and `src/agents/pi-*` sources in this
tree. Do not remove it while that question is open.

## OpenProse

- Project: OpenProse
- Canonical repository: https://github.com/openprose/prose
- Project site named in the bundled skill: https://prose.md
- License: MIT License
- Copyright notice in `extensions/open-prose/skills/prose/LICENSE`:
  Copyright (c) 2025 OpenProse
- Scope: the OpenProse skill pack under `extensions/open-prose/`
- Baseline: the license file blob is identical to OpenClaw tag `v2026.3.24`
  (`9932a6858ef16c6d53fed827283cdc2b2752609b`). At HEAD, 90 paths under
  `extensions/open-prose/` still match that tag. `package.json` and
  `runtime-api.ts` differ, and `agdi.plugin.json` was added. An OpenProse
  commit SHA for the skill pack was not pinned.

## Skill Creator license text

- Path: `skills/skill-creator/license.txt`
- License text: Apache License, Version 2.0
- Baseline: blob-identical to OpenClaw tag `v2026.3.24`
  (`d645695673349e3947e8e5ae42332d0ac3164cd7`)
- Copyright line in the file: the Apache appendix placeholder
  `Copyright [yyyy] [name of copyright owner]`
- Further upstream project: unresolved

The placeholder copyright is retained. Maintainer or legal review should
identify the copyright holder before any notice is rewritten. The Apache
2.0 text in that file is the preserved license copy.

## A2UI Lit renderer

The A2UI Lit renderer and canvas bootstrap were imported from OpenClaw tag
`v2026.3.24`. All 62 imported files match the corresponding tag Git blob
hashes. The renderer's package manifest identifies `@a2ui/lit` version `0.8.1`
and Apache License 2.0. Source headers credit Copyright 2025 Google LLC; the
license text is preserved at `vendor/a2ui/LICENSE`.

The exact A2UI project commit behind OpenClaw's vendored snapshot has not been
established. See [the pinned OpenClaw source tree](https://github.com/openclaw/openclaw/tree/v2026.3.24/vendor/a2ui).

## Notices reviewed and not copied into this tree

These files exist in OpenClaw `v2026.3.24` and are absent from this
repository. No notice text was invented for them.

- `Swabble/LICENSE`
- `apps/android/THIRD_PARTY_LICENSES/MANROPE_OFL.txt`
  (Copyright 2018 The Manrope Project Authors; SIL Open Font License 1.1)
- `apps/macos/Sources/OpenClaw/Resources/DeviceModels/NOTICE.md` and
  `LICENSE.apple-device-identifiers.txt` (mappings derived from
  `kyle-seongwoo-jun/apple-device-identifiers`)

Six A2UI integration files, including `src/canvas-host/a2ui/index.html`, were
byte-identical to that tag at the first AGDI commit. `index.html` has since
changed. The renderer and Apache notice are now included as described above.

OpenClaw's current notice also covers GitHub Octicons paths
`issue-opened-16` and `git-pull-request-16` (Copyright (c) 2026 GitHub Inc.,
MIT, https://github.com/primer/octicons). A search of `ui/` on 2026-09-21
did not find those names. Whether the icons are embedded under other names
is unresolved.

## Existing narrative kept elsewhere

`docs/reference/credits.md` still contains the upstream credits narrative,
including Peter Steinberger and Mario Zechner. That page was not rewritten
in this pass. Maintainer or legal review should decide how it should relate
to this file.
