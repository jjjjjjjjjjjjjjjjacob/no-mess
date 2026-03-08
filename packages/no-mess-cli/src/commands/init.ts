import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const SCHEMA_TEMPLATE = `import { defineSchema, defineContentType, field } from "@no-mess/client/schema";

const example = defineContentType("example", {
  name: "Example",
  description: "An example content type — replace with your own",
  fields: {
    title: field.text({ required: true }),
    body: field.textarea(),
  },
});

export default defineSchema({ contentTypes: [example] });
`;

const ENV_TEMPLATE = `# no-mess CLI configuration
# Get your API key from the no-mess dashboard: Settings > API Keys
NO_MESS_API_KEY=

# Optional: Custom API URL (defaults to https://api.nomess.xyz)
# NO_MESS_API_URL=
`;

export async function initCommand(args: string[]): Promise<void> {
  const schemaFlag = args.indexOf("--schema");
  const schemaPath = resolve(
    schemaFlag !== -1 && args[schemaFlag + 1]
      ? args[schemaFlag + 1]
      : "schema.ts",
  );

  // Create schema.ts
  if (existsSync(schemaPath)) {
    console.log(`Schema file already exists at ${schemaPath} — skipping.`);
  } else {
    mkdirSync(dirname(schemaPath), { recursive: true });
    writeFileSync(schemaPath, SCHEMA_TEMPLATE, "utf-8");
    console.log(`Created ${schemaPath}`);
  }

  // Create .env if it doesn't exist
  const envPath = resolve(".env");
  if (existsSync(envPath)) {
    console.log(
      ".env already exists — skipping. Add NO_MESS_API_KEY manually.",
    );
  } else {
    writeFileSync(envPath, ENV_TEMPLATE, "utf-8");
    console.log("Created .env with NO_MESS_API_KEY placeholder.");
  }

  console.log(`
Next steps:
  1. Add your secret API key to .env or .env.local (NO_MESS_API_KEY=nm_...)
  2. Edit ${schemaPath} to define your content types
  3. Run \`no-mess push\` to sync schemas to the dashboard
  4. Run \`no-mess dev\` for watch mode
`);
}
