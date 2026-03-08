import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

export interface CliConfig {
  apiKey: string;
  apiUrl: string;
  schemaPath: string;
}

const DEFAULT_API_URL = "https://api.nomess.xyz";
const DEFAULT_SCHEMA_PATH = "schema.ts";

/**
 * Loads CLI configuration from environment variables and .env files.
 */
export function loadConfig(overrides?: { schema?: string }): CliConfig {
  // Load environment variables from local env files without overriding shell-provided values.
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
        "NO_MESS_API_KEY is not set. Run `no-mess init` or set it in your .env.local or .env file.",
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
 * Precedence: process.env > .env.local > .env
 */
function loadDotEnv(): void {
  const shellEnvKeys = new Set(Object.keys(process.env));
  const loadedEnvKeys = new Set<string>();

  loadEnvFile(resolve(".env"), {
    shellEnvKeys,
    loadedEnvKeys,
    allowLoadedOverrides: false,
  });
  loadEnvFile(resolve(".env.local"), {
    shellEnvKeys,
    loadedEnvKeys,
    allowLoadedOverrides: true,
  });
}

function loadEnvFile(
  envPath: string,
  options: {
    shellEnvKeys: Set<string>;
    loadedEnvKeys: Set<string>;
    allowLoadedOverrides: boolean;
  },
): void {
  if (!existsSync(envPath)) return;

  try {
    const content = readFileSync(envPath, "utf-8");
    for (const line of content.split("\n")) {
      const parsed = parseEnvLine(line);
      if (!parsed) continue;

      const { key, value } = parsed;
      if (options.shellEnvKeys.has(key)) continue;

      const shouldOverrideLoadedValue =
        options.allowLoadedOverrides && options.loadedEnvKeys.has(key);

      if (key in process.env && !shouldOverrideLoadedValue) continue;

      process.env[key] = value;
      options.loadedEnvKeys.add(key);
    }
  } catch {
    // Ignore .env read errors
  }
}

function parseEnvLine(line: string): {
  key: string;
  value: string;
} | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return null;

  const eqIdx = trimmed.indexOf("=");
  if (eqIdx === -1) return null;

  const key = trimmed.slice(0, eqIdx).trim();
  let value = trimmed.slice(eqIdx + 1).trim();

  // Strip matching quotes.
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }

  return { key, value };
}
