/**
 * Shared packaging-path policy for the published npm artifact.
 *
 * Two gates enforce this policy and must not drift apart:
 *   - `scripts/release-check.ts` (`collectForbiddenPackPaths`) runs in `pnpm release:check`.
 *   - `scripts/check-package-artifact-smoke.mjs` runs as the deeper artifact smoke gate.
 *
 * Bundled plugin runtime dependencies staged into `dist/extensions/<id>/node_modules`
 * are intentional. Plugins that declare `openclaw.bundle.stageRuntimeDependencies: true`
 * ship their runtime deps so an installed host can load them without a separate
 * install step, and `stage-bundled-plugin-runtime-deps.mjs` stages them during
 * `pnpm build`. `node_modules` anywhere else in the pack is an accident.
 *
 * Note: `.npmignore` cannot express this. `package.json#files` lists `dist/`, and npm
 * does not let `.npmignore` exclude paths that `files` already included, so the
 * `node_modules` ignore line in `.npmignore` does not reach `dist/extensions`.
 */

const BUNDLED_PLUGIN_NODE_MODULES_RE = /^dist\/extensions\/[^/]+\/node_modules\//;

/** Pack prefixes that must never ship, regardless of node_modules policy. */
export const FORBIDDEN_PACK_PREFIXES = ["dist-runtime/", "dist/OpenClaw.app/"];

/**
 * True when a pack path is a bundled plugin's intentionally staged runtime deps.
 */
export function isAllowedBundledPluginNodeModulesPath(packPath) {
  return BUNDLED_PLUGIN_NODE_MODULES_RE.test(packPath);
}

/**
 * True when a pack path is vendored third-party code that the policy forbids.
 * The bundled-plugin allowance is the only exception.
 */
export function isForbiddenVendoredDependencyPath(packPath) {
  return /node_modules\//.test(packPath) && !isAllowedBundledPluginNodeModulesPath(packPath);
}

/**
 * True when a pack path is content this repository authors rather than a vendored
 * third-party package. Artifact-hygiene rules (stray logs, diagnostics, build info)
 * only make sense for first-party paths; vendored packages legitimately ship their
 * own `LICENSE.txt` and `tsconfig.tsbuildinfo` files.
 */
export function isFirstPartyPackPath(packPath) {
  return !isAllowedBundledPluginNodeModulesPath(packPath);
}

/**
 * Return the sorted pack paths that violate the packaging policy.
 */
export function collectForbiddenPackPaths(paths) {
  return [...paths]
    .filter(
      (packPath) =>
        FORBIDDEN_PACK_PREFIXES.some((prefix) => packPath.startsWith(prefix)) ||
        isForbiddenVendoredDependencyPath(packPath),
    )
    .toSorted((left, right) => left.localeCompare(right));
}
