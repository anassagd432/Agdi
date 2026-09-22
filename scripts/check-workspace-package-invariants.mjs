import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ALLOWED_PLUGIN_PACKAGE_SUFFIXES = [
  "",
  "-provider",
  "-plugin",
  "-speech",
  "-sandbox",
  "-media-understanding",
];

const PACKAGE_LOCATIONS = [".", "ui", "packages", "extensions"];

function normalizeText(value) {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed || undefined;
}

function toPosix(relativePath) {
  return relativePath.split(path.sep).join("/");
}

function readJson(filePath, violations, repoRoot) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    violations.push({
      code: "INVALID_JSON",
      path: toPosix(path.relative(repoRoot, filePath)),
      message: error instanceof Error ? error.message : String(error),
    });
    return undefined;
  }
}

function discoverPackageJsonPaths(repoRoot) {
  const results = [];
  const rootManifest = path.join(repoRoot, "package.json");
  if (fs.existsSync(rootManifest)) {
    results.push(rootManifest);
  }

  for (const location of PACKAGE_LOCATIONS.slice(1)) {
    const absolute = path.join(repoRoot, location);
    if (!fs.existsSync(absolute)) {
      continue;
    }
    if (location === "ui") {
      const manifest = path.join(absolute, "package.json");
      if (fs.existsSync(manifest)) {
        results.push(manifest);
      }
      continue;
    }
    for (const entry of fs.readdirSync(absolute, { withFileTypes: true })) {
      if (!entry.isDirectory()) {
        continue;
      }
      const manifest = path.join(absolute, entry.name, "package.json");
      if (fs.existsSync(manifest)) {
        results.push(manifest);
      }
    }
  }
  return results.toSorted();
}

function pluginPackageNames(pluginId) {
  return ALLOWED_PLUGIN_PACKAGE_SUFFIXES.map((suffix) => `@openclaw/${pluginId}${suffix}`);
}

function addViolation(violations, code, relativePath, message) {
  violations.push({ code, path: toPosix(relativePath), message });
}

function pluginImportsHostSdk(pluginDir) {
  const pending = [pluginDir];
  while (pending.length > 0) {
    const directory = pending.pop();
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (entry.name === "node_modules") {
        continue;
      }
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        pending.push(entryPath);
      } else if (entry.isFile() && /\.[cm]?[jt]sx?$/.test(entry.name)) {
        const source = fs.readFileSync(entryPath, "utf8");
        if (/\bagdi\/plugin-sdk(?:[/'"]|$)/.test(source)) {
          return true;
        }
      }
    }
  }
  return false;
}

function checkExtensionPackage({ repoRoot, manifestPath, pkg, rootPackage, violations }) {
  const relativeManifestPath = path.relative(repoRoot, manifestPath);
  const pluginDir = path.dirname(manifestPath);
  const pluginManifestPath = path.join(pluginDir, "openclaw.plugin.json");
  if (!fs.existsSync(pluginManifestPath)) {
    return;
  }

  const pluginManifest = readJson(pluginManifestPath, violations, repoRoot);
  if (!pluginManifest) {
    return;
  }
  const dirName = path.basename(pluginDir);
  const pluginId = normalizeText(pluginManifest.id);
  const packageName = normalizeText(pkg.name);

  if (!pluginId) {
    addViolation(
      violations,
      "MISSING_PLUGIN_ID",
      path.relative(repoRoot, pluginManifestPath),
      "openclaw.plugin.json must define a non-empty id",
    );
  } else {
    if (pluginId !== dirName) {
      addViolation(
        violations,
        "PLUGIN_DIRECTORY_ID_MISMATCH",
        relativeManifestPath,
        `directory '${dirName}' does not match plugin id '${pluginId}'`,
      );
    }
    if (!packageName || !pluginPackageNames(pluginId).includes(packageName)) {
      addViolation(
        violations,
        "PLUGIN_PACKAGE_NAME_MISMATCH",
        relativeManifestPath,
        `package name '${packageName ?? "<missing>"}' is not anchored to plugin id '${pluginId}'`,
      );
    }
  }

  if (rootPackage && JSON.stringify(pkg) === JSON.stringify(rootPackage)) {
    addViolation(
      violations,
      "ROOT_MANIFEST_COPY",
      relativeManifestPath,
      "plugin package.json is an exact copy of the root package.json",
    );
  }

  const metadata = pkg.openclaw;
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    addViolation(
      violations,
      "MISSING_PLUGIN_PACKAGE_METADATA",
      relativeManifestPath,
      "plugin package.json must define openclaw metadata",
    );
  } else {
    const entries = metadata.extensions;
    if (!Array.isArray(entries) || entries.length === 0) {
      addViolation(
        violations,
        "MISSING_PLUGIN_ENTRYPOINT",
        relativeManifestPath,
        "openclaw.extensions must contain at least one local entrypoint",
      );
    } else {
      for (const entry of entries) {
        const normalized = normalizeText(entry);
        if (!normalized || path.isAbsolute(normalized)) {
          addViolation(
            violations,
            "INVALID_PLUGIN_ENTRYPOINT",
            relativeManifestPath,
            `entrypoint '${String(entry)}' must be a non-empty relative path`,
          );
          continue;
        }
        const resolved = path.resolve(pluginDir, normalized);
        const relativeToPlugin = path.relative(pluginDir, resolved);
        if (relativeToPlugin.startsWith("..") || path.isAbsolute(relativeToPlugin)) {
          addViolation(
            violations,
            "PLUGIN_ENTRYPOINT_OUTSIDE_PACKAGE",
            relativeManifestPath,
            `entrypoint '${normalized}' resolves outside the plugin package`,
          );
        } else if (!fs.existsSync(resolved)) {
          addViolation(
            violations,
            "MISSING_PLUGIN_ENTRYPOINT_FILE",
            relativeManifestPath,
            `entrypoint '${normalized}' does not exist`,
          );
        }
      }
    }

    const npmSpec = normalizeText(metadata.install?.npmSpec);
    if (npmSpec && npmSpec !== packageName) {
      addViolation(
        violations,
        "PLUGIN_INSTALL_SPEC_MISMATCH",
        relativeManifestPath,
        `openclaw.install.npmSpec '${npmSpec}' does not match package name '${packageName}'`,
      );
    }
    const channelId = normalizeText(metadata.channel?.id);
    if (channelId && pluginId && channelId !== pluginId) {
      addViolation(
        violations,
        "PLUGIN_CHANNEL_ID_MISMATCH",
        relativeManifestPath,
        `openclaw.channel.id '${channelId}' does not match plugin id '${pluginId}'`,
      );
    }
  }

  for (const [dependencyName, range] of Object.entries(pkg.dependencies ?? {})) {
    if (typeof range === "string" && range.startsWith("workspace:")) {
      addViolation(
        violations,
        "PLUGIN_RUNTIME_WORKSPACE_DEPENDENCY",
        relativeManifestPath,
        `runtime dependency '${dependencyName}' uses forbidden range '${range}'`,
      );
    }
  }

  if (
    pluginImportsHostSdk(pluginDir) &&
    !normalizeText(pkg.devDependencies?.agdi) &&
    !normalizeText(pkg.peerDependencies?.agdi)
  ) {
    addViolation(
      violations,
      "MISSING_PLUGIN_HOST_DEPENDENCY",
      relativeManifestPath,
      "plugin imports agdi/plugin-sdk but does not declare agdi in devDependencies or peerDependencies",
    );
  }
}

export function analyzeWorkspacePackages(params = {}) {
  const repoRoot = path.resolve(params.repoRoot ?? process.cwd());
  const violations = [];
  const manifestPaths = discoverPackageJsonPaths(repoRoot);
  const packages = [];

  const extensionsRoot = path.join(repoRoot, "extensions");
  if (fs.existsSync(extensionsRoot)) {
    for (const entry of fs.readdirSync(extensionsRoot, { withFileTypes: true })) {
      if (!entry.isDirectory()) {
        continue;
      }
      const pluginRoot = path.join(extensionsRoot, entry.name);
      const pluginManifestPath = path.join(pluginRoot, "openclaw.plugin.json");
      const packageManifestPath = path.join(pluginRoot, "package.json");
      if (fs.existsSync(pluginManifestPath) && !fs.existsSync(packageManifestPath)) {
        addViolation(
          violations,
          "MISSING_PLUGIN_PACKAGE_MANIFEST",
          path.relative(repoRoot, packageManifestPath),
          "plugin metadata exists but package.json is missing",
        );
      }
    }
  }

  for (const manifestPath of manifestPaths) {
    const pkg = readJson(manifestPath, violations, repoRoot);
    if (!pkg) {
      continue;
    }
    packages.push({ manifestPath, pkg });
  }

  const rootPackage = packages.find(
    ({ manifestPath }) => manifestPath === path.join(repoRoot, "package.json"),
  )?.pkg;
  const packagesByName = new Map();
  for (const { manifestPath, pkg } of packages) {
    const relativeManifestPath = path.relative(repoRoot, manifestPath);
    const packageName = normalizeText(pkg.name);
    if (!packageName) {
      addViolation(
        violations,
        "MISSING_PACKAGE_NAME",
        relativeManifestPath,
        "package.json must define a non-empty name",
      );
    } else {
      const paths = packagesByName.get(packageName) ?? [];
      paths.push(toPosix(relativeManifestPath));
      packagesByName.set(packageName, paths);
    }

    if (relativeManifestPath.startsWith(`extensions${path.sep}`)) {
      checkExtensionPackage({ repoRoot, manifestPath, pkg, rootPackage, violations });
    }
  }

  for (const [packageName, paths] of packagesByName) {
    if (paths.length < 2) {
      continue;
    }
    for (const manifestPath of paths) {
      addViolation(
        violations,
        "DUPLICATE_PACKAGE_NAME",
        manifestPath,
        `package name '${packageName}' is also used by ${paths.filter((entry) => entry !== manifestPath).join(", ")}`,
      );
    }
  }

  return {
    repoRoot,
    packageCount: packages.length,
    violationCount: violations.length,
    violations: violations.toSorted(
      (left, right) => left.path.localeCompare(right.path) || left.code.localeCompare(right.code),
    ),
  };
}

function parseCliArgs(argv) {
  const options = { report: false, json: false, repoRoot: process.cwd() };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--report") {
      options.report = true;
    } else if (argument === "--json") {
      options.json = true;
    } else if (argument === "--root") {
      const value = argv[index + 1];
      if (!value) {
        throw new Error("--root requires a directory");
      }
      options.repoRoot = value;
      index += 1;
    } else {
      throw new Error(`unknown argument: ${argument}`);
    }
  }
  return options;
}

function runCli() {
  let options;
  try {
    options = parseCliArgs(process.argv.slice(2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 2;
    return;
  }

  const result = analyzeWorkspacePackages({ repoRoot: options.repoRoot });
  if (options.json) {
    console.log(
      JSON.stringify(
        {
          packageCount: result.packageCount,
          violationCount: result.violationCount,
          violations: result.violations,
        },
        null,
        2,
      ),
    );
  } else if (result.violationCount === 0) {
    console.log(`Workspace package invariants passed for ${result.packageCount} packages.`);
  } else {
    console.error(
      `Workspace package invariants found ${result.violationCount} violation(s) across ${result.packageCount} packages:`,
    );
    for (const violation of result.violations) {
      console.error(`- [${violation.code}] ${violation.path}: ${violation.message}`);
    }
  }

  if (!options.report && result.violationCount > 0) {
    process.exitCode = 1;
  }
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  runCli();
}
