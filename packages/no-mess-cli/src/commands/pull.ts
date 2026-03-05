import { writeFileSync } from "node:fs";
import { generateSchemaSource } from "@no-mess/client/schema";
import type { ContentTypeDefinition } from "@no-mess/client/schema";
import { pullSchema } from "../api.js";
import { loadConfig, validateApiKey } from "../config.js";

export async function pullCommand(args: string[]): Promise<void> {
  const toStdout = args.includes("--stdout");
  const schemaFlag = args.indexOf("--schema");
  const schemaOverride =
    schemaFlag !== -1 ? args[schemaFlag + 1] : undefined;

  const config = loadConfig({ schema: schemaOverride });
  const keyCheck = validateApiKey(config.apiKey);
  if (!keyCheck.valid) {
    console.error(`Error: ${keyCheck.error}`);
    process.exit(1);
  }

  const log = toStdout ? console.error : console.log;

  log(`Pulling schemas from ${config.apiUrl}...`);

  try {
    const response = await pullSchema(config.apiUrl, config.apiKey);
    const contentTypes: ContentTypeDefinition[] = response.contentTypes.map(
      (ct) => ({
        slug: ct.slug,
        name: ct.name,
        description: ct.description,
        fields: ct.fields.map((f) => ({
          ...f,
          type: f.type as ContentTypeDefinition["fields"][0]["type"],
        })),
      }),
    );

    if (contentTypes.length === 0) {
      log("No published schemas found.");
      return;
    }

    const source = generateSchemaSource({ contentTypes });

    if (toStdout) {
      process.stdout.write(source);
    } else {
      writeFileSync(config.schemaPath, source, "utf-8");
      console.log(`Wrote ${contentTypes.length} content type${contentTypes.length !== 1 ? "s" : ""} to ${config.schemaPath}`);
    }
  } catch (err) {
    console.error(
      `Error: ${err instanceof Error ? err.message : "Failed to pull schema"}`,
    );
    process.exit(2);
  }
}
