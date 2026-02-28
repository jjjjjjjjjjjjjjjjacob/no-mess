/**
 * HMAC-SHA256 utilities for preview session authentication.
 * Uses Web Crypto API (available in Convex runtime).
 */

const TIMESTAMP_FRESHNESS_SECONDS = 60;

/**
 * Compute an HMAC-SHA256 proof for a preview session.
 * Message format: "{sessionId}.{timestamp}"
 * Returns base64-encoded signature.
 */
export async function computeProof(
  sessionSecret: string,
  sessionId: string,
  timestamp: string,
): Promise<string> {
  const secretBytes = hexToBytes(sessionSecret);
  const keyBuffer = toArrayBuffer(secretBytes);
  const key = await crypto.subtle.importKey(
    "raw",
    keyBuffer,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const message = new TextEncoder().encode(`${sessionId}.${timestamp}`);
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    toArrayBuffer(message),
  );
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

/**
 * Verify an HMAC-SHA256 proof for a preview session.
 * Recomputes the expected proof and compares.
 * Also validates timestamp freshness (rejects stale proofs).
 */
export async function verifyProof(
  sessionSecret: string,
  sessionId: string,
  timestamp: string,
  proof: string,
): Promise<boolean> {
  // Check timestamp freshness
  const ts = parseInt(timestamp, 10);
  if (Number.isNaN(ts)) {
    return false;
  }
  const nowSeconds = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSeconds - ts) > TIMESTAMP_FRESHNESS_SECONDS) {
    return false;
  }

  // Recompute and compare
  const expected = await computeProof(sessionSecret, sessionId, timestamp);
  return expected === proof;
}

function hexToBytes(hex: string): Uint8Array {
  const matches = hex.match(/.{2}/g);
  if (!matches) {
    return new Uint8Array(0);
  }
  return new Uint8Array(matches.map((byte) => parseInt(byte, 16)));
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const buf = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buf).set(bytes);
  return buf;
}
