#!/usr/bin/env node

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const packagesDir = join(process.cwd(), "packages");

const tags = readdirSync(packagesDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => join(packagesDir, entry.name, "package.json"))
  .map((packageJsonPath) => JSON.parse(readFileSync(packageJsonPath, "utf8")))
  .filter((pkg) => pkg.private !== true)
  .map((pkg) => `${pkg.name}@${pkg.version}`)
  .sort();

for (const tag of tags) {
  console.log(tag);
}
