import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

export interface CliConfig {
  apiKey: string;
  apiUrl: string;
  schemaPath: string;
}

const DEFAULT_API_URL = "https://api.no-mess.xyz";
const DEFAULT_SCHEMA_PATH = "schema.ts";

/**
 * Loads CLI configuration from environment variables and .env file.
 */
export function loadConfig(overrides?: {
  schema?: string;
}): CliConfig {
  // Try loading .env file
  loadDotEnv();

  const apiKey = process.env.NO_MESS_API_KEY ?? "";
  const apiUrl = process.env.NO_MESS_API_URL ?? DEFAULT_API_URL;
  const schemaPath = resolve(overrides?.schema ?? DEFAULT_SCHEMA_PATH);

  return { apiKey, apiUrl, schemaPath };
}

/**
 * Validates that the API key is a secret key (nm_ prefix, not nm_pub_).
 */
export function validateApiKey(apiKey: string): {
  valid: boolean;
  error?: string;
} {
  if (!apiKey) {
    return {
      valid: false,
      error:
        "NO_MESS_API_KEY is not set. Run `no-mess init` or set it in your .env file.",
    };
  }

  if (apiKey.startsWith("nm_pub_")) {
    return {
      valid: false,
      error:
        "NO_MESS_API_KEY is a publishable key. The CLI requires a secret key (nm_ prefix).",
    };
  }

  if (!apiKey.startsWith("nm_")) {
    return {
      valid: false,
      error:
        "NO_MESS_API_KEY has an invalid format. Expected a key starting with nm_.",
    };
  }

  return { valid: true };
}

/**
 * Simple .env file loader (no dependencies).
 */
function loadDotEnv(): void {
  const envPath = resolve(".env");
  if (!existsSync(envPath)) return;

  try {
    const content = readFileSync(envPath, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      let value = trimmed.slice(eqIdx + 1).trim();
      // Strip quotes
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  } catch {
    // Ignore .env read errors
  }
}
