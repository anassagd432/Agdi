# Implementation Plan: Agdi Gateway Smoke Cleanup

## Context
Fix the first real `agdi gateway` smoke issue: stale OpenClaw-facing gateway warnings and Bonjour display names, without changing compatibility service IDs.

## Changes

### Gateway Startup Warning
- **File**: `src/gateway/server-startup-log.ts:41`
- **Change**: Replace the user-facing remediation command with `agdi security audit`.
- **File**: `src/gateway/server-startup-log.test.ts:28`
- **Change**: Update the dangerous-config warning expectation to assert `agdi security audit`.
- **Reuses**: `collectEnabledInsecureOrDangerousFlags()` in `src/security/dangerous-config-flags.ts`.

### Bonjour Display Identity
- **File**: `src/gateway/server-discovery.ts:14`
- **Change**: Make `formatBonjourInstanceName()` return `Agdi` for empty names and append `(Agdi)` to plain machine names; keep already branded `Agdi` or `OpenClaw` names unchanged.
- **File**: `src/gateway/server-discovery.test.ts:7`
- **Change**: Import `formatBonjourInstanceName()` and add coverage for empty, plain, Agdi-branded, and legacy OpenClaw-branded names.
- **Reuses**: Existing caller `startGatewayDiscoveryServices()` in `src/gateway/server-discovery-runtime.ts:44`.

### Local Bonjour Defaults
- **File**: `src/infra/bonjour.ts:41`
- **Change**: Change fallback display/service names from `OpenClaw`/`openclaw` to `Agdi`/`agdi`; keep `OPENCLAW_MDNS_HOSTNAME` fallback and `type: "openclaw-gw"` unchanged for discovery compatibility.
- **File**: `src/infra/bonjour.test.ts:414`
- **Change**: Update default hostname/display expectations to `agdi (Agdi)`, `agdi`, and `agdi.local`; keep the `openclaw-gw` service-type assertion at `src/infra/bonjour.test.ts:148`.

## Implementation Sequence
1. Update startup warning text and matching test.
2. Update `formatBonjourInstanceName()` and add targeted unit tests.
3. Update Bonjour fallback name/host defaults and matching unit expectations.
4. Leave CLI binary aliases, env aliases, package names, and `_openclaw-gw._tcp` untouched.

## Edge Cases & Risks
- Legacy LAN discovery may depend on `_openclaw-gw._tcp`: leave service type unchanged.
- Users may set custom OpenClaw-branded names: preserve explicit existing branded names instead of rewriting them.
- The pricing fetch and skills-root truncation warnings are separate nonfatal issues; do not bundle them into this patch.

## Verification
`pnpm test -- src/gateway/server-startup-log.test.ts src/gateway/server-discovery.test.ts src/infra/bonjour.test.ts`
