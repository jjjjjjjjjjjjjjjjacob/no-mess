import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseSchemaSource } from "@no-mess/client/schema";
import { generateTypesSource } from "../codegen/generate-types.js";

export async function codegenCommand(args: string[]): Promise<void> {
  const schemaFlag = args.indexOf("--schema");
  const outFlag = args.indexOf("--out");
  const schemaPath = resolve(
    process.cwd(),
    schemaFlag !== -1 ? args[schemaFlag + 1] : "schema.ts",
  );
  const outPath = resolve(
    process.cwd(),
    outFlag !== -1 ? args[outFlag + 1] : "no-mess.generated.ts",
  );

  let source: string;
  try {
    source = readFileSync(schemaPath, "utf8");
  } catch {
    console.error(`Error: Could not read schema file at ${schemaPath}`);
    process.exit(1);
  }

  const result = parseSchemaSource(source);
  if (result.errors.length > 0) {
    console.error("Parse errors:");
    for (const error of result.errors) {
      console.error(`  Line ${error.line}: ${error.message}`);
    }
    process.exit(1);
  }

  if (result.contentTypes.length === 0) {
    console.error("No schemas found in schema file.");
    process.exit(1);
  }

  for (const warning of result.warnings) {
    console.warn(`Warning (line ${warning.line}): ${warning.message}`);
  }

  try {
    const generated = generateTypesSource(result.contentTypes);
    writeFileSync(outPath, generated, "utf8");
    console.log(
      `Generated ${result.contentTypes.length} contract${result.contentTypes.length !== 1 ? "s" : ""} at ${outPath}`,
    );
  } catch (error) {
    console.error(
      `Error: ${error instanceof Error ? error.message : "Failed to generate contract types"}`,
    );
    process.exit(2);
  }
}
