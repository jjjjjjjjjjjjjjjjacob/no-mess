import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { loadConfig, validateApiKey } from "../config";

const ENV_KEYS = ["NO_MESS_API_KEY", "NO_MESS_API_URL"] as const;

describe("CLI config", () => {
  const originalCwd = process.cwd();
  const originalEnvValues = new Map<string, string | undefined>();
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "no-mess-cli-config-"));
    process.chdir(tempDir);

    for (const key of ENV_KEYS) {
      originalEnvValues.set(key, process.env[key]);
      delete process.env[key];
    }
  });

  afterEach(() => {
    process.chdir(originalCwd);
    rmSync(tempDir, { recursive: true, force: true });

    for (const key of ENV_KEYS) {
      const originalValue = originalEnvValues.get(key);
      if (originalValue === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = originalValue;
      }
    }

    originalEnvValues.clear();
  });

  it("loads NO_MESS_API_KEY and NO_MESS_API_URL from .env", () => {
    writeFileSync(
      resolve(tempDir, ".env"),
      [
        "NO_MESS_API_KEY=nm_from_env",
        "NO_MESS_API_URL=https://env.example.com",
      ].join("\n"),
      "utf-8",
    );

    const config = loadConfig();

    expect(config.apiKey).toBe("nm_from_env");
    expect(config.apiUrl).toBe("https://env.example.com");
    expect(config.schemaPath).toBe(resolve("schema.ts"));
  });

  it("loads env values from .env.local when .env is absent", () => {
    writeFileSync(
      resolve(tempDir, ".env.local"),
      [
        'NO_MESS_API_KEY="nm_from_env_local"',
        "NO_MESS_API_URL=https://local.example.com",
      ].join("\n"),
      "utf-8",
    );

    const config = loadConfig();

    expect(config.apiKey).toBe("nm_from_env_local");
    expect(config.apiUrl).toBe("https://local.example.com");
  });

  it("prefers .env.local over .env", () => {
    writeFileSync(
      resolve(tempDir, ".env"),
      [
        "NO_MESS_API_KEY=nm_from_env",
        "NO_MESS_API_URL=https://env.example.com",
      ].join("\n"),
      "utf-8",
    );
    writeFileSync(
      resolve(tempDir, ".env.local"),
      [
        "NO_MESS_API_KEY=nm_from_env_local",
        "NO_MESS_API_URL=https://local.example.com",
      ].join("\n"),
      "utf-8",
    );

    const config = loadConfig();

    expect(config.apiKey).toBe("nm_from_env_local");
    expect(config.apiUrl).toBe("https://local.example.com");
  });

  it("preserves shell-provided env values over file values", () => {
    process.env.NO_MESS_API_KEY = "nm_from_shell";
    process.env.NO_MESS_API_URL = "https://shell.example.com";

    writeFileSync(
      resolve(tempDir, ".env"),
      [
        "NO_MESS_API_KEY=nm_from_env",
        "NO_MESS_API_URL=https://env.example.com",
      ].join("\n"),
      "utf-8",
    );
    writeFileSync(
      resolve(tempDir, ".env.local"),
      [
        "NO_MESS_API_KEY=nm_from_env_local",
        "NO_MESS_API_URL=https://local.example.com",
      ].join("\n"),
      "utf-8",
    );

    const config = loadConfig({ schema: "lib/cms/schema.ts" });

    expect(config.apiKey).toBe("nm_from_shell");
    expect(config.apiUrl).toBe("https://shell.example.com");
    expect(config.schemaPath).toBe(resolve("lib/cms/schema.ts"));
  });

  it("resolves schema paths from the current working directory", () => {
    writeFileSync(
      resolve(tempDir, ".env.local"),
      "NO_MESS_API_KEY=nm_test",
      "utf-8",
    );

    const config = loadConfig({ schema: "lib/cms/schema.ts" });

    expect(config.schemaPath).toBe(resolve("lib/cms/schema.ts"));
  });
});

describe("validateApiKey", () => {
  it("rejects publishable keys", () => {
    expect(validateApiKey("nm_pub_test")).toEqual({
      valid: false,
      error:
        "NO_MESS_API_KEY is a publishable key. The CLI requires a secret key (nm_ prefix).",
    });
  });
});
