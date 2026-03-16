import { createNoMessClient } from "../index.js";
import { DEFAULT_API_URL, NoMessError } from "../types.js";

function requireEnv(name: string, usage: string): string {
  const value = process.env[name];
  if (typeof value === "string" && value.trim().length > 0) {
    return value;
  }

  throw new NoMessError(
    `Missing required no-mess configuration: ${name}. ${usage}`,
    {
      kind: "config",
      code: "missing_configuration",
      retryable: false,
      operation: "createNoMessClient",
      details: {
        envVar: name,
      },
    },
  );
}

export function createServerNoMessClient() {
  const apiKey = requireEnv(
    "NO_MESS_API_KEY",
    "Set NO_MESS_API_KEY to your secret key (nm_...) in your server environment.",
  );
  const apiUrl =
    process.env.NO_MESS_API_URL?.trim() ||
    process.env.NEXT_PUBLIC_NO_MESS_API_URL?.trim() ||
    DEFAULT_API_URL;

  return createNoMessClient({
    apiKey,
    apiUrl,
  });
}

export function createBrowserNoMessClient() {
  const apiKey = requireEnv(
    "NEXT_PUBLIC_NO_MESS_PUBLISHABLE_KEY",
    "Set NEXT_PUBLIC_NO_MESS_PUBLISHABLE_KEY to your publishable key (nm_pub_...) in your browser environment.",
  );
  const apiUrl =
    process.env.NEXT_PUBLIC_NO_MESS_API_URL?.trim() || DEFAULT_API_URL;

  return createNoMessClient({
    apiKey,
    apiUrl,
  });
}
