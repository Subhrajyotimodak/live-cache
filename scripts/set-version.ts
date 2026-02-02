/**
 * Sets the same version across all packages and updates @live-cache/core dependency.
 * Usage: bun run version:set <version>
 * Example: bun run version:set 0.0.3
 */

import { readFileSync, writeFileSync } from "fs";
import { join, relative } from "path";

const version = process.argv[2];
if (!version || !/^\d+\.\d+\.\d+(-[a-zA-Z0-9.-]+)?$/.test(version)) {
  console.error("Usage: bun run version:set <version>");
  console.error("Example: bun run version:set 0.0.3");
  process.exit(1);
}

const root = process.cwd();

const packagePaths = [
  join(root, "package.json"),
  join(root, "library", "core", "package.json"),
  join(root, "library", "react", "package.json"),
  join(root, "library", "invalidator", "package.json"),
  join(root, "library", "storage-manager", "package.json"),
];

for (const pkgPath of packagePaths) {
  const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
  pkg.version = version;
  if (pkg.dependencies?.["@live-cache/core"]) {
    pkg.dependencies["@live-cache/core"] = version;
  }
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
  console.log(`${relative(root, pkgPath)} -> ${version}`);
}

console.log(`Version set to ${version} in all packages.`);
