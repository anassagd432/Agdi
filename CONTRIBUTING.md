# Contributing to Agdi

Thanks for helping improve Agdi. Keep contributions focused, tested, and easy to review.

## Quick Links

- **GitHub:** https://github.com/anassagd432/Agdi
- **Vision:** [`VISION.md`](VISION.md)
- **Docs:** https://docs.agdi.ai

## How to Contribute

1. **Bugs and small fixes**: Open a focused PR.
2. **New features or architecture**: Open an issue or discussion first so the design can be reviewed.
3. **Refactor-only PRs**: Do not open broad cleanup PRs unless a maintainer asked for them as part of a concrete fix.
4. **Test/CI-only PRs**: Only submit them when they validate a new fix or cover new behavior.
5. **Security issues**: Follow [`SECURITY.md`](SECURITY.md). Do not disclose vulnerabilities publicly before triage.

## Before You PR

- Test locally with your Agdi instance.
- Run the relevant scoped tests first.
- For broad changes, run `pnpm build`, `pnpm check`, and `pnpm test` when feasible.
- For plugin changes, run the fast local lane first:
  - `pnpm test:extension <extension-name>`
  - `pnpm test:extension --list`
  - `pnpm test:contracts` when shared plugin or channel surfaces changed
- Keep PRs focused on one concern.
- Explain what changed and why.
- Include screenshots for UI or visual changes.
- Use American English in code, comments, docs, and UI strings.
- Do not edit files covered by security-focused `CODEOWNERS` rules unless a listed owner explicitly asked for the change or is already reviewing it with you.

## Documentation Translations

Translations live under `docs/{locale}/`, such as `docs/zh-CN/`. The i18n pipeline uses the tooling under `scripts/docs-i18n/`.

For Chinese (`zh-CN`):

1. Update English docs first.
2. Update `docs/.i18n/glossary.zh-CN.json` for any new fixed terms.
3. Run `pnpm docs:check-i18n-glossary`.
4. Run the translator pipeline only when requested or when the change requires it.

Do not edit generated translated docs directly unless the task explicitly asks for targeted translation fixes.

## Review Expectations

- Address every relevant review comment.
- Resolve review conversations only after the fix or explanation fully addresses the concern.
- If you use an AI coding agent, state that in the PR and include the level of testing performed.
- If you have access to Codex, run `codex review --base origin/main` locally before asking for final review.

## Control UI Decorators

The Control UI uses Lit with legacy decorators. When adding reactive fields, keep the existing style:

```ts
@state() foo = "bar";
@property({ type: Number }) count = 0;
```

The root `tsconfig.json` is configured for legacy decorators with `experimentalDecorators: true` and `useDefineForClassFields: false`. Do not change this unless you are also updating the UI build tooling.

## Report a Vulnerability

Report vulnerabilities directly and privately. See [`SECURITY.md`](SECURITY.md) for required report contents and scope.

Reports should include:

1. Title
2. Severity assessment
3. Impact
4. Affected component
5. Technical reproduction
6. Demonstrated impact
7. Environment
8. Remediation advice

Reports without reproduction steps, demonstrated impact, and remediation advice may be deprioritized.
