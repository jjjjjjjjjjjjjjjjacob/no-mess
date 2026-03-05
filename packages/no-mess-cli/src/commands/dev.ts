import { readFileSync } from "node:fs";
import { watch } from "chokidar";
import { parseSchemaSource } from "@no-mess/client/schema";
import { pushSchema } from "../api.js";
import { loadConfig, validateApiKey } from "../config.js";

export async function devCommand(args: string[]): Promise<void> {
  const schemaFlag = args.indexOf("--schema");
  const schemaOverride =
    schemaFlag !== -1 ? args[schemaFlag + 1] : undefined;

  const config = loadConfig({ schema: schemaOverride });
  const keyCheck = validateApiKey(config.apiKey);
  if (!keyCheck.valid) {
    console.error(`Error: ${keyCheck.error}`);
    process.exit(1);
  }

  // Initial push
  console.log(`Watching ${config.schemaPath} for changes...`);
  await pushOnce(config.schemaPath, config.apiUrl, config.apiKey);

  // Watch for changes
  const watcher = watch(config.schemaPath, {
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 300 },
  });

  watcher.on("change", async () => {
    console.log(`\nFile changed: ${config.schemaPath}`);
    await pushOnce(config.schemaPath, config.apiUrl, config.apiKey);
  });

  // Graceful shutdown
  const cleanup = () => {
    console.log("\nStopping watch...");
    watcher.close();
    process.exit(0);
  };

  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);
}

async function pushOnce(
  schemaPath: string,
  apiUrl: string,
  apiKey: string,
): Promise<void> {
  let source: string;
  try {
    source = readFileSync(schemaPath, "utf-8");
  } catch {
    console.error(`Could not read ${schemaPath}`);
    return;
  }

  const result = parseSchemaSource(source);

  if (result.errors.length > 0) {
    console.error("Parse errors:");
    for (const err of result.errors) {
      console.error(`  Line ${err.line}: ${err.message}`);
    }
    return;
  }

  if (result.contentTypes.length === 0) {
    console.warn("No content types found.");
    return;
  }

  try {
    const syncResult = await pushSchema(apiUrl, apiKey, result.contentTypes);

    for (const item of syncResult.synced) {
      const icon = item.action === "created" ? "+" : "~";
      console.log(`  ${icon} ${item.slug} (${item.action})`);
    }

    console.log(
      `Synced ${syncResult.synced.length} content type${syncResult.synced.length !== 1 ? "s" : ""}`,
    );
  } catch (err) {
    console.error(
      `Push failed: ${err instanceof Error ? err.message : "Unknown error"}`,
    );
  }
}
