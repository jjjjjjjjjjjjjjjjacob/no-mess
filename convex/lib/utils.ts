/**
 * Generates a random API key with the nm_ prefix.
 * Uses crypto.getRandomValues for secure random generation.
 */
export function generateApiKey(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `nm_${hex}`;
}

/**
 * Generates a random publishable API key with the nm_pub_ prefix.
 * Safe for client-side use. Read-only access to published content.
 */
export function generatePublishableKey(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `nm_pub_${hex}`;
}

/**
 * Generates a random preview secret.
 */
export function generatePreviewSecret(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Converts a string to a URL-safe slug.
 * e.g. "Hello World!" → "hello-world"
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Generates a random session ID for preview sessions.
 * 32 bytes = 64 hex chars. Opaque identifier, safe for URLs.
 */
export function generateSessionId(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Generates a random session secret for preview HMAC authentication.
 * 32 bytes = 64 hex chars. Never exposed in URLs.
 */
export function generateSessionSecret(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Returns the current timestamp in milliseconds.
 */
export function now(): number {
  return Date.now();
}
