# Claude Code Master Prompt: Agdi Rebrand

Copy this prompt into Claude Code when you want it to continue or execute the Agdi rebrand.

```text
You are working in the Agdi repository. Your task is to safely complete the OpenClaw -> Agdi rebrand without breaking compatibility, generated artifacts, package boundaries, release surfaces, or user migrations.

Start by reading these repo-root files:

1. CLAUDE.md
2. BRANDING_REPORT.md
3. AGENTS.md if present, plus any nested AGENTS.md that applies to touched files
4. CODEOWNERS before touching sensitive paths

Core objective:

Make the product consistently present as Agdi in user-facing docs, UI, CLI help, examples, onboarding, and public-facing copy. Use `Agdi` for product/app/docs display names and `agdi` for CLI commands, package/binary names, paths, config keys, browser profile names, and code identifiers when those surfaces are confirmed to be rebranded.

Non-negotiable guardrails:

- Do not blindly mass-replace `OpenClaw` or `openclaw`.
- Classify every legacy reference before changing it.
- Preserve compatibility where existing users, package names, config paths, env vars, service IDs, plugin SDK imports, or release infrastructure may depend on old names.
- Do not change version numbers, publish packages, cut releases, touch appcast, or run release/publish commands without explicit operator approval.
- Do not patch dependencies, update Carbon, or change package manager behavior without explicit approval.
- Do not edit generated files, snapshots, baselines, inventories, ignore files, expected-failure files, or `docs/zh-CN/**` unless explicitly instructed or using the repo-approved generator pipeline.
- Do not edit paths restricted by security-focused CODEOWNERS rules unless a listed owner explicitly asked for the change or is already reviewing with you.
- Do not create/drop/apply git stashes, switch branches, reset work, or create/remove worktrees.
- Do not commit unless the user explicitly asks. If committing is requested, use the repo's scoped commit workflow.

Required first pass:

1. Check repository status:
   - `git status --short`
2. Build the legacy-name inventory:
   - `rg -n "OpenClaw|openclaw|OPENCLAW|Moltbot|Molty|Clawdbot|lobster|claw" .`
3. Build the Agdi-name inventory:
   - `rg -n "Agdi|agdi|AGDI" .`
4. Check config/path references:
   - `rg -n "~/.openclaw|openclaw\\.json|~/.agdi|agdi\\.json" .`
5. Check docs/domain references:
   - `rg -n "docs\\.openclaw\\.ai|openclaw\\.ai|agdiai|docs\\.agdi|agdi\\.ai" docs README.md package.json .github`
6. Check SDK/package references:
   - `rg -n "openclaw/plugin-sdk|@openclaw|@agdi|agdi/plugin-sdk" src extensions`

Before editing:

Produce a short plan that groups findings into these categories:

- User-facing copy/docs/UI: usually safe to rebrand.
- CLI examples/help: safe if command/binary is confirmed.
- Config paths and migrations: high risk, needs compatibility plan.
- Environment variables: high risk, preserve aliases unless approved.
- Package names/npm scopes/plugin SDK: high risk, do not rename casually.
- OS app bundle IDs/services/appcast/installers: release risk, do not change without approval.
- Upstream history/repository links: may intentionally remain OpenClaw.
- Generated/i18n/baseline files: use generator pipeline or leave untouched.

Implementation strategy:

Work in small, reviewable passes.

Pass 1: Low-risk public copy
- Rebrand clear user-facing docs/UI/help text from OpenClaw to Agdi.
- Update examples to `agdi` only where the binary/script is verified to exist or where docs already establish that command.
- Keep old compatibility notes when users need migration context.

Pass 2: CLI/config compatibility
- If adding `agdi` aliases for old `openclaw` behavior, preserve old names unless the user explicitly approves removal.
- Add tests for aliases, config discovery, migration behavior, and doctor output when touched.
- Do not remove `OPENCLAW_*` env vars unless `AGDI_*` replacements and compatibility behavior are tested and documented.

Pass 3: Plugins/SDK/packages
- Do not rename public package scopes or SDK import paths without an explicit migration design.
- If docs use `@agdi/*` examples, confirm runtime/package publishing supports it.
- Keep `extensions/*` as the internal path unless the repo has an approved rename plan.

Pass 4: Apps/release/install
- Treat bundle IDs, appcast, installer domains, npm package names, and release names as release surfaces.
- Inventory and report recommendations first; do not change them without explicit approval.

Docs rules:

- Mintlify internal docs links must be root-relative and omit `.md`/`.mdx`.
- README links should use absolute docs URLs.
- Do not edit `docs/zh-CN/**` directly.
- Keep docs generic: no personal names, hostnames, real paths, real numbers, videos, or live secrets.
- Alphabetize services/providers in docs, UI copy, and picker lists unless describing runtime order.

Testing:

- For scoped docs-only edits, run the most relevant docs/link/check command if available; otherwise explain why no meaningful test exists.
- For CLI/config/code edits, run scoped tests with `pnpm test -- <path-or-filter>`.
- If public SDK, build output, packaging, lazy loading, module boundaries, or published surfaces are touched, `pnpm build` must pass.
- Before broad landing on main, prefer `pnpm check` and `pnpm test` when feasible.
- If dependencies are missing, run the repo package-manager install command, retry the exact command once, then report the first actionable error if it still fails.

Output requirements:

- Keep final reports concise and action-oriented.
- List changed files.
- List validation commands run and their results.
- Call out any legacy OpenClaw references intentionally left in place and why.
- Call out any high-risk surfaces that still need operator approval.
- Use repo-root relative file references only.

Do not stop at analysis if the requested scope is safe and well understood. Implement the approved low-risk changes, validate them, then report remaining high-risk items separately.
```
