import { readFileSync } from "node:fs";
import { parseSchemaSource } from "@no-mess/client/schema";
import { pushSchema } from "../api.js";
import { loadConfig, validateApiKey } from "../config.js";
import { printDraftPublishWarning } from "../sync-output.js";

export async function pushCommand(args: string[]): Promise<void> {
  const schemaFlag = args.indexOf("--schema");
  const schemaOverride =
    schemaFlag !== -1 ? args[schemaFlag + 1] : undefined;

  const config = loadConfig({ schema: schemaOverride });
  const keyCheck = validateApiKey(config.apiKey);
  if (!keyCheck.valid) {
    console.error(`Error: ${keyCheck.error}`);
    process.exit(1);
  }

  let source: string;
  try {
    source = readFileSync(config.schemaPath, "utf-8");
  } catch {
    console.error(`Error: Could not read schema file at ${config.schemaPath}`);
    process.exit(1);
  }

  console.log(`Parsing ${config.schemaPath}...`);
  const result = parseSchemaSource(source);

  if (result.errors.length > 0) {
    console.error("Parse errors:");
    for (const err of result.errors) {
      console.error(`  Line ${err.line}: ${err.message}`);
    }
    process.exit(1);
  }

  if (result.warnings.length > 0) {
    for (const warn of result.warnings) {
      console.warn(`  Warning (line ${warn.line}): ${warn.message}`);
    }
  }

  if (result.contentTypes.length === 0) {
    console.error("No schemas found in schema file.");
    process.exit(1);
  }

  console.log(
    `Found ${result.contentTypes.length} schema${result.contentTypes.length !== 1 ? "s" : ""}. Pushing to ${config.apiUrl}...`,
  );

  try {
    const syncResult = await pushSchema(
      config.apiUrl,
      config.apiKey,
      result.contentTypes,
    );

    for (const item of syncResult.synced) {
      const icon = item.action === "created" ? "+" : "~";
      console.log(`  ${icon} ${item.slug} (${item.action})`);
    }

    console.log("Push complete.");
    printDraftPublishWarning();
  } catch (err) {
    console.error(
      `Error: ${err instanceof Error ? err.message : "Failed to push schema"}`,
    );
    process.exit(2);
  }
}
