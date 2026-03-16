#!/usr/bin/env node

const USAGE = `
no-mess — CLI for the no-mess headless CMS

Usage:
  no-mess <command> [options]

Commands:
  init                  Scaffold schema.ts and .env template
  push                  Parse and push schema to the dashboard
  pull                  Pull schemas from the dashboard and generate schema.ts
  dev                   Watch schema.ts and sync changes on save
  codegen               Generate app-ready types from schema.ts

Options:
  --schema <path>       Path to schema file (default: schema.ts)
  --out <path>          Output file for codegen (default: no-mess.generated.ts)
  --stdout              (pull only) Print to stdout instead of writing file
  --help, -h            Show this help message
  --version, -v         Show version
`;

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === "--help" || command === "-h") {
    console.log(USAGE.trim());
    return;
  }

  if (command === "--version" || command === "-v") {
    console.log("no-mess 0.1.0");
    return;
  }

  const commandArgs = args.slice(1);

  switch (command) {
    case "init": {
      const { initCommand } = await import("./commands/init.js");
      await initCommand(commandArgs);
      break;
    }
    case "push": {
      const { pushCommand } = await import("./commands/push.js");
      await pushCommand(commandArgs);
      break;
    }
    case "pull": {
      const { pullCommand } = await import("./commands/pull.js");
      await pullCommand(commandArgs);
      break;
    }
    case "dev": {
      const { devCommand } = await import("./commands/dev.js");
      await devCommand(commandArgs);
      break;
    }
    case "codegen": {
      const { codegenCommand } = await import("./commands/codegen.js");
      await codegenCommand(commandArgs);
      break;
    }
    default:
      console.error(`Unknown command: ${command}`);
      console.log(USAGE.trim());
      process.exit(1);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : "Unexpected error");
  process.exit(1);
});
