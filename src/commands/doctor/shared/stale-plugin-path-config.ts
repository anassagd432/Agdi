import fs from "node:fs";
import path from "node:path";
import { DEFAULT_PLUGIN_ENTRY_CANDIDATES, PLUGIN_MANIFEST_FILENAME } from "../../../plugins/manifest.js";
import { loadPluginManifest } from "../../../plugins/manifest.js";
import { detectBundleManifestFormat } from "../../../plugins/bundle-manifest.js";
import { removePluginFromConfig } from "../../../plugins/uninstall.js";
import { resolveUserPath } from "../../../utils.js";
import type { OpenClawConfig } from "../../../config/config.js";
import type { PluginInstallRecord } from "../../../config/types.plugins.js";
import { asObjectRecord } from "./object.js";

type StalePluginPathHit = {
  pluginId?: string;
  pathLabel: string;
  configuredPath: string;
  reason: "missing-path" | "missing-manifest";
};

function looksLikeDirectPluginRoot(rootDir: string): boolean {
  if (!fs.existsSync(rootDir)) {
    return false;
  }
  const stat = fs.statSync(rootDir);
  if (!stat.isDirectory()) {
    return false;
  }
  if (detectBundleManifestFormat(rootDir)) {
    return true;
  }
  if (fs.existsSync(path.join(rootDir, PLUGIN_MANIFEST_FILENAME))) {
    return true;
  }
  if (fs.existsSync(path.join(rootDir, "package.json"))) {
    return true;
  }
  return DEFAULT_PLUGIN_ENTRY_CANDIDATES.some((candidate) =>
    fs.existsSync(path.join(rootDir, candidate)),
  );
}

function hasMissingManifest(rootDir: string): boolean {
  const manifest = loadPluginManifest(rootDir, false);
  return !manifest.ok && manifest.error.startsWith("plugin manifest not found:");
}

function scanInstallRecord(
  pluginId: string,
  install: PluginInstallRecord,
  env: NodeJS.ProcessEnv,
): StalePluginPathHit | null {
  if (install.source !== "path") {
    return null;
  }

  const rawPaths = [install.sourcePath, install.installPath]
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter(Boolean);
  if (rawPaths.length === 0) {
    return null;
  }

  for (const rawPath of rawPaths) {
    const resolved = resolveUserPath(rawPath, env);
    if (!fs.existsSync(resolved)) {
      continue;
    }
    if (looksLikeDirectPluginRoot(resolved) && hasMissingManifest(resolved)) {
      return {
        pluginId,
        pathLabel: `plugins.installs.${pluginId}`,
        configuredPath: rawPath,
        reason: "missing-manifest",
      };
    }
    return null;
  }

  return {
    pluginId,
    pathLabel: `plugins.installs.${pluginId}`,
    configuredPath: rawPaths[0] ?? "(unknown)",
    reason: "missing-path",
  };
}

export function scanStalePluginPathConfig(
  cfg: OpenClawConfig,
  env: NodeJS.ProcessEnv = process.env,
): StalePluginPathHit[] {
  const plugins = asObjectRecord(cfg.plugins);
  if (!plugins) {
    return [];
  }

  const hits: StalePluginPathHit[] = [];
  const load = asObjectRecord(plugins.load);
  const loadPaths = Array.isArray(load?.paths) ? load.paths : [];
  for (const rawPath of loadPaths) {
    if (typeof rawPath !== "string" || !rawPath.trim()) {
      continue;
    }
    const resolved = resolveUserPath(rawPath, env);
    if (!fs.existsSync(resolved)) {
      hits.push({
        pathLabel: "plugins.load.paths",
        configuredPath: rawPath,
        reason: "missing-path",
      });
      continue;
    }
    if (looksLikeDirectPluginRoot(resolved) && hasMissingManifest(resolved)) {
      hits.push({
        pathLabel: "plugins.load.paths",
        configuredPath: rawPath,
        reason: "missing-manifest",
      });
    }
  }

  const installs = asObjectRecord(plugins.installs);
  if (!installs) {
    return hits;
  }
  for (const [pluginId, rawInstall] of Object.entries(installs)) {
    const install = rawInstall as PluginInstallRecord;
    const hit = scanInstallRecord(pluginId, install, env);
    if (hit) {
      hits.push(hit);
    }
  }

  return hits;
}

export function maybeRepairStalePluginPathConfig(
  cfg: OpenClawConfig,
  env: NodeJS.ProcessEnv = process.env,
): {
  config: OpenClawConfig;
  changes: string[];
} {
  const hits = scanStalePluginPathConfig(cfg, env);
  if (hits.length === 0) {
    return { config: cfg, changes: [] };
  }

  let next = structuredClone(cfg);
  const changes: string[] = [];

  const staleLoadPaths = hits
    .filter((hit) => hit.pathLabel === "plugins.load.paths")
    .map((hit) => hit.configuredPath);
  if (staleLoadPaths.length > 0) {
    const staleSet = new Set(staleLoadPaths);
    const currentLoadPaths = next.plugins?.load?.paths;
    if (Array.isArray(currentLoadPaths)) {
      const remaining = currentLoadPaths.filter(
        (entry) => typeof entry !== "string" || !staleSet.has(entry),
      );
      if (next.plugins?.load) {
        if (remaining.length > 0) {
          next.plugins.load.paths = remaining;
        } else {
          delete next.plugins.load;
        }
      }
      changes.push(
        `- plugins.load.paths: removed ${staleLoadPaths.length} stale plugin path${staleLoadPaths.length === 1 ? "" : "s"} (${staleLoadPaths.join(", ")})`,
      );
    }
  }

  const staleInstallIds = Array.from(
    new Set(hits.flatMap((hit) => (hit.pluginId ? [hit.pluginId] : []))),
  );
  for (const pluginId of staleInstallIds) {
    const result = removePluginFromConfig(next, pluginId);
    next = result.config;
    const removed: string[] = [];
    if (result.actions.install) {
      removed.push("install record");
    }
    if (result.actions.loadPath) {
      removed.push("load path");
    }
    if (result.actions.entry) {
      removed.push("plugin entry");
    }
    if (result.actions.allowlist) {
      removed.push("allowlist entry");
    }
    if (result.actions.memorySlot) {
      removed.push("memory slot");
    }
    if (removed.length > 0) {
      changes.push(
        `- plugins.installs.${pluginId}: removed stale plugin references (${removed.join(", ")})`,
      );
    }
  }

  return { config: next, changes };
}
