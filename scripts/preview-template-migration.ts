#!/usr/bin/env bun

import { readFile } from "node:fs/promises";
import { getTemplateMigration } from "../lib/template-migrations";

const [migrationName, inputPath] = process.argv.slice(2);

if (!migrationName || !inputPath) {
  console.error(
    "Usage: bun scripts/preview-template-migration.ts <migration-name> <input-json-path>",
  );
  process.exit(1);
}

const migration = getTemplateMigration(migrationName);
if (!migration) {
  console.error(`Unknown migration: ${migrationName}`);
  process.exit(1);
}

const raw = await readFile(inputPath, "utf8");
const parsed = JSON.parse(raw) as Record<string, unknown>;
const transformed = migration.transformEntry(parsed);

console.log(JSON.stringify(transformed, null, 2));
