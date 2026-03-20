import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseSchemaSource } from "@no-mess/client/schema";
import { generateTypesSource } from "../codegen/generate-types.js";

export async function codegenCommand(args: string[]): Promise<void> {
  const schemaFlag = args.indexOf("--schema");
  const outFlag = args.indexOf("--out");
  const schemaArg =
    schemaFlag !== -1
      ? args[schemaFlag + 1] && !args[schemaFlag + 1].startsWith("-")
        ? args[schemaFlag + 1]
        : null
      : "schema.ts";
  if (schemaArg === null) {
    console.error("Error: --schema requires a value.");
    process.exit(1);
  }

  const outArg =
    outFlag !== -1
      ? args[outFlag + 1] && !args[outFlag + 1].startsWith("-")
        ? args[outFlag + 1]
        : null
      : "no-mess.generated.ts";
  if (outArg === null) {
    console.error("Error: --out requires a value.");
    process.exit(1);
  }

  const schemaPath = resolve(process.cwd(), schemaArg);
  const outPath = resolve(process.cwd(), outArg);

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
